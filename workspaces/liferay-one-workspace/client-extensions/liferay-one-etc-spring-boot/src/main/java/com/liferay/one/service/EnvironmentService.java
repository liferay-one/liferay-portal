/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.EnvironmentActivationAlreadyRequestedException;
import com.liferay.one.model.Environment;
import com.liferay.one.util.JWTSignatureValidator;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.Collection;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Amos Fong
 */
@Component
public class EnvironmentService extends OneBaseService {

	public Environment addActivationEnvironment(
			long accountEntryId, long contractId, JSONObject fieldsJSONObject,
			String offering, String projectExternalReferenceCode)
		throws Exception {

		return _keyedLock.withLock(
			StringBundler.concat(
				projectExternalReferenceCode, StringPool.POUND, offering),
			() -> {
				Environment environment = fetchActivationEnvironment(
					accountEntryId, offering, projectExternalReferenceCode);

				if (environment != null) {
					throw new EnvironmentActivationAlreadyRequestedException(
						environment.getExternalReferenceCode());
				}

				return _addActivationEnvironment(
					accountEntryId, contractId, fieldsJSONObject, offering,
					projectExternalReferenceCode);
			});
	}

	public Environment addCloudNativeEnvironment(
			long accountEntryId, String activationCode,
			String contractExternalReferenceCode,
			String projectExternalReferenceCode, String type)
		throws Exception {

		return _addCodeActivatedEnvironment(
			accountEntryId, activationCode, contractExternalReferenceCode,
			EnvironmentConstants.OFFERING_CLOUD_NATIVE,
			projectExternalReferenceCode, type);
	}

	public Environment addDXPEnvironment(
			long accountEntryId, String activationCode,
			String projectExternalReferenceCode, String type)
		throws Exception {

		return _addCodeActivatedEnvironment(
			accountEntryId, activationCode, null,
			EnvironmentConstants.OFFERING_DXP, projectExternalReferenceCode,
			type);
	}

	public Environment fetchActivationEnvironment(
			long accountEntryId, String offering,
			String projectExternalReferenceCode)
		throws Exception {

		return fetchEnvironment(
			StringBundler.concat(
				"(r_accountEntryToEnvironment_accountEntryId eq '",
				accountEntryId, "') and (offering eq '", offering,
				"') and (r_projectToEnvironment_c_projectERC eq '",
				escapeODataString(projectExternalReferenceCode), "')"));
	}

	public Environment fetchCloudNativeEnvironmentByActivationCode(
			String activationCode)
		throws Exception {

		return fetchEnvironment(
			StringBundler.concat(
				"(activationCode eq '", escapeODataString(activationCode),
				"') and (offering eq '",
				EnvironmentConstants.OFFERING_CLOUD_NATIVE, "')"));
	}

	public Environment fetchDXPEnvironmentByActivationCode(
			String activationCode)
		throws Exception {

		return fetchEnvironment(
			StringBundler.concat(
				"(activationCode eq '", escapeODataString(activationCode),
				"') and (offering eq '", EnvironmentConstants.OFFERING_DXP,
				"')"));
	}

	public Environment fetchEnvironment(String filterString) throws Exception {
		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/environments"
			).queryParam(
				"filter", filterString
			).queryParam(
				"pageSize", 1
			).build(
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		JSONObject jsonObject = new JSONObject(response);

		JSONArray jsonArray = jsonObject.getJSONArray("items");

		if (jsonArray.isEmpty()) {
			return null;
		}

		return new Environment(jsonArray.getJSONObject(0));
	}

