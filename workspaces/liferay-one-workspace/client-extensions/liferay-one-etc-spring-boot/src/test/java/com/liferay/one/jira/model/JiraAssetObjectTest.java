/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.model;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRAASSETOBJECT] JiraAssetObject")
public class JiraAssetObjectTest {

	@Test
	public void testGetAttributeDisplayValueFallsBackToReferencedObjectID() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject(
			new JSONObject(
			).put(
				"attributes",
				new JSONArray(
				).put(
					_createAttributeJSONObject(
						"1",
						new JSONObject(
						).put(
							"displayValue", "Acme Display"
						).put(
							"value", "Acme"
						))
				).put(
					_createAttributeJSONObject(
						"3",
						new JSONObject(
						).put(
							"referencedObject",
							new JSONObject(
							).put(
								"id", "77"
							)
						))
				).put(
					new JSONObject(
					).put(
						"objectAttributeValues", new JSONArray()
					).put(
						"objectTypeAttributeId", "2"
					)
				)
			));

		Assertions.assertEquals(
			"Acme Display", jiraAssetObject.getAttributeDisplayValue("Name"));
		Assertions.assertEquals(
			"Acme", jiraAssetObject.getAttributeValue("Name"));
		Assertions.assertEquals(
			"77", jiraAssetObject.getAttributeDisplayValue("Account"));
		Assertions.assertEquals(
			"77", jiraAssetObject.getAttributeValue("Account"));
		Assertions.assertEquals(
			"", jiraAssetObject.getAttributeDisplayValue("Status"));
		Assertions.assertEquals(
			"", jiraAssetObject.getAttributeValue("Unmapped"));
	}

	@Test
	public void testGetObjectFieldsReadTopLevelValues() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject(
			new JSONObject(
			).put(
				"id", "5"
			).put(
				"name", "Acme"
			).put(
				"objectKey", "CUS-5"
			));

		Assertions.assertEquals("5", jiraAssetObject.getObjectId());
		Assertions.assertEquals("CUS-5", jiraAssetObject.getObjectKey());
		Assertions.assertEquals("Acme", jiraAssetObject.getObjectName());
	}

	@Test
	public void testSetAttributeValueDropsValuesOutsideSchemaOptions() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject();

		jiraAssetObject.setAttributeValue("Status", "Unknown");

		Assertions.assertEquals(
			"", jiraAssetObject.getAttributeValue("Status"));

		jiraAssetObject.setAttributeValue("Status", "Active");

		Assertions.assertEquals(
			"Active", jiraAssetObject.getAttributeValue("Status"));
	}

	@Test
	public void testSetAttributeValueFiltersCollectionsToValidOptions() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			"Status", List.of("Active", "Unknown", "Inactive"));

		Assertions.assertEquals(
			"[Active, Inactive]", jiraAssetObject.getAttributeValue("Status"));
	}

	@Test
	public void testSetAttributeValueIgnoresUnmappedNamesAndNullValues() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject();

		jiraAssetObject.setAttributeValue("Name", null);
		jiraAssetObject.setAttributeValue("Unmapped", "value");

		JSONArray attributesJSONArray = jiraAssetObject.toAttributesJSONArray();

		Assertions.assertTrue(attributesJSONArray.isEmpty());

		Assertions.assertEquals(
			"", jiraAssetObject.getAttributeValue("Unmapped"));
	}

	@Test
	public void testToAttributesJSONArraySkipsNullEntries() {
		JiraAssetObject jiraAssetObject = _createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			"Account", Arrays.asList("A", null, ""));
		jiraAssetObject.setAttributeValue("Name", "Acme");
		jiraAssetObject.setAttributeValue("Status", "");

		JSONArray attributesJSONArray = jiraAssetObject.toAttributesJSONArray();

		Assertions.assertEquals(3, attributesJSONArray.length());

		JSONObject accountJSONObject = attributesJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"3", accountJSONObject.getString("objectTypeAttributeId"));

		JSONArray accountValuesJSONArray = accountJSONObject.getJSONArray(
			"objectAttributeValues");

		Assertions.assertEquals(1, accountValuesJSONArray.length());
		Assertions.assertEquals(
			"A",
			accountValuesJSONArray.getJSONObject(
				0
			).getString(
				"value"
			));

		JSONObject nameJSONObject = attributesJSONArray.getJSONObject(1);

		Assertions.assertEquals(
			"Acme",
			nameJSONObject.getJSONArray(
				"objectAttributeValues"
			).getJSONObject(
				0
			).getString(
				"value"
			));

		JSONObject statusJSONObject = attributesJSONArray.getJSONObject(2);

		Assertions.assertEquals(
			"2", statusJSONObject.getString("objectTypeAttributeId"));
		Assertions.assertTrue(
			statusJSONObject.getJSONArray(
				"objectAttributeValues"
			).isEmpty());
	}

	private JSONObject _createAttributeJSONObject(
		String attributeId, JSONObject valueJSONObject) {

		return new JSONObject(
		).put(
			"objectAttributeValues",
			new JSONArray(
			).put(
				valueJSONObject
			)
		).put(
			"objectTypeAttributeId", attributeId
		);
	}

	private JiraAssetObject _createJiraAssetObject() {
		return _createJiraAssetObject(new JSONObject());
	}

	private JiraAssetObject _createJiraAssetObject(JSONObject jsonObject) {
		return new JiraAssetObject(
			jsonObject, Map.of("Account", "3", "Name", "1", "Status", "2"),
			Map.of("Status", Set.of("Active", "Inactive")));
	}

}