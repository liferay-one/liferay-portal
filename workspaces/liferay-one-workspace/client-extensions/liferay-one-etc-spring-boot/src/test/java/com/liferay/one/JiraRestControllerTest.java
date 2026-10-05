/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.model.JiraSupportIssue;
import com.liferay.one.jira.service.JiraIssueService;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Collections;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class JiraRestControllerTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_jiraRestController, "_jiraIssueService", _jiraIssueService);
		ReflectionTestUtils.setField(
			_jiraRestController, "_projectPermission", _projectPermission);
	}

	@Test
	public void testGetProjectsTicketsListsTheTickets() throws Exception {
		String[] ticketIds = {"LRSD-1"};

		Mockito.when(
			_jiraIssueService.getJiraSupportIssues(_PROJECT_ERC, ticketIds)
		).thenReturn(
			Collections.singletonList(
				new JiraSupportIssue(
					new JSONObject(
					).put(
						"fields",
						new JSONObject(
						).put(
							"summary", "Portal is down"
						)
					).put(
						"key", "LRSD-1"
					)))
		);

		ResponseEntity<String> responseEntity =
			_jiraRestController.getProjectsTickets(
				null, _PROJECT_ERC, ticketIds);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray itemsJSONArray = jsonObject.getJSONArray("items");

		Assertions.assertEquals(1, itemsJSONArray.length());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_ERC
		);
	}

	@Test
	public void testGetProjectsTicketsWithoutPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_ERC
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _jiraRestController.getProjectsTickets(
				null, _PROJECT_ERC, new String[0]));

		Mockito.verifyNoInteractions(_jiraIssueService);
	}

	private static final String _PROJECT_ERC = "PRJCT-1";

	private final JiraIssueService _jiraIssueService = Mockito.mock(
		JiraIssueService.class);
	private final JiraRestController _jiraRestController =
		new JiraRestController();
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);

}