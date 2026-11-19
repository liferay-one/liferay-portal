/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Felipe Veloso
 */
@Component
public class ProjectService extends OneBaseService {

	public Project fetchProject(String externalReferenceCode) throws Exception {
		return _fetchProject(getAuthorization(), externalReferenceCode);
	}

	public Project fetchProject(String externalReferenceCode, Jwt jwt)
		throws Exception {

		return _fetchProject(getAuthorization(jwt), externalReferenceCode);
	}

	public Project getProject(String externalReferenceCode) throws Exception {
		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/projects/by-external-reference-code" +
					"/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		return new Project(new JSONObject(response));
	}

	public List<Project> getProjects(long accountId) throws Exception {
		return getAllItems(
			"/o/c/projects",
			"r_accountEntryToProject_accountEntryId eq '" + accountId + "'",
			Project::new);
	}

	/**
	 * Updates the licensing settings of the project. A setting that the JSON
	 * object does not name keeps its value.
	 */
	public Project updateLicensingSettings(
			String externalReferenceCode,
			JSONObject licensingSettingsJSONObject)
		throws Exception {

		return new Project(
			new JSONObject(
				patch(
					getAuthorization(), licensingSettingsJSONObject.toString(),
					UriComponentsBuilder.fromPath(
						"/o/c/projects/by-external-reference-code" +
							"/{externalReferenceCode}"
					).buildAndExpand(
						externalReferenceCode
					).toUri())));
	}

	public boolean upsertProject(SalesforceProject salesforceProject)
		throws Exception {

		return upsertProject(null, null, salesforceProject);
	}

	/**
	 * Creates or updates the project. A new project starts with the licensing
	 * settings of the legacy provisioning system. It allows one complimentary
	 * key unless the billing country of its account is Ireland or the United
	 * Kingdom. When no billing country is given, it is read from the default
	 * billing address of the account. It allows self provisioning, and it does
	 * not allow permanent licenses until an administrator turns them on. The
	 * values are stored explicitly. Only an administrator, or generating a
	 * complimentary key, changes the settings of an existing project.
	 */
	public boolean upsertProject(
			String accountExternalReferenceCode, String billingCountry,
			SalesforceProject salesforceProject)
		throws Exception {

		String accountEntryERC = salesforceProject.getAccountId();

		if (Validator.isNull(accountEntryERC)) {
			accountEntryERC = accountExternalReferenceCode;
		}

		if (Validator.isNull(salesforceProject.getId()) ||
			Validator.isNull(salesforceProject.getName()) ||
			Validator.isNull(accountEntryERC)) {

			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to upsert project " + salesforceProject.getId() +
						" without an ID, name, and account");
			}

			return false;
		}

		JSONObject jsonObject = new JSONObject();

		if (Validator.isNotNull(salesforceProject.getAIHubAccountName())) {
			jsonObject.put(
				"aiHubAccountName", salesforceProject.getAIHubAccountName());
		}

		if (Validator.isNotNull(salesforceProject.getAllowedEmailDomains())) {
			jsonObject.put(
				"allowedEmailDomains",
				salesforceProject.getAllowedEmailDomains());
		}

		if (Validator.isNotNull(salesforceProject.getDataCenterLocation())) {
			jsonObject.put(
				"dataCenterLocation",
				salesforceProject.getDataCenterLocation());
		}

		jsonObject.put("externalReferenceCode", salesforceProject.getId());

		if (Validator.isNotNull(salesforceProject.getFriendlyWorkspaceURL())) {
			jsonObject.put(
				"friendlyWorkspaceURL",
				salesforceProject.getFriendlyWorkspaceURL());
		}

		if (Validator.isNotNull(salesforceProject.getLiferayVersion())) {
			jsonObject.put(
				"liferayVersion", salesforceProject.getLiferayVersion());
		}

		jsonObject.put(
			"name", salesforceProject.getName()
		).put(
			"r_accountEntryToProject_accountEntryERC", accountEntryERC
		);

		if (Validator.isNotNull(
				salesforceProject.getSecurityContactEmailAddress())) {

			jsonObject.put(
				"securityContactEmailAddress",
				salesforceProject.getSecurityContactEmailAddress());
		}

		URI uri = UriComponentsBuilder.fromPath(
			"/o/c/projects/by-external-reference-code/" +
				salesforceProject.getId()
		).build(
		).toUri();

		try {
			patch(getAuthorization(), jsonObject.toString(), uri);
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode != HttpStatus.NOT_FOUND.value()) {
				throw webClientResponseException;
			}

			jsonObject.put(
				"allowComplimentary",
				_isAllowComplimentary(accountEntryERC, billingCountry)
			).put(
				"allowPermanentLicenses", false
			).put(
				"allowSelfProvisioning", true
			);

			put(getAuthorization(), jsonObject.toString(), uri);
		}

		return true;
	}

	private Project _fetchProject(
			String authorization, String externalReferenceCode)
		throws Exception {

		String response = fetch(
			authorization,
			UriComponentsBuilder.fromPath(
				"/o/c/projects/by-external-reference-code" +
					"/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		return new Project(new JSONObject(response));
	}

	private boolean _isAllowComplimentary(
		String accountExternalReferenceCode, String billingCountry) {

		if (Validator.isNull(billingCountry)) {
			try {
				billingCountry = _accountService.fetchBillingCountry(
					accountExternalReferenceCode);
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get the billing country of account " +
						accountExternalReferenceCode,
					exception);

				return false;
			}
		}

		if (Objects.equals(billingCountry, "Ireland") ||
			Objects.equals(billingCountry, "United Kingdom")) {

			return false;
		}

		return true;
	}

	private static final Log _log = LogFactory.getLog(ProjectService.class);

	@Autowired
	private AccountService _accountService;

}