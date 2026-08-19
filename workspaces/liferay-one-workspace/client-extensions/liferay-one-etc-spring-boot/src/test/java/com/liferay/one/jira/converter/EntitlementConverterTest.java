/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.EntitlementConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.model.EntitlementDefinition;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class EntitlementConverterTest {

	@BeforeEach
	public void setUp() {
		_entitlementConverter = JiraAssetObjectConverterTestUtil.prepare(
			new EntitlementConverter());
	}

	@Test
	public void testGetExternalKeyAttributeNameIsName() {
		Assertions.assertEquals(
			EntitlementConstants.ATTRIBUTE_NAME_NAME,
			_entitlementConverter.getExternalKeyAttributeName());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		EntitlementDefinition entitlementDefinition = new EntitlementDefinition(
			new JSONObject(
			).put(
				"displayName", "Test Entitlement"
			).put(
				"externalReferenceCode", "test-erc"
			).put(
				"id", 12345L
			));

		JiraAssetObject jiraAssetObject = _entitlementConverter.toAssetObject(
			entitlementDefinition);

		Assertions.assertEquals(
			"test-erc",
			jiraAssetObject.getAttributeValue(
				EntitlementConstants.
					ATTRIBUTE_NAME_ENTITLEMENT_DEFINITION_KEY));
		Assertions.assertEquals(
			"Test Entitlement",
			jiraAssetObject.getAttributeValue(
				EntitlementConstants.ATTRIBUTE_NAME_NAME));
	}

	private EntitlementConverter _entitlementConverter;

}