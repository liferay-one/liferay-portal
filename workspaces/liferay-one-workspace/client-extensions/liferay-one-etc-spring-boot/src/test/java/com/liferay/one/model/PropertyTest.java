/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-PROPERTY] Property")
public class PropertyTest {

	@Test
	public void testFieldsReadFromJSON() {
		Property property = new Property(
			new JSONObject(
			).put(
				"className", "com.liferay.account.model.AccountEntry"
			).put(
				"classNameId", 11L
			).put(
				"classPK", 12L
			).put(
				"externalReferenceCode", "PROPERTY_ERC"
			).put(
				"id", 13L
			).put(
				"name", "salesforce:Account"
			).put(
				"r_accountEntryToProperty_accountEntryId", 14L
			).put(
				"value", "0011234"
			));

		Assertions.assertEquals(14L, property.getAccountEntryId());
		Assertions.assertEquals(
			"com.liferay.account.model.AccountEntry", property.getClassName());
		Assertions.assertEquals(11L, property.getClassNameId());
		Assertions.assertEquals(12L, property.getClassPK());
		Assertions.assertEquals(
			"PROPERTY_ERC", property.getExternalReferenceCode());
		Assertions.assertEquals("salesforce:Account", property.getName());
		Assertions.assertEquals(13L, property.getPropertyId());
		Assertions.assertEquals("0011234", property.getValue());
	}

	@Test
	public void testMetadataJSONObjectIsEmptyWhenBlank() {
		Assertions.assertTrue(
			_createProperty(
				""
			).getMetadataJSONObject(
			).isEmpty());
		Assertions.assertTrue(
			new Property(
				new JSONObject(
				).put(
					"id", 1L
				)
			).getMetadataJSONObject(
			).isEmpty());
	}

	@Test
	public void testMetadataJSONObjectParsesValidMetadata() {
		JSONObject metadataJSONObject = _createProperty(
			"{\"source\": \"salesforce\"}"
		).getMetadataJSONObject();

		Assertions.assertEquals(
			"salesforce", metadataJSONObject.getString("source"));
	}

	private Property _createProperty(String metadataJSON) {
		return new Property(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"metadataJson", metadataJSON
			));
	}

}