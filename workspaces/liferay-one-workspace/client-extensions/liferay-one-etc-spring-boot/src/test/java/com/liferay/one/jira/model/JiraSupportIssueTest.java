/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.model;

import com.liferay.one.jira.constants.IssueConstants;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRASUPPORTISSUE] JiraSupportIssue")
public class JiraSupportIssueTest {

	@Test
	public void testFieldsReadFromJSON() {
		JiraOrganization jiraOrganization = new JiraOrganization(
			"ACCOUNT_ERC", "1", "Acme");

		JiraSupportIssue jiraSupportIssue = new JiraSupportIssue(
			_createJSONObject(
				new JSONObject(
				).put(
					"labels",
					new JSONArray(
					).put(
						"urgent"
					).put(
						"dxp"
					)
				).put(
					"status",
					new JSONObject(
					).put(
						"name", "Open"
					)
				).put(
					"summary", "Summary"
				)),
			jiraOrganization);

		Assertions.assertSame(
			jiraOrganization, jiraSupportIssue.getJiraOrganization());
		Assertions.assertEquals("LRP-1", jiraSupportIssue.getKey());
		Assertions.assertArrayEquals(
			new String[] {"urgent", "dxp"}, jiraSupportIssue.getLabels());
		Assertions.assertEquals("Open", jiraSupportIssue.getStatus());
		Assertions.assertEquals("Summary", jiraSupportIssue.getSummary());
		Assertions.assertEquals("", jiraSupportIssue.getTicketURL());
	}

	@Test
	public void testIsClosedMatchesOnlyClosedStatusNames() {
		for (String status : IssueConstants.statusesClosed) {
			Assertions.assertTrue(
				_createJiraSupportIssue(
					status
				).isClosed(),
				status);
		}

		Assertions.assertFalse(
			_createJiraSupportIssue(
				IssueConstants.STATUS_FLS_SOLVED
			).isClosed());
		Assertions.assertFalse(
			_createJiraSupportIssue(
				IssueConstants.STATUS_SOLUTION_PROPOSED
			).isClosed());
		Assertions.assertFalse(
			_createJiraSupportIssue(
				"Open"
			).isClosed());
	}

	@Test
	public void testMissingLabelsAndStatusYieldEmptyValues() {
		JiraSupportIssue jiraSupportIssue = new JiraSupportIssue(
			_createJSONObject(new JSONObject()));

		Assertions.assertArrayEquals(
			new String[0], jiraSupportIssue.getLabels());
		Assertions.assertEquals("", jiraSupportIssue.getStatus());
		Assertions.assertFalse(jiraSupportIssue.isClosed());
	}

	@Test
	public void testToJSONObject() {
		JiraSupportIssue jiraSupportIssue = new JiraSupportIssue(
			_createJSONObject(
				new JSONObject(
				).put(
					"status",
					new JSONObject(
					).put(
						"name", "Open"
					)
				).put(
					"summary", "Summary"
				)),
			"https://support.liferay.com/LRP-1");

		JSONObject jsonObject = jiraSupportIssue.toJSONObject();

		Assertions.assertEquals(
			"https://support.liferay.com/LRP-1", jsonObject.getString("link"));
		Assertions.assertEquals("Open", jsonObject.getString("status"));
		Assertions.assertEquals("Summary", jsonObject.getString("subject"));
		Assertions.assertEquals("LRP-1", jsonObject.getString("ticketId"));
	}

	private JSONObject _createJSONObject(JSONObject fieldsJSONObject) {
		return new JSONObject(
		).put(
			"fields", fieldsJSONObject
		).put(
			"key", "LRP-1"
		);
	}

	private JiraSupportIssue _createJiraSupportIssue(String status) {
		return new JiraSupportIssue(
			_createJSONObject(
				new JSONObject(
				).put(
					"status",
					new JSONObject(
					).put(
						"name", status
					)
				)));
	}

}