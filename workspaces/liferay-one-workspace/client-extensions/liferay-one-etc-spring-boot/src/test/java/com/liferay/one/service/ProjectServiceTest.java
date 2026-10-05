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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-PROJECTSERVICE] ProjectService")
public class ProjectServiceTest {

	@Test
	public void testFetchProject() throws Exception {
		_testProjectService.fetchResponse = new JSONObject(
		).put(
			"externalReferenceCode", "PRJ-1"
		).put(
			"r_accountEntryToProject_accountEntryId", 5
		).toString();

		Project project = _testProjectService.fetchProject("PRJ-1");

		Assertions.assertEquals(5, project.getAccountId());

		Assertions.assertEquals(
			List.of("GET /o/c/projects/by-external-reference-code/PRJ-1"),
			_testProjectService.requests);
	}

	@Test
	public void testFetchProjectReturnsNullWhenNotFound() throws Exception {
		Assertions.assertNull(_testProjectService.fetchProject("PRJ-1"));
	}

	@Test
	public void testUpsertProjectFallsBackToAccountExternalReferenceCode()
		throws Exception {

		_testProjectService.upsertProject(
			"ACCNT-1",
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
	public void testUpsertProjectPatchesWithEveryOptionalField()
		throws Exception {

		_testProjectService.upsertProject(
			"ACCNT-IGNORED",
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
		Assertions.assertEquals(
			_testProjectService.bodies.get(0),
			_testProjectService.bodies.get(1));
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
			"ACCNT-1",
			new SalesforceProject(
				new JSONObject(
				).put(
					"Name", "Project 1"
				)));
		_testProjectService.upsertProject(
			"ACCNT-1",
			new SalesforceProject(
				new JSONObject(
				).put(
					"Id", "PRJ-1"
				)));

		Assertions.assertTrue(_testProjectService.requests.isEmpty());
	}

	private WebClientResponseException _createException(int statusCode) {
		return WebClientResponseException.create(
			statusCode, "Error", HttpHeaders.EMPTY,
			"error".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
	}

	private final TestProjectService _testProjectService =
		new TestProjectService();

	private static class TestProjectService extends ProjectService {

		public final List<String> bodies = new ArrayList<>();
		public String fetchResponse;
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

			return "{}";
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