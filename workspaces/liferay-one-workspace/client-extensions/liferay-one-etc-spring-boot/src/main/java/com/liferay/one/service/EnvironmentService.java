/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Environment;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Amos Fong
 */
@Component
public class EnvironmentService extends OneBaseService {

	public Environment addCloudNativeEnvironment(
			long accountEntryId, String activationCode,
			String contractExternalReferenceCode, String environmentType,
			String projectExternalReferenceCode)
		throws Exception {

		JSONObject environmentJSONObject = new JSONObject(
		).put(
			"activationCode", activationCode
		).put(
			"activationStatus", EnvironmentConstants.ACTIVATION_STATUS_PENDING
		).put(
			"environmentType", environmentType
		).put(
			"r_accountEntryToEnvironment_accountEntryId", accountEntryId
		).put(
			"r_contractToEnvironment_c_contractERC",
			contractExternalReferenceCode
		).put(
			"type", EnvironmentConstants.TYPE_CNE
		);

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

		return fetchEnvironmentByExternalReferenceCode(
			externalReferenceCode, null);
	}

	public Environment fetchEnvironmentByExternalReferenceCode(
			String externalReferenceCode, Jwt jwt)
		throws Exception {

		String response = null;

		try {
			response = get(
				getAuthorization(jwt),
				UriComponentsBuilder.fromPath(
					"/o/c/environments/by-external-reference-code" +
						"/{externalReferenceCode}"
				).buildAndExpand(
					externalReferenceCode
				).toUri());
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode == HttpStatus.FORBIDDEN.value()) {
				if (_log.isWarnEnabled()) {
					_log.warn(
						"Unable to view environment " + externalReferenceCode,
						webClientResponseException);
				}
			}
			else if (statusCode != HttpStatus.NOT_FOUND.value()) {
				throw webClientResponseException;
			}
		}

		if (Validator.isNull(response)) {
			return null;
		}

		return new Environment(new JSONObject(response));
	}

	public List<Environment> getEnvironments(String filterString)
		throws Exception {

		return getAllItems("/o/c/environments", filterString, Environment::new);
	}

	public void updateEnvironmentActivation(
			String activationMode, String environmentName,
			String externalReferenceCode, long id, String publicKey)
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
				"environmentName", environmentName
			).put(
				"externalReferenceCode", externalReferenceCode
			).put(
				"publicKey", publicKey
			));
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

	private static final Log _log = LogFactory.getLog(EnvironmentService.class);

}