	public Environment fetchEnvironmentByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		return _fetchEnvironmentByExternalReferenceCode(
			externalReferenceCode, null);
	}

	public Environment fetchEnvironmentByExternalReferenceCode(
			String externalReferenceCode, Jwt jwt)
		throws Exception {

		return _fetchEnvironmentByExternalReferenceCode(
			externalReferenceCode, jwt);
	}

	public List<Environment> getCloudNativeEnvironments(
			String projectExternalReferenceCode)
		throws Exception {

		return getEnvironments(
			StringBundler.concat(
				"(offering eq '", EnvironmentConstants.OFFERING_CLOUD_NATIVE,
				"') and (r_projectToEnvironment_c_projectERC eq '",
				escapeODataString(projectExternalReferenceCode), "')"));
	}

	public List<Environment> getDXPEnvironments(
			String projectExternalReferenceCode)
		throws Exception {

		return getEnvironments(
			StringBundler.concat(
				"(offering eq '", EnvironmentConstants.OFFERING_DXP,
				"') and (r_projectToEnvironment_c_projectERC eq '",
				escapeODataString(projectExternalReferenceCode), "')"));
	}

	public List<Environment> getDXPEnvironmentsByInstallationId(
			String activationMode, String activationStatus,
			String installationId)
		throws Exception {

		return getEnvironments(
			StringBundler.concat(
				"(activationMode eq '", escapeODataString(activationMode),
				"') and (activationStatus eq '",
				escapeODataString(activationStatus),
				"') and (externalEnvironmentId eq '",
				escapeODataString(installationId), "') and (offering eq '",
				EnvironmentConstants.OFFERING_DXP, "')"));
	}

	public List<Environment> getEnvironments(String filterString)
		throws Exception {

		return getAllItems("/o/c/environments", filterString, Environment::new);
	}

	public List<Environment> getOfflineCloudNativeEnvironments(
			String projectExternalReferenceCode)
		throws Exception {

		return getEnvironments(
			StringBundler.concat(
				"(activationMode eq '",
				EnvironmentConstants.ACTIVATION_MODE_OFFLINE,
				"') and (activationStatus eq '",
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
				"') and (offering eq '",
				EnvironmentConstants.OFFERING_CLOUD_NATIVE,
				"') and (r_projectToEnvironment_c_projectERC eq '",
				escapeODataString(projectExternalReferenceCode), "')"));
	}

	public Environment putEnvironment(
			String externalReferenceCode, JSONObject jsonObject)
		throws Exception {

		return new Environment(
			new JSONObject(
				put(
					getAuthorization(), jsonObject.toString(),
					UriComponentsBuilder.fromPath(
						"/o/c/environments/by-external-reference-code" +
							"/{externalReferenceCode}"
					).buildAndExpand(
						externalReferenceCode
					).toUri())));
	}

	public void updateDXPEnvironmentActivation(
			String activationMode, long id, String installationId,
			String publicKey)
		throws Exception {

		JSONObject environmentJSONObject = new JSONObject(
		).put(
			"activationMode", activationMode
		).put(
			"activationStatus", EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
		).put(
			"externalEnvironmentId", installationId
		);

		if (Validator.isNotNull(publicKey)) {
			environmentJSONObject.put(
				"publicKey",
				JWTSignatureValidator.toBase64PublicKey(publicKey));
		}

		_patchEnvironment(id, environmentJSONObject);
	}

	public void updateDXPEnvironmentCheckIn(
			long id, Instant lastHeartbeatAtInstant, String productVersion)
		throws Exception {

		_patchEnvironment(
			id,
			new JSONObject(
			).put(
				"lastHeartbeatAt", lastHeartbeatAtInstant.toString()
			).put(
				"productVersion", productVersion
			));
	}

	public void updateEnvironmentActivation(
			String activationMode, String externalReferenceCode, long id,
			String name, String publicKey)
		throws Exception {

		_patchEnvironment(
			id,
			new JSONObject(
			).put(
				"activationMode", activationMode
			).put(
				"activationStatus",
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE
			).put(
				"externalReferenceCode", externalReferenceCode
			).put(
				"name", name
			).put(
				"publicKey", JWTSignatureValidator.toBase64PublicKey(publicKey)
			));
	}

	public void updateEnvironmentActivationStatus(
			String activationStatus, String hostName, long id)
		throws Exception {

		JSONObject environmentJSONObject = new JSONObject(
		).put(
			"activationStatus", activationStatus
		);

		if (Validator.isNotNull(hostName)) {
			environmentJSONObject.put("hostName", hostName);
		}

		_patchEnvironment(id, environmentJSONObject);
	}

	public void updateEnvironmentOfflineBundle(
			Collection<Long> bundledEntitlementIds, long id,
			String requestedVersion)
		throws Exception {

		_patchEnvironment(
			id,
			new JSONObject(
			).put(
				"bundledEntitlementIds",
				String.valueOf(new JSONArray(bundledEntitlementIds))
			).put(
				"requestedVersion", requestedVersion
			));
	}

	private Environment _addActivationEnvironment(
			long accountEntryId, long contractId, JSONObject fieldsJSONObject,
			String offering, String projectExternalReferenceCode)
		throws Exception {

		JSONObject environmentJSONObject = new JSONObject(
		).put(
			"activationStatus", EnvironmentConstants.ACTIVATION_STATUS_PENDING
		).put(
			"offering", offering
		).put(
			"r_accountEntryToEnvironment_accountEntryId", accountEntryId
		).put(
			"r_projectToEnvironment_c_projectERC", projectExternalReferenceCode
		);

		if (contractId > 0) {
			environmentJSONObject.put(
				"r_contractToEnvironment_c_contractId", contractId);
		}

		for (String fieldName : _ACTIVATION_FIELD_NAMES) {
			if (!fieldsJSONObject.has(fieldName)) {
				continue;
			}

			environmentJSONObject.put(
				fieldName, fieldsJSONObject.optString(fieldName));
		}

		String response = post(
			getAuthorization(), environmentJSONObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/environments"
			).build(
			).toUri());

		return new Environment(new JSONObject(response));
	}

	private Environment _addCodeActivatedEnvironment(
			long accountEntryId, String activationCode,
			String contractExternalReferenceCode, String offering,
			String projectExternalReferenceCode, String type)
		throws Exception {

		JSONObject environmentJSONObject = new JSONObject(
		).put(
			"activationCode", activationCode
		).put(
			"activationStatus", EnvironmentConstants.ACTIVATION_STATUS_PENDING
		).put(
			"offering", offering
		).put(
			"r_accountEntryToEnvironment_accountEntryId", accountEntryId
		).put(
			"type", type
		);

		if (contractExternalReferenceCode != null) {
			environmentJSONObject.put(
				"r_contractToEnvironment_c_contractERC",
				contractExternalReferenceCode);
		}

		if (projectExternalReferenceCode != null) {
			environmentJSONObject.put(
				"r_projectToEnvironment_c_projectERC",
				projectExternalReferenceCode);
		}

		String response = post(
			getAuthorization(), environmentJSONObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/environments"
			).build(
			).toUri());

		return new Environment(new JSONObject(response));
	}

	private Environment _fetchEnvironmentByExternalReferenceCode(
			String externalReferenceCode, Jwt jwt)
		throws Exception {

		String response = fetch(
			getAuthorization(jwt),
			UriComponentsBuilder.fromPath(
				"/o/c/environments/by-external-reference-code" +
					"/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		return new Environment(new JSONObject(response));
	}

	private void _patchEnvironment(long id, JSONObject environmentJSONObject)
		throws Exception {

		patch(
			getAuthorization(), environmentJSONObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/environments/" + id
			).build(
			).toUri());
	}

	private static final String[] _ACTIVATION_FIELD_NAMES = {
		"adminEmailAddress", "adminFirstName", "adminLastName",
		"allowedEmailDomains", "disasterRecoveryRegion", "friendlyURL",
		"githubUsername", "ownerEmailAddress", "projectId", "region",
		"timeZone", "workspaceName"
	};

	@Autowired
	private KeyedLock _keyedLock;

}