/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.util;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-SALESFORCECSVUTIL] SalesforceCSVUtil")
public class SalesforceCSVUtilTest {

	@Test
	public void testToJSONObjectsWhenCSVHasOnlyAHeader() {
		Assertions.assertTrue(
			SalesforceCSVUtil.toJSONObjects(
				"\"Id\",\"Name\"\n"
			).isEmpty());
	}

	@Test
	public void testToJSONObjectsWhenCSVIsBlank() {
		Assertions.assertTrue(
			SalesforceCSVUtil.toJSONObjects(
				""
			).isEmpty());
		Assertions.assertTrue(
			SalesforceCSVUtil.toJSONObjects(
				null
			).isEmpty());
	}

	@Test
	public void testToJSONObjectsWhenLastRowHasNoLineBreakAndFewerValues() {
		List<JSONObject> jsonObjects = SalesforceCSVUtil.toJSONObjects(
			"Id,Name,Owner.Email\n003,Gamma");

		Assertions.assertEquals(1, jsonObjects.size());

		JSONObject jsonObject = jsonObjects.get(0);

		Assertions.assertEquals("003", jsonObject.getString("Id"));
		Assertions.assertEquals("Gamma", jsonObject.getString("Name"));
		Assertions.assertFalse(jsonObject.has("Owner.Email"));
	}

	@Test
	public void testToJSONObjectsWhenLastValueIsQuotedAndEmpty() {
		List<JSONObject> jsonObjects = SalesforceCSVUtil.toJSONObjects(
			"\"Id\"\n\"\"");

		Assertions.assertEquals(1, jsonObjects.size());

		Assertions.assertTrue(
			jsonObjects.get(
				0
			).isEmpty());
	}

	@Test
	public void testToJSONObjectsWhenUnquotedValueHasAQuote() {
		List<JSONObject> jsonObjects = SalesforceCSVUtil.toJSONObjects(
			"Id,Name\n001,5\" Pipe\n002,Beta");

		Assertions.assertEquals(2, jsonObjects.size());

		Assertions.assertEquals(
			"5\" Pipe",
			jsonObjects.get(
				0
			).getString(
				"Name"
			));
		Assertions.assertEquals(
			"Beta",
			jsonObjects.get(
				1
			).getString(
				"Name"
			));
	}

	@Test
	public void testToJSONObjectsWhenValuesAreQuoted() {
		List<JSONObject> jsonObjects = SalesforceCSVUtil.toJSONObjects(
			"\"Id\",\"Name\",\"Description\"\r\n\"001\",\"Acme, Inc.\"," +
				"\"Says \"\"hi\"\"\nand bye\"\r\n\"002\",\"Beta\",\"\"\r\n");

		Assertions.assertEquals(2, jsonObjects.size());

		JSONObject jsonObject = jsonObjects.get(0);

		Assertions.assertEquals(
			"Says \"hi\"\nand bye", jsonObject.getString("Description"));
		Assertions.assertEquals("001", jsonObject.getString("Id"));
		Assertions.assertEquals("Acme, Inc.", jsonObject.getString("Name"));

		jsonObject = jsonObjects.get(1);

		Assertions.assertFalse(jsonObject.has("Description"));
		Assertions.assertEquals("002", jsonObject.getString("Id"));
		Assertions.assertEquals("Beta", jsonObject.getString("Name"));
	}

}