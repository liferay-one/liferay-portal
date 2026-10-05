/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.exception.JiraAssetSchemaException;
import com.liferay.portal.kernel.util.LinkedHashMapBuilder;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRAASSETSCHEMALOADER] JiraAssetSchemaLoader")
public class JiraAssetSchemaLoaderTest {

	@BeforeEach
	public void setUp() {
		_jiraAssetPersistence = Mockito.mock(JiraAssetPersistence.class);

		_jiraAssetSchemaLoader = new JiraAssetSchemaLoader();

		ReflectionTestUtils.setField(
			_jiraAssetSchemaLoader, "_jiraAssetPersistence",
			_jiraAssetPersistence);

		Mockito.when(
			_jiraAssetPersistence.getObjectTypeAttributes("10")
		).thenReturn(
			new JSONArray(
			).put(
				_createJSONObject("1", "Name", null)
			).put(
				_createJSONObject("2", "Status", " Active , Inactive,Pending ")
			).put(
				_createJSONObject("", "Missing ID", "A")
			).put(
				_createJSONObject("4", "", "B")
			).put(
				_createJSONObject("5", "Type", "")
			)
		);
	}

	@Test
	public void testGetAttributeIdsSkipsEntriesMissingNameOrID() {
		Assertions.assertEquals(
			LinkedHashMapBuilder.put(
				"Name", "1"
			).put(
				"Status", "2"
			).put(
				"Type", "5"
			).build(),
			_jiraAssetSchemaLoader.getAttributeIds("10"));
	}

	@Test
	public void testGetAttributeOptionsSplitsOnCommasAndTrims() {
		Map<String, Set<String>> attributeOptions =
			_jiraAssetSchemaLoader.getAttributeOptions("10");

		Assertions.assertEquals(
			Set.of("Missing ID", "Status"), attributeOptions.keySet());
		Assertions.assertEquals(
			new LinkedHashSet<>(List.of("Active", "Inactive", "Pending")),
			attributeOptions.get("Status"));
	}

	@Test
	public void testGetObjectTypeIdsResolvesSchemaByName() {
		Mockito.when(
			_jiraAssetPersistence.getObjectSchemas()
		).thenReturn(
			new JSONArray(
			).put(
				_createJSONObject("100", "Other", null)
			).put(
				_createJSONObject("200", "Customer Data", null)
			)
		);

		Mockito.when(
			_jiraAssetPersistence.getObjectTypes("200")
		).thenReturn(
			new JSONArray(
			).put(
				_createJSONObject("300", "Account", null)
			).put(
				_createJSONObject("", "Contact", null)
			)
		);

		Assertions.assertEquals(
			Map.of("Account", "300"),
			_jiraAssetSchemaLoader.getObjectTypeIds("Customer Data"));
	}

	@Test
	public void testGetObjectTypeIdsThrowsForUnknownSchemaName() {
		Mockito.when(
			_jiraAssetPersistence.getObjectSchemas()
		).thenReturn(
			new JSONArray(
			).put(
				_createJSONObject("100", "Other", null)
			)
		);

		JiraAssetSchemaException jiraAssetSchemaException =
			Assertions.assertThrows(
				JiraAssetSchemaException.class,
				() -> _jiraAssetSchemaLoader.getObjectTypeIds("Missing"));

		Assertions.assertEquals(
			"Object schema \"Missing\" not found",
			jiraAssetSchemaException.getMessage());
	}

	private JSONObject _createJSONObject(
		String id, String name, String options) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", id
		).put(
			"name", name
		);

		if (options != null) {
			jsonObject.put("options", options);
		}

		return jsonObject;
	}

	private JiraAssetPersistence _jiraAssetPersistence;
	private JiraAssetSchemaLoader _jiraAssetSchemaLoader;

}