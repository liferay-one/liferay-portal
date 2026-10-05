/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.ExternalLinkConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.model.Property;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CONV-EXTERNALLINKCONVERTER] ExternalLinkConverter")
public class ExternalLinkConverterTest {

	@BeforeEach
	public void setUp() {
		_externalLinkConverter = JiraAssetObjectConverterTestUtil.prepare(
			new ExternalLinkConverter());
	}

	@Test
	public void testIsExternalLinkPropertyRequiresDomainAndEntityName() {
		Assertions.assertTrue(
			_externalLinkConverter.isExternalLinkProperty(
				_createProperty("salesforce:Account")));
		Assertions.assertFalse(
			_externalLinkConverter.isExternalLinkProperty(
				_createProperty("salesforce")));
		Assertions.assertFalse(
			_externalLinkConverter.isExternalLinkProperty(
				_createProperty("salesforce:Account:Id")));
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject = _externalLinkConverter.toAssetObject(
			_createProperty("salesforce:Account"));

		Assertions.assertEquals(
			"salesforce",
			jiraAssetObject.getAttributeValue(
				ExternalLinkConstants.ATTRIBUTE_NAME_DOMAIN));
		Assertions.assertEquals(
			"0011234",
			jiraAssetObject.getAttributeValue(
				ExternalLinkConstants.ATTRIBUTE_NAME_ENTITY_ID));
		Assertions.assertEquals(
			"Account",
			jiraAssetObject.getAttributeValue(
				ExternalLinkConstants.ATTRIBUTE_NAME_ENTITY_NAME));
		Assertions.assertEquals(
			"PROPERTY_ERC",
			jiraAssetObject.getAttributeValue(
				ExternalLinkConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"com.liferay.account.model.AccountEntry",
			jiraAssetObject.getAttributeValue(
				ExternalLinkConstants.ATTRIBUTE_NAME_NAME));
	}

	@Test
	public void testToAssetObjectReturnsNullForNonexternalLinkProperty() {
		Assertions.assertNull(
			_externalLinkConverter.toAssetObject(_createProperty("tier")));
	}

	private Property _createProperty(String name) {
		return new Property(
			new JSONObject(
			).put(
				"className", "com.liferay.account.model.AccountEntry"
			).put(
				"externalReferenceCode", "PROPERTY_ERC"
			).put(
				"id", 1L
			).put(
				"name", name
			).put(
				"value", "0011234"
			));
	}

	private ExternalLinkConverter _externalLinkConverter;

}