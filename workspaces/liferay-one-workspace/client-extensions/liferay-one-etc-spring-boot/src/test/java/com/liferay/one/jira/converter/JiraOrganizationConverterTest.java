/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.AccountConstants;
import com.liferay.one.jira.model.JiraOrganization;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CONV-JIRAORGANIZATIONCONVERTER] JiraOrganizationConverter")
public class JiraOrganizationConverterTest {

	@BeforeEach
	public void setUp() {
		_jiraOrganizationConverter = JiraAssetObjectConverterTestUtil.prepare(
			new JiraOrganizationConverter());
	}

	@Test
	public void testGetObjectTypeName() {
		Assertions.assertEquals(
			AccountConstants.OBJECT_TYPE_NAME,
			_jiraOrganizationConverter.getObjectTypeName());
	}

	@Test
	public void testToJiraOrganizationMapsExternalKeyIDAndName() {
		JiraOrganization jiraOrganization =
			_jiraOrganizationConverter.toJiraOrganization(
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
									"value", "ACCOUNT_ERC"
								)
							)
						).put(
							"objectTypeAttributeId",
							AccountConstants.ATTRIBUTE_NAME_EXTERNAL_KEY
						)
					)
				).put(
					"id", "42"
				).put(
					"name", "Acme"
				));

		Assertions.assertEquals(
			"ACCOUNT_ERC", jiraOrganization.getExternalKey());
		Assertions.assertEquals("42", jiraOrganization.getId());
		Assertions.assertEquals("Acme", jiraOrganization.getName());
	}

	@Test
	public void testToJiraOrganizationWithoutAttributesHasBlankExternalKey() {
		JiraOrganization jiraOrganization =
			_jiraOrganizationConverter.toJiraOrganization(
				new JSONObject(
				).put(
					"id", "42"
				).put(
					"name", "Acme"
				));

		Assertions.assertEquals("", jiraOrganization.getExternalKey());
	}

	private JiraOrganizationConverter _jiraOrganizationConverter;

}