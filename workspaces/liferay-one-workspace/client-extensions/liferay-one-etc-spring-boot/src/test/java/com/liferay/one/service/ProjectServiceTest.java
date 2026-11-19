/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;
import com.liferay.one.salesforce.model.SalesforceProject;

import java.net.URI;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-PROJECTSERVICE] ProjectService")
public class ProjectServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_testProjectService, "_accountService", _accountService);
	}

	@Test
	public void testFetchProject() throws Exception {
		_testProjectService.fetchResponse = new JSONObject(
		).put(
			"allowComplimentary", true
		).put(
			"externalReferenceCode", "PRJ-1"
		).put(
			"r_accountEntryToProject_accountEntryId", 5
		).toString();

		Project project = _testProjectService.fetchProject("PRJ-1");

		Assertions.assertEquals(5, project.getAccountId());
		Assertions.assertTrue(project.isAllowComplimentary());
		Assertions.assertFalse(project.isAllowPermanentLicenses());
		Assertions.assertTrue(project.isAllowSelfProvisioning());

		Assertions.assertEquals(
			List.of("GET /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);
	}

	@Test
	public void testFetchProjectReturnsNullWhenNotFound() throws Exception {
		Assertions.assertNull(_testProjectService.fetchProject("PRJ-1"));
	}

	@Test
	public void testUpdateLicensingSettingsPatchesOnlyTheGivenSettings()
		throws Exception {

		_testProjectService.patchResponse = new JSONObject(
		).put(
			"allowComplimentary", true
		).put(
			"allowPermanentLicenses", false
		).put(
			"allowSelfProvisioning", true
		).toString();

		Project project = _testProjectService.updateLicensingSettings(
			"PRJ-1",
			new JSONObject(
			).put(
				"allowPermanentLicenses", false
			));

		Assertions.assertEquals(
			List.of("PATCH /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);
		Assertions.assertEquals(
			"{\"allowPermanentLicenses\":false}",
			_testProjectService.bodies.get(0));
		Assertions.assertTrue(project.isAllowComplimentary());
		Assertions.assertFalse(project.isAllowPermanentLicenses());
		Assertions.assertTrue(project.isAllowSelfProvisioning());
	}

	@Test
	public void testUpsertProjectAllowsComplimentaryByBillingCountry()
		throws Exception {

		Mockito.when(
			_accountService.fetchBillingCountry("ACCNT-1")
		).thenReturn(
			"United Kingdom"
		);

		Assertions.assertFalse(
			_getCreatedJSONObject(
				"Ireland"
			).getBoolean(
				"allowComplimentary"
			));
		Assertions.assertFalse(
			_getCreatedJSONObject(
				"United Kingdom"
			).getBoolean(
				"allowComplimentary"
			));
		Assertions.assertTrue(
			_getCreatedJSONObject(
				"Spain"
			).getBoolean(
				"allowComplimentary"
			));
		Assertions.assertFalse(
			_getCreatedJSONObject(
				null
			).getBoolean(
				"allowComplimentary"
			));

		Mockito.when(
			_accountService.fetchBillingCountry("ACCNT-1")
		).thenReturn(
			null
		);

		Assertions.assertTrue(
			_getCreatedJSONObject(
				null
			).getBoolean(
				"allowComplimentary"
			));
	}

	@Test
	public void testUpsertProjectFallsBackToAccountExternalReferenceCode()
		throws Exception {

		_testProjectService.upsertProject(
			"ACCNT-1", null,
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				).put(
					"Name", "Project 1"
				)));

		JSONObject jsonObject = new JSONObject(
			_testProjectService.bodies.get(0));

		Assertions.assertEquals(
			"ACCNT-1",
			jsonObject.getString("r_accountEntryToProject_accountEntryERC"));
		Assertions.assertFalse(jsonObject.has("aiHubAccountName"));
		Assertions.assertFalse(jsonObject.has("allowedEmailDomains"));
		Assertions.assertFalse(jsonObject.has("dataCenterLocation"));
		Assertions.assertFalse(jsonObject.has("friendlyWorkspaceURL"));
		Assertions.assertFalse(jsonObject.has("liferayVersion"));
		Assertions.assertFalse(jsonObject.has("securityContactEmailAddress"));
	}

	@Test
	public void testUpsertProjectLeavesTheSettingsOfAnExistingProject()
		throws Exception {

		_testProjectService.upsertProject(
			"ACCNT-1", "Ireland",
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				).put(
					"Name", "Project 1"
				)));

		JSONObject jsonObject = new JSONObject(
			_testProjectService.bodies.get(0));

		Assertions.assertFalse(jsonObject.has("allowComplimentary"));
		Assertions.assertFalse(jsonObject.has("allowPermanentLicenses"));
		Assertions.assertFalse(jsonObject.has("allowSelfProvisioning"));
	}

	@Test
	public void testUpsertProjectPatchesWithEveryOptionalField()
		throws Exception {

		_testProjectService.upsertProject(
			"ACCNT-IGNORED", null,
			new SalesforceProject(
				new JSONObject(
				).put(
					"Account__c", "ACCNT-1"
				).put(
					"AI_Hub_Account_Name__c", "AI Hub"
				).put(
					"Allowed_Email_Domains__c", "liferay.com"
				).put(
					"Data_Center_Location__c", "US"
				).put(
					"Friendly_Workspace_URL__c", "workspace"
				).put(
					"Id", "PRJ-1"
				).put(
					"Liferay_Version__c", "2026.Q1"
				).put(
					"Name", "Project 1"
				).put(
					"Security_Contact_Email_Address__c", "security@liferay.com"
				)));

		Assertions.assertEquals(
			List.of("PATCH /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);

		JSONObject jsonObject = new JSONObject(
			_testProjectService.bodies.get(0));

		Assertions.assertEquals(
			"AI Hub", jsonObject.getString("aiHubAccountName"));
		Assertions.assertEquals(
			"liferay.com", jsonObject.getString("allowedEmailDomains"));
		Assertions.assertEquals(
			"US", jsonObject.getString("dataCenterLocation"));
		Assertions.assertEquals(
			"PRJ-1", jsonObject.getString("externalReferenceCode"));
		Assertions.assertEquals(
			"workspace", jsonObject.getString("friendlyWorkspaceURL"));
		Assertions.assertEquals(
			"2026.Q1", jsonObject.getString("liferayVersion"));
		Assertions.assertEquals("Project 1", jsonObject.getString("name"));
		Assertions.assertEquals(
			"ACCNT-1",
			jsonObject.getString("r_accountEntryToProject_accountEntryERC"));
		Assertions.assertEquals(
			"security@liferay.com",
			jsonObject.getString("securityContactEmailAddress"));
	}

	@Test
	public void testUpsertProjectPutsWhenPatchReturnsNotFound()
		throws Exception {

		_testProjectService.patchRuntimeException = _createException(404);

		_testProjectService.upsertProject(
			new SalesforceProject(
				new JSONObject(
				).put(
					"Account__c", "ACCNT-1"
				).put(
					"Id", "PRJ-1"
				).put(
					"Name", "Project 1"
				)));

		Assertions.assertEquals(
			List.of(
				"PATCH /o/c/projects/by-external-reference-code/PRJ-1",
				"PUT /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);

		JSONObject patchJSONObject = new JSONObject(
			_testProjectService.bodies.get(0));

		Assertions.assertFalse(patchJSONObject.has("allowComplimentary"));
		Assertions.assertFalse(patchJSONObject.has("allowPermanentLicenses"));
		Assertions.assertFalse(patchJSONObject.has("allowSelfProvisioning"));

		JSONObject putJSONObject = new JSONObject(
			_testProjectService.bodies.get(1));

		Assertions.assertTrue(putJSONObject.getBoolean("allowComplimentary"));
		Assertions.assertFalse(
			putJSONObject.getBoolean("allowPermanentLicenses"));
		Assertions.assertTrue(
			putJSONObject.getBoolean("allowSelfProvisioning"));

		putJSONObject.remove("allowComplimentary");
		putJSONObject.remove("allowPermanentLicenses");
		putJSONObject.remove("allowSelfProvisioning");

		Assertions.assertTrue(patchJSONObject.similar(putJSONObject));
	}

	@Test
	public void testUpsertProjectRethrowsOtherPatchErrors() {
		_testProjectService.patchRuntimeException = _createException(500);

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> _testProjectService.upsertProject(
				new SalesforceProject(
					new JSONObject(
					).put(
						"Account__c", "ACCNT-1"
					).put(
						"Id", "PRJ-1"
					).put(
						"Name", "Project 1"
					))));

		Assertions.assertEquals(
			List.of("PATCH /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);
	}

	@Test
	public void testUpsertProjectSkipsIncompleteProject() throws Exception {
		_testProjectService.upsertProject(
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				).put(
					"Name", "Project 1"
				)));
		_testProjectService.upsertProject(
			"ACCNT-1", null,
			new SalesforceProject(
				new JSONObject(
				).put(
					"Name", "Project 1"
				)));
		_testProjectService.upsertProject(
			"ACCNT-1", null,
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				)));

		Assertions.assertTrue(_testProjectService.requests.isEmpty());
	}

	@Test
	public void testUpsertProjectTurnsOffComplimentaryOfANewProjectWhenALookupFails()
		throws Exception {

		Mockito.when(
			_accountService.fetchBillingCountry("ACCNT-1")
		).thenThrow(
			new RuntimeException()
		);

		JSONObject jsonObject = _getCreatedJSONObject(null);

		Assertions.assertFalse(jsonObject.getBoolean("allowComplimentary"));
		Assertions.assertFalse(jsonObject.getBoolean("allowPermanentLicenses"));
		Assertions.assertTrue(jsonObject.getBoolean("allowSelfProvisioning"));
	}

	private WebClientResponseException _createException(int statusCode) {
		return WebClientResponseException.create(
			statusCode, "Error", HttpHeaders.EMPTY,
			"error".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
	}

	private JSONObject _getCreatedJSONObject(String billingCountry)
		throws Exception {

		_testProjectService.bodies.clear();

		_testProjectService.patchRuntimeException = _createException(404);

		_testProjectService.upsertProject(
			"ACCNT-1", billingCountry,
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				).put(
					"Name", "Project 1"
				)));

		return new JSONObject(_testProjectService.bodies.get(1));
	}

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final TestProjectService _testProjectService =
		new TestProjectService();

	private static class TestProjectService extends ProjectService {

		public final List<String> bodies = new ArrayList<>();
		public String fetchResponse;
		public String patchResponse = "{}";
		public RuntimeException patchRuntimeException;
		public final List<String> requests = new ArrayList<>();

		@Override
		protected String fetch(String authorization, URI uri) {
			requests.add("GET " + uri.getPath());

			return fetchResponse;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String patch(String authorization, String body, URI uri) {
			_record("PATCH", body, uri);

			if (patchRuntimeException != null) {
				throw patchRuntimeException;
			}

			return patchResponse;
		}

		@Override
		protected String put(String authorization, String body, URI uri) {
			_record("PUT", body, uri);

			return "{}";
		}

		private void _record(String method, String body, URI uri) {
			bodies.add(body);
			requests.add(method + " " + uri.getPath());
		}

	}

}