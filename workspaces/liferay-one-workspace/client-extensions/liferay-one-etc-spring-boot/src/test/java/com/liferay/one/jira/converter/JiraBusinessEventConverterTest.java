/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.model.JiraBusinessEvent;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CONV-JIRABUSINESSEVENTCONVERTER] JiraBusinessEventConverter")
public class JiraBusinessEventConverterTest {

	@BeforeEach
	public void setUp() {
		_jiraBusinessEventConverter = JiraAssetObjectConverterTestUtil.prepare(
			new JiraBusinessEventConverter());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject =
			_jiraBusinessEventConverter.toAssetObject(
				"ACCOUNT-1", _createJiraBusinessEvent());

		_assertAttributeValue(
			"ACCOUNT-1", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ACCOUNT);
		_assertAttributeValue(
			"2026-03-01", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE);
		_assertAttributeValue(
			"LRP-1", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS);
		_assertAttributeValue(
			"author@liferay.com", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR);
		_assertAttributeValue(
			"CURRENT-KEY", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION);
		_assertAttributeValue(
			"Description", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_DESCRIPTION);
		_assertAttributeValue(
			"Planned", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_STATUS);
		_assertAttributeValue(
			"Upgrade", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE);
		_assertAttributeValue(
			"Last Comment", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_COMMENT);
		_assertAttributeValue(
			"updater@liferay.com", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR);
		_assertAttributeValue(
			"Event", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_NAME);
		_assertAttributeValue(
			"NEW-KEY", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION);
		_assertAttributeValue(
			"2026-02-01", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE);
		_assertAttributeValue(
			"UTC", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE);
	}

	@Test
	public void testToAssetObjectWithoutAccountObjectKeySkipsAccountAndAuthor() {
		JiraAssetObject jiraAssetObject =
			_jiraBusinessEventConverter.toAssetObject(
				null, _createJiraBusinessEvent());

		_assertAttributeValue(
			"", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ACCOUNT);
		_assertAttributeValue(
			"", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR);
		_assertAttributeValue(
			"Event", jiraAssetObject,
			JiraBusinessEventConstants.ATTRIBUTE_NAME_NAME);
	}

	@Test
	public void testToJiraBusinessEventFromAssetObjectJSONObject() {
		JiraBusinessEvent jiraBusinessEvent =
			_jiraBusinessEventConverter.toJiraBusinessEvent(
				new JSONObject(
				).put(
					"attributes",
					new JSONArray(
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.
								ATTRIBUTE_NAME_ACTUAL_EVENT_DATE,
							"2026-03-01", "Mar 1, 2026")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.
								ATTRIBUTE_NAME_ASSOCIATED_TICKETS,
							"LRP-1", "LRP-1 Ticket")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR,
							"1", "author@liferay.com")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.
								ATTRIBUTE_NAME_CURRENT_VERSION,
							"CURRENT-KEY", "DXP 7.4")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.
								ATTRIBUTE_NAME_NEW_VERSION,
							"NEW-KEY", "DXP 2026.Q1")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.
								ATTRIBUTE_NAME_PLANNED_EVENT_DATE,
							"2026-02-01", "Feb 1, 2026")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE,
							"5", "UTC")
					)
				).put(
					"id", "99"
				),
				"PROJECT_ERC");

		Assertions.assertEquals(
			"2026-03-01", jiraBusinessEvent.getActualEventDate());
		Assertions.assertEquals(
			"LRP-1 Ticket", jiraBusinessEvent.getAssociatedTickets());
		Assertions.assertEquals(
			"author@liferay.com", jiraBusinessEvent.getAuthorEmailAddress());
		Assertions.assertEquals("99", jiraBusinessEvent.getBusinessEventId());
		Assertions.assertEquals(
			"CURRENT-KEY", jiraBusinessEvent.getCurrentLiferayVersionKey());
		Assertions.assertEquals(
			"DXP 7.4", jiraBusinessEvent.getCurrentLiferayVersionName());
		Assertions.assertEquals(
			"NEW-KEY", jiraBusinessEvent.getNewLiferayVersionKey());
		Assertions.assertEquals(
			"DXP 2026.Q1", jiraBusinessEvent.getNewLiferayVersionName());
		Assertions.assertEquals(
			"2026-02-01", jiraBusinessEvent.getPlannedEventDate());
		Assertions.assertEquals(
			"PROJECT_ERC", jiraBusinessEvent.getProjectExternalReferenceCode());
		Assertions.assertEquals("UTC", jiraBusinessEvent.getTimeZoneName());
	}

	@Test
	public void testToJiraBusinessEventFromAttributesJSON() {
		JiraBusinessEvent jiraBusinessEvent =
			_jiraBusinessEventConverter.toJiraBusinessEvent(
				new JSONObject(
				).put(
					"actualEventDate", "2026-03-01"
				).put(
					"currentLiferayVersion", "CURRENT-KEY"
				).put(
					"eventStatus", "Planned"
				).put(
					"name", "Event"
				).put(
					"newLiferayVersion", "NEW-KEY"
				).put(
					"timeZone", "UTC"
				).toString(),
				"author@liferay.com", "PROJECT_ERC");

		Assertions.assertEquals(
			"2026-03-01", jiraBusinessEvent.getActualEventDate());
		Assertions.assertEquals("", jiraBusinessEvent.getAssociatedTickets());
		Assertions.assertEquals(
			"author@liferay.com", jiraBusinessEvent.getAuthorEmailAddress());
		Assertions.assertEquals("", jiraBusinessEvent.getBusinessEventId());
		Assertions.assertEquals(
			"CURRENT-KEY", jiraBusinessEvent.getCurrentLiferayVersionKey());
		Assertions.assertEquals(
			"", jiraBusinessEvent.getCurrentLiferayVersionName());
		Assertions.assertEquals(
			"Planned", jiraBusinessEvent.getEventStatusName());
		Assertions.assertEquals(
			"author@liferay.com",
			jiraBusinessEvent.getLastUpdatedAuthorEmailAddress());
		Assertions.assertEquals("Event", jiraBusinessEvent.getName());
		Assertions.assertEquals(
			"NEW-KEY", jiraBusinessEvent.getNewLiferayVersionKey());
		Assertions.assertEquals(
			"", jiraBusinessEvent.getNewLiferayVersionName());
		Assertions.assertEquals(
			"PROJECT_ERC", jiraBusinessEvent.getProjectExternalReferenceCode());
		Assertions.assertEquals("UTC", jiraBusinessEvent.getTimeZoneName());
	}

	private void _assertAttributeValue(
		String expected, JiraAssetObject jiraAssetObject,
		String attributeName) {

		Assertions.assertEquals(
			expected, jiraAssetObject.getAttributeValue(attributeName),
			attributeName);
	}

	private JSONObject _createAttributeJSONObject(
		String attributeName, String value, String displayValue) {

		return new JSONObject(
		).put(
			"objectAttributeValues",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"displayValue", displayValue
				).put(
					"value", value
				)
			)
		).put(
			"objectTypeAttributeId", attributeName
		);
	}

	private JiraBusinessEvent _createJiraBusinessEvent() {
		return new JiraBusinessEvent(
			"2026-03-01", "LRP-1", "author@liferay.com", "99", "CURRENT-KEY",
			"DXP 7.4", "Description", "Planned", "Upgrade", "Last Comment",
			"updater@liferay.com", "Event", "NEW-KEY", "DXP 2026.Q1",
			"2026-02-01", "PROJECT_ERC", "UTC");
	}

	private JiraBusinessEventConverter _jiraBusinessEventConverter;

}