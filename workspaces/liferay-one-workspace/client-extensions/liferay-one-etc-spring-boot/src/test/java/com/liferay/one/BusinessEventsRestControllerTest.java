/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.JiraBusinessEventConverter;
import com.liferay.one.jira.model.JiraAssetObjectFieldOption;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.one.jira.model.JiraBusinessEventVersion;
import com.liferay.one.jira.model.JiraProductVersion;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class BusinessEventsRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_businessEventsRestController, "_businessEventConverter",
			_jiraBusinessEventConverter);
		ReflectionTestUtils.setField(
			_businessEventsRestController, "_businessEventService",
			_jiraBusinessEventService);
		ReflectionTestUtils.setField(
			_businessEventsRestController, "_projectPermission",
			_projectPermission);
		ReflectionTestUtils.setField(
			_businessEventsRestController, "_userAccountService",
			_userAccountService);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(_EMAIL_ADDRESS);

		Mockito.when(
			_userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
		);
	}

	@Test
	public void testDeleteProjectsBusinessEventsDeletesTheEvent()
		throws Exception {

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.deleteProjectsBusinessEvents(
				null, _PROJECT_ERC, "42");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.UPDATE, null, _PROJECT_ERC
		);

		Mockito.verify(
			_jiraBusinessEventService
		).deleteJiraBusinessEvent(
			"42"
		);
	}

	@Test
	public void testDeleteProjectsBusinessEventsPropagatesNotFound()
		throws Exception {

		Mockito.doThrow(
			new IllegalStateException("No business event 42")
		).when(
			_jiraBusinessEventService
		).deleteJiraBusinessEvent(
			"42"
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _businessEventsRestController.deleteProjectsBusinessEvents(
				null, _PROJECT_ERC, "42"));
	}

	@Test
	public void testDeleteProjectsBusinessEventsWithoutPermission()
		throws Exception {

		_denyPermission(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.deleteProjectsBusinessEvents(
				null, _PROJECT_ERC, "42"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testGetBusinessEventsFieldsOptions() throws Exception {
		Mockito.when(
			_jiraBusinessEventService.getFieldOptions("Event Type")
		).thenReturn(
			Arrays.asList(
				new JiraAssetObjectFieldOption("Upgrade", "upgrade"),
				new JiraAssetObjectFieldOption("Launch", "launch"))
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.getBusinessEventsFieldsOptions(
				"Event Type");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONArray itemsJSONArray = _getItemsJSONArray(responseEntity);

		Assertions.assertEquals(2, itemsJSONArray.length());
		Assertions.assertEquals(
			new JiraAssetObjectFieldOption(
				"Upgrade", "upgrade"
			).toJSONObject(
			).toString(),
			itemsJSONArray.getJSONObject(
				0
			).toString());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetProductVersions() throws Exception {
		Mockito.when(
			_jiraBusinessEventService.getJiraProductVersions()
		).thenReturn(
			Collections.singletonList(
				new JiraProductVersion(
					new JSONObject(
					).put(
						"id", "10001"
					).put(
						"name", "2025.Q1"
					)))
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.getProductVersions();

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONArray itemsJSONArray = _getItemsJSONArray(responseEntity);

		Assertions.assertEquals(1, itemsJSONArray.length());

		JSONObject itemJSONObject = itemsJSONArray.getJSONObject(0);

		Assertions.assertEquals("10001", itemJSONObject.getString("id"));
		Assertions.assertEquals("2025.Q1", itemJSONObject.getString("name"));

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetProjectsBusinessEventsById() throws Exception {

		// [REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID]

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEvent("42")
		).thenReturn(
			_toJiraBusinessEvent("Upgrade")
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.getProjectsBusinessEvents(
				null, _PROJECT_ERC, "42");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals("Upgrade", jsonObject.getString("name"));

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_ERC
		);
	}

	@Test
	public void testGetProjectsBusinessEventsByIdPropagatesUnknownId()
		throws Exception {

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEvent("42")
		).thenThrow(
			new IllegalStateException("No business event 42")
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _businessEventsRestController.getProjectsBusinessEvents(
				null, _PROJECT_ERC, "42"));
	}

	@Test
	public void testGetProjectsBusinessEventsByIdWithoutPermission()
		throws Exception {

		_denyPermission(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.getProjectsBusinessEvents(
				null, _PROJECT_ERC, "42"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testGetProjectsBusinessEventsListsTheEvents() throws Exception {

		// [REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS]

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEvents(_PROJECT_ERC)
		).thenReturn(
			Arrays.asList(
				_toJiraBusinessEvent("Launch"), _toJiraBusinessEvent("Upgrade"))
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.getProjectsBusinessEvents(
				null, _PROJECT_ERC);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONArray itemsJSONArray = _getItemsJSONArray(responseEntity);

		Assertions.assertEquals(2, itemsJSONArray.length());
		Assertions.assertEquals(
			"Launch",
			itemsJSONArray.getJSONObject(
				0
			).getString(
				"name"
			));

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_ERC
		);
	}

	@Test
	public void testGetProjectsBusinessEventsListsWithoutPermissionFails()
		throws Exception {

		_denyPermission(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.getProjectsBusinessEvents(
				null, _PROJECT_ERC));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testGetProjectsBusinessEventsVersions() throws Exception {
		JiraBusinessEventVersion jiraBusinessEventVersion = Mockito.mock(
			JiraBusinessEventVersion.class);

		Mockito.when(
			jiraBusinessEventVersion.toJSONObject()
		).thenReturn(
			new JSONObject(
			).put(
				"comment", "Moved the date"
			)
		);

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEventVersions("42")
		).thenReturn(
			Collections.singletonList(jiraBusinessEventVersion)
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.getProjectsBusinessEventsVersions(
				null, _PROJECT_ERC, "42");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONArray itemsJSONArray = _getItemsJSONArray(responseEntity);

		Assertions.assertEquals(1, itemsJSONArray.length());
		Assertions.assertEquals(
			"Moved the date",
			itemsJSONArray.getJSONObject(
				0
			).getString(
				"comment"
			));
	}

	@Test
	public void testGetProjectsBusinessEventsVersionsWithoutPermission()
		throws Exception {

		_denyPermission(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				_businessEventsRestController.getProjectsBusinessEventsVersions(
					null, _PROJECT_ERC, "42"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testPostProjectsBusinessEventsCreatesAndListsTheEvents()
		throws Exception {

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEvents(_PROJECT_ERC)
		).thenReturn(
			Collections.singletonList(_toJiraBusinessEvent("Upgrade"))
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.postProjectsBusinessEvents(
				null, _PROJECT_ERC, "{\"name\": \"Upgrade\"}");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		ArgumentCaptor<JiraBusinessEvent> argumentCaptor =
			ArgumentCaptor.forClass(JiraBusinessEvent.class);

		Mockito.verify(
			_jiraBusinessEventService
		).createJiraBusinessEvent(
			argumentCaptor.capture()
		);

		JiraBusinessEvent jiraBusinessEvent = argumentCaptor.getValue();

		Assertions.assertEquals(
			_EMAIL_ADDRESS, jiraBusinessEvent.getAuthorEmailAddress());
		Assertions.assertEquals("Upgrade", jiraBusinessEvent.getName());
		Assertions.assertEquals(
			_PROJECT_ERC, jiraBusinessEvent.getProjectExternalReferenceCode());

		JSONArray itemsJSONArray = _getItemsJSONArray(responseEntity);

		Assertions.assertEquals(1, itemsJSONArray.length());
	}

	@Test
	public void testPostProjectsBusinessEventsPropagatesMalformedBody()
		throws Exception {

		Assertions.assertThrows(
			JSONException.class,
			() -> _businessEventsRestController.postProjectsBusinessEvents(
				null, _PROJECT_ERC, "not json"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testPostProjectsBusinessEventsPropagatesMissingUser()
		throws Exception {

		Mockito.when(
			_userAccountService.getMyUserAccount(Mockito.any())
		).thenThrow(
			new IllegalStateException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.postProjectsBusinessEvents(
				null, _PROJECT_ERC, "{\"name\": \"Upgrade\"}"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testPostProjectsBusinessEventsWithoutPermission()
		throws Exception {

		_denyPermission(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.postProjectsBusinessEvents(
				null, _PROJECT_ERC, "{\"name\": \"Upgrade\"}"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testPutProjectsBusinessEventsPropagatesMalformedBody()
		throws Exception {

		Assertions.assertThrows(
			JSONException.class,
			() -> _businessEventsRestController.putProjectsBusinessEvents(
				null, _PROJECT_ERC, "42", "not json"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	@Test
	public void testPutProjectsBusinessEventsPropagatesUnknownId()
		throws Exception {

		Mockito.when(
			_jiraBusinessEventService.updateJiraBusinessEvent(
				Mockito.any(), Mockito.eq("42"))
		).thenThrow(
			new IllegalStateException("No business event 42")
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _businessEventsRestController.putProjectsBusinessEvents(
				null, _PROJECT_ERC, "42", "{\"name\": \"Upgrade\"}"));
	}

	@Test
	public void testPutProjectsBusinessEventsUpdatesTheEvent()
		throws Exception {

		Mockito.when(
			_jiraBusinessEventService.updateJiraBusinessEvent(
				Mockito.any(), Mockito.eq("42"))
		).thenReturn(
			_toJiraBusinessEvent("Upgraded")
		);

		ResponseEntity<String> responseEntity =
			_businessEventsRestController.putProjectsBusinessEvents(
				null, _PROJECT_ERC, "42", "{\"name\": \"Upgrade\"}");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals("Upgraded", jsonObject.getString("name"));

		ArgumentCaptor<JiraBusinessEvent> argumentCaptor =
			ArgumentCaptor.forClass(JiraBusinessEvent.class);

		Mockito.verify(
			_jiraBusinessEventService
		).updateJiraBusinessEvent(
			argumentCaptor.capture(), Mockito.eq("42")
		);

		JiraBusinessEvent jiraBusinessEvent = argumentCaptor.getValue();

		Assertions.assertEquals(
			_EMAIL_ADDRESS, jiraBusinessEvent.getAuthorEmailAddress());
		Assertions.assertEquals("Upgrade", jiraBusinessEvent.getName());
	}

	@Test
	public void testPutProjectsBusinessEventsWithoutPermission()
		throws Exception {

		_denyPermission(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _businessEventsRestController.putProjectsBusinessEvents(
				null, _PROJECT_ERC, "42", "{\"name\": \"Upgrade\"}"));

		Mockito.verifyNoInteractions(_jiraBusinessEventService);
	}

	private void _denyPermission(String actionId) throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			actionId, null, _PROJECT_ERC
		);
	}

	private JSONArray _getItemsJSONArray(
		ResponseEntity<String> responseEntity) {

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		return jsonObject.getJSONArray("items");
	}

	private JiraBusinessEvent _toJiraBusinessEvent(String name) {
		return _jiraBusinessEventConverter.toJiraBusinessEvent(
			new JSONObject(
			).put(
				"name", name
			).toString(),
			_EMAIL_ADDRESS, _PROJECT_ERC);
	}

	private static final String _EMAIL_ADDRESS = "test@liferay.com";

	private static final String _PROJECT_ERC = "PRJCT-1";

	private final BusinessEventsRestController _businessEventsRestController =
		new BusinessEventsRestController();
	private final JiraBusinessEventConverter _jiraBusinessEventConverter =
		new JiraBusinessEventConverter();
	private final JiraBusinessEventService _jiraBusinessEventService =
		Mockito.mock(JiraBusinessEventService.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}