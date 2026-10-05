/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetSchemaService;
import com.liferay.one.jira.util.AQLUtil;

import java.util.Date;
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
@DisplayName("[CLS-BASEJIRAASSETOBJECTCONVERTER] BaseJiraAssetObjectConverter")
public class BaseJiraAssetObjectConverterTest {

	@BeforeEach
	public void setUp() {
		_jiraAssetSchemaService = Mockito.mock(JiraAssetSchemaService.class);

		Mockito.when(
			_jiraAssetSchemaService.getAttributeIds("Schema", "Type")
		).thenReturn(
			Map.of("Name", "11", "Status", "12")
		);

		Mockito.when(
			_jiraAssetSchemaService.getAttributeOptions("Schema", "Type")
		).thenReturn(
			Map.of("Status", Set.of("Active"))
		);

		Mockito.when(
			_jiraAssetSchemaService.getObjectTypeId("Schema", "Type")
		).thenReturn(
			"99"
		);

		_testConverter = _prepare(new TestConverter());
	}

	@Test
	public void testCreateJiraAssetObjectUsesSchemaAttributes() {
		JiraAssetObject jiraAssetObject =
			_testConverter.createJiraAssetObject();

		jiraAssetObject.setAttributeValue("Name", "Acme");
		jiraAssetObject.setAttributeValue("Status", "Unknown");

		Assertions.assertEquals(
			"Acme", jiraAssetObject.getAttributeValue("Name"));
		Assertions.assertEquals(
			"", jiraAssetObject.getAttributeValue("Status"));

		JSONArray attributesJSONArray = jiraAssetObject.toAttributesJSONArray();

		Assertions.assertEquals(1, attributesJSONArray.length());
		Assertions.assertEquals(
			"11",
			attributesJSONArray.getJSONObject(
				0
			).getString(
				"objectTypeAttributeId"
			));
	}

	@Test
	public void testFormatDateUsesUTCISOText() {
		Assertions.assertEquals(
			"1970-01-02T00:00:00Z",
			_testConverter.formatDate(new Date(86400000)));
		Assertions.assertNull(_testConverter.formatDate(null));
	}

	@Test
	public void testGetAQLWithBuilderAppliesOptionalConsumer() {
		String baseAQL = AQLUtil.getBaseAQL("Schema", "Type");

		Assertions.assertEquals(
			baseAQL, _testConverter.getAQLWithBuilder(null));
		Assertions.assertEquals(
			baseAQL + " AND \"Name\" = \"Acme\"",
			_testConverter.getAQLWithBuilder(
				builder -> builder.andEquals("Acme", "Name")));
	}

	@Test
	public void testGetDeletedAttributeNameThrowsUnlessOverridden() {
		UnsupportedOperationException unsupportedOperationException =
			Assertions.assertThrows(
				UnsupportedOperationException.class,
				_testConverter::getDeletedAttributeName);

		Assertions.assertEquals(
			"The object type Type does not support soft deletion",
			unsupportedOperationException.getMessage());

		TestConverter testConverter = _prepare(
			new TestConverter() {

				@Override
				public String getDeletedAttributeName() {
					return "Deleted";
				}

			});

		Assertions.assertEquals(
			"Deleted", testConverter.getDeletedAttributeName());
	}

	@Test
	public void testGetExternalAttributeNames() {
		Assertions.assertEquals(
			"External Key", _testConverter.getExternalKeyAttributeName());
		Assertions.assertEquals(
			"External Updated At",
			_testConverter.getExternalUpdatedAtAttributeName());
	}

	@Test
	public void testGetObjectTypeIdDelegatesToSchemaService() {
		Assertions.assertEquals("99", _testConverter.getObjectTypeId());
	}

	@Test
	public void testToJiraAssetObjectReadsAttributesBySchemaID() {
		JiraAssetObject jiraAssetObject = _testConverter.toJiraAssetObject(
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
								"value", "Acme"
							)
						)
					).put(
						"objectTypeAttributeId", "11"
					)
				)
			).put(
				"id", "5"
			));

		Assertions.assertEquals(
			"Acme", jiraAssetObject.getAttributeValue("Name"));
		Assertions.assertEquals("5", jiraAssetObject.getObjectId());
	}

	private <T extends BaseJiraAssetObjectConverter> T _prepare(T converter) {
		ReflectionTestUtils.setField(
			converter, "_jiraAssetSchemaService", _jiraAssetSchemaService);

		return converter;
	}

	private JiraAssetSchemaService _jiraAssetSchemaService;
	private TestConverter _testConverter;

	private static class TestConverter extends BaseJiraAssetObjectConverter {

		@Override
		public String getObjectTypeName() {
			return "Type";
		}

		@Override
		protected String getObjectSchemaName() {
			return "Schema";
		}

	}

}