/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;

import java.net.URI;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-PROJECTMEMBERSHIPSERVICE] ProjectMembershipService")
public class ProjectMembershipServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_testProjectMembershipService, "_projectService", _projectService);
	}

	@Test
	public void testAddProjectMembership() throws Exception {
		Mockito.when(
			_projectService.fetchProject("PRJ-1")
		).thenReturn(
			new Project(
				new JSONObject(
				).put(
					"r_accountEntryToProject_accountEntryId", 5
				))
		);

		_testProjectMembershipService.addProjectMembership(
			"PRJ-1", "ROLE-1", 10L);

		Assertions.assertEquals(
			List.of(
				"r_userToProjectMembership_userId eq '10' and " +
					"r_projectToProjectMembership_c_projectERC eq 'PRJ-1' " +
						"and roleExternalReferenceCode eq 'ROLE-1'"),
			_testProjectMembershipService.filterStrings);
		Assertions.assertEquals(
			List.of("POST /o/c/projectmemberships"),
			_testProjectMembershipService.requests);

		JSONObject jsonObject = new JSONObject(
			_testProjectMembershipService.bodies.get(0));

		Assertions.assertEquals(
			5,
			jsonObject.getLong(
				"r_accountEntryToProjectMembership_accountEntryId"));
		Assertions.assertEquals(
			"PRJ-1",
			jsonObject.getString("r_projectToProjectMembership_c_projectERC"));
		Assertions.assertEquals(
			10, jsonObject.getLong("r_userToProjectMembership_userId"));
		Assertions.assertEquals(
			"ROLE-1", jsonObject.getString("roleExternalReferenceCode"));
	}

	@Test
	public void testAddProjectMembershipSkipsExistingMembership()
		throws Exception {

		_testProjectMembershipService.items.add(
			_createProjectMembershipJSONObject("PM-1"));

		_testProjectMembershipService.addProjectMembership(
			"PRJ-1", "ROLE-1", 10L);

		Assertions.assertTrue(_testProjectMembershipService.requests.isEmpty());

		Mockito.verifyNoInteractions(_projectService);
	}

	@Test
	public void testAddProjectMembershipSkipsUnknownProject() throws Exception {
		_testProjectMembershipService.addProjectMembership(
			"PRJ-1", "ROLE-1", 10L);

		Assertions.assertTrue(_testProjectMembershipService.requests.isEmpty());
	}

	@Test
	public void testDeleteProjectMembershipDeletesEveryMatch()
		throws Exception {

		_testProjectMembershipService.items.add(
			_createProjectMembershipJSONObject("PM-1"));
		_testProjectMembershipService.items.add(
			_createProjectMembershipJSONObject("PM-2"));

		Assertions.assertTrue(
			_testProjectMembershipService.deleteProjectMembership(
				"PRJ-1", "ROLE-1", 10L));
		Assertions.assertEquals(
			List.of(
				"DELETE /o/c/projectmemberships/by-external-reference-code" +
					"/PM-1",
				"DELETE /o/c/projectmemberships/by-external-reference-code" +
					"/PM-2"),
			_testProjectMembershipService.requests);
	}

	@Test
	public void testDeleteProjectMembershipReturnsFalseWithoutMatch()
		throws Exception {

		Assertions.assertFalse(
			_testProjectMembershipService.deleteProjectMembership(
				"PRJ-1", "ROLE-1", 10L));
		Assertions.assertTrue(_testProjectMembershipService.requests.isEmpty());
	}

	@Test
	public void testFetchProjectMembershipBuildsRoleFilter() throws Exception {
		_testProjectMembershipService.getResponse = new JSONObject(
		).put(
			"items",
			new JSONArray(
			).put(
				_createProjectMembershipJSONObject("PM-1")
			)
		).toString();

		ProjectMembership projectMembership =
			_testProjectMembershipService.fetchProjectMembership(
				"PRJ-'1", "ROLE-1", 10L);

		Assertions.assertEquals(
			"PM-1", projectMembership.getExternalReferenceCode());

		Assertions.assertEquals(
			"(r_projectToProjectMembership_c_projectERC eq 'PRJ-''1') and " +
				"(r_userToProjectMembership_userId eq '10') and " +
					"(roleExternalReferenceCode eq 'ROLE-1')",
			_getQueryParam(_testProjectMembershipService.getURI, "filter"));
		Assertions.assertEquals(
			"1",
			_getQueryParam(_testProjectMembershipService.getURI, "pageSize"));
	}

	@Test
	public void testFetchProjectMembershipOmitsBlankRoleFilter()
		throws Exception {

		_testProjectMembershipService.getResponse = "{\"items\": []}";

		Assertions.assertNull(
			_testProjectMembershipService.fetchProjectMembership(
				"PRJ-1", "", 10L));
		Assertions.assertEquals(
			"(r_projectToProjectMembership_c_projectERC eq 'PRJ-1') and " +
				"(r_userToProjectMembership_userId eq '10')",
			_getQueryParam(_testProjectMembershipService.getURI, "filter"));
	}

	@Test
	public void testFetchProjectMembershipReturnsNullForEmptyResponse()
		throws Exception {

		Assertions.assertNull(
			_testProjectMembershipService.fetchProjectMembership(
				"PRJ-1", null, 10L));

		_testProjectMembershipService.getResponse = "{}";

		Assertions.assertNull(
			_testProjectMembershipService.fetchProjectMembership(
				"PRJ-1", null, 10L));
	}

	@Test
	public void testGetProjectMembershipsOmitsRoleFilter() throws Exception {
		_testProjectMembershipService.items.add(
			_createProjectMembershipJSONObject("PM-1"));

		List<ProjectMembership> projectMemberships =
			_testProjectMembershipService.getProjectMemberships("PRJ-1", 10L);

		Assertions.assertEquals(1, projectMemberships.size());

		Assertions.assertEquals(
			List.of(
				"r_userToProjectMembership_userId eq '10' and " +
					"r_projectToProjectMembership_c_projectERC eq 'PRJ-1'"),
			_testProjectMembershipService.filterStrings);
	}

	private JSONObject _createProjectMembershipJSONObject(
		String externalReferenceCode) {

		return new JSONObject(
		).put(
			"externalReferenceCode", externalReferenceCode
		);
	}

	private String _getQueryParam(URI uri, String name) {
		String queryParam = null;

		String query = uri.getQuery();

		for (String parameter : query.split("&")) {
			if (parameter.startsWith(name + "=")) {
				queryParam = parameter.substring(name.length() + 1);
			}
		}

		return queryParam;
	}

	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final TestProjectMembershipService _testProjectMembershipService =
		new TestProjectMembershipService();

	private static class TestProjectMembershipService
		extends ProjectMembershipService {

		public final List<String> bodies = new ArrayList<>();
		public final List<String> filterStrings = new ArrayList<>();
		public String getResponse;
		public URI getURI;
		public final List<JSONObject> items = new ArrayList<>();
		public final List<String> requests = new ArrayList<>();

		@Override
		protected String delete(String authorization, String body, URI uri) {
			requests.add("DELETE " + uri.getPath());

			return null;
		}

		@Override
		protected String get(String authorization, URI uri) {
			getURI = uri;

			return getResponse;
		}

		@Override
		protected <T> List<T> getAllItems(
			String path, String filterString, Function<JSONObject, T> function,
			Jwt jwt) {

			filterStrings.add(filterString);

			List<T> list = new ArrayList<>();

			for (JSONObject jsonObject : items) {
				list.add(function.apply(jsonObject));
			}

			return list;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			bodies.add(body);
			requests.add("POST " + uri.getPath());

			return "{}";
		}

	}

}