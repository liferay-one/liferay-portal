/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.model.JiraBusinessEventVersion;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CONV-JIRABUSINESSEVENTVERSIONCONVERTER] JiraBusinessEventVersionConverter"
)
public class JiraBusinessEventVersionConverterTest {

	@BeforeEach
	public void setUp() {
		_jiraBusinessEventVersionConverter =
			JiraAssetObjectConverterTestUtil.prepare(
				new JiraBusinessEventVersionConverter());
	}

	@Test
	public void testGetObjectTypeName() {
		Assertions.assertEquals(
			JiraBusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT_VERSION,
			_jiraBusinessEventVersionConverter.getObjectTypeName());
	}

	@Test
	public void testToJiraBusinessEventVersionFallsBackToReferencedObjectID() {
		JiraBusinessEventVersion jiraBusinessEventVersion =
			_jiraBusinessEventVersionConverter.toJiraBusinessEventVersion(
				new JSONObject(
				).put(
					"attributes",
					new JSONArray(
					).put(
						new JSONObject(
						).put(
							"objectAttributeValues",
							new JSONArray(
							).put(
								new JSONObject(
								).put(
									"referencedObject",
									new JSONObject(
									).put(
										"id", "77"
									)
								)
							)
						).put(
							"objectTypeAttributeId",
							JiraBusinessEventConstants.ATTRIBUTE_NAME_CHANGE
						)
					)
				));

		Assertions.assertEquals(
			"", jiraBusinessEventVersion.getAuthorEmailAddress());
		Assertions.assertEquals("77", jiraBusinessEventVersion.getChangeName());
		Assertions.assertEquals("", jiraBusinessEventVersion.getComment());
		Assertions.assertEquals("", jiraBusinessEventVersion.getCreatedDate());
	}

	@Test
	public void testToJiraBusinessEventVersionMapsDisplayValues() {
		JiraBusinessEventVersion jiraBusinessEventVersion =
			_jiraBusinessEventVersionConverter.toJiraBusinessEventVersion(
				new JSONObject(
				).put(
					"attributes",
					new JSONArray(
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR,
							"author@liferay.com", "Author Name")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_CHANGE,
							"10", "Status Changed")
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_COMMENT,
							"Comment", null)
					).put(
						_createAttributeJSONObject(
							JiraBusinessEventConstants.ATTRIBUTE_NAME_CREATED,
							"2026-01-02T03:04:05Z", "Jan 2, 2026")
					)
				));

		Assertions.assertEquals(
			"Author Name", jiraBusinessEventVersion.getAuthorEmailAddress());
		Assertions.assertEquals(
			"Status Changed", jiraBusinessEventVersion.getChangeName());
		Assertions.assertEquals(
			"Comment", jiraBusinessEventVersion.getComment());
		Assertions.assertEquals(
			"2026-01-02T03:04:05Z", jiraBusinessEventVersion.getCreatedDate());
	}

	private JSONObject _createAttributeJSONObject(
		String attributeName, String value, String displayValue) {

		JSONObject valueJSONObject = new JSONObject(
		).put(
			"value", value
		);

		if (displayValue != null) {
			valueJSONObject.put("displayValue", displayValue);
		}

		return new JSONObject(
		).put(
			"objectAttributeValues",
			new JSONArray(
			).put(
				valueJSONObject
			)
		).put(
			"objectTypeAttributeId", attributeName
		);
	}

	private JiraBusinessEventVersionConverter
		_jiraBusinessEventVersionConverter;

}