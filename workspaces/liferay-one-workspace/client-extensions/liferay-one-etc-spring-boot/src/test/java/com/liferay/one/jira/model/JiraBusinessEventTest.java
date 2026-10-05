/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRABUSINESSEVENT] JiraBusinessEvent")
public class JiraBusinessEventTest {

	@Test
	public void testGetURLsAssembleFromProjectERCAndEventID() {
		JiraBusinessEvent jiraBusinessEvent = _createJiraBusinessEvent();

		Assertions.assertEquals(
			"https://one.liferay.com/support/business-events/#/PROJECT_ERC" +
				"/business-events/99/activity-history",
			jiraBusinessEvent.getActivityHistoryURL(_ONE_PORTAL_URL));
		Assertions.assertEquals(
			"https://one.liferay.com/support/business-events/#/PROJECT_ERC" +
				"/business-events/99/edit",
			jiraBusinessEvent.getEditURL(_ONE_PORTAL_URL));
		Assertions.assertEquals(
			"https://one.liferay.com/support/business-events/#/PROJECT_ERC" +
				"/business-events/99",
			jiraBusinessEvent.getURL(_ONE_PORTAL_URL));
	}

	@Test
	public void testToJSONObjectNestsKeyAndNamePairs() {
		JSONObject jsonObject = _createJiraBusinessEvent().toJSONObject();

		Assertions.assertEquals(
			"2026-03-01", jsonObject.getString("actualEventDate"));
		Assertions.assertEquals(
			"LRP-1", jsonObject.getString("associatedTickets"));
		_assertKeyAndName(
			"CURRENT-KEY", "DXP 7.4",
			jsonObject.getJSONObject("currentLiferayVersion"));
		Assertions.assertEquals(
			"Description", jsonObject.getString("description"));
		_assertKeyAndName(
			"Planned", "Planned", jsonObject.getJSONObject("eventStatus"));
		_assertKeyAndName(
			"Upgrade", "Upgrade", jsonObject.getJSONObject("eventType"));
		Assertions.assertEquals("99", jsonObject.getString("id"));
		Assertions.assertEquals("Event", jsonObject.getString("name"));
		_assertKeyAndName(
			"NEW-KEY", "DXP 2026.Q1",
			jsonObject.getJSONObject("newLiferayVersion"));
		Assertions.assertEquals(
			"2026-02-01", jsonObject.getString("plannedEventDate"));
		_assertKeyAndName("UTC", "UTC", jsonObject.getJSONObject("timeZone"));
	}

	private void _assertKeyAndName(
		String key, String name, JSONObject jsonObject) {

		Assertions.assertEquals(key, jsonObject.getString("key"));
		Assertions.assertEquals(name, jsonObject.getString("name"));
	}

	private JiraBusinessEvent _createJiraBusinessEvent() {
		return new JiraBusinessEvent(
			"2026-03-01", "LRP-1", "author@liferay.com", "99", "CURRENT-KEY",
			"DXP 7.4", "Description", "Planned", "Upgrade", "Last Comment",
			"updater@liferay.com", "Event", "NEW-KEY", "DXP 2026.Q1",
			"2026-02-01", "PROJECT_ERC", "UTC");
	}

	private static final String _ONE_PORTAL_URL = "https://one.liferay.com";

}