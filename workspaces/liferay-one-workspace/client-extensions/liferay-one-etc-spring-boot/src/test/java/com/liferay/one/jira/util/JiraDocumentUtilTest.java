/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.util;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRADOCUMENTUTIL] JiraDocumentUtil")
public class JiraDocumentUtilTest {

	@Test
	public void testCreateCodeBlock() {
		JSONObject jsonObject = JiraDocumentUtil.createCodeBlock("code");

		Assertions.assertEquals("codeBlock", jsonObject.getString("type"));

		JSONObject textJSONObject = _getTextJSONObject(jsonObject);

		Assertions.assertEquals("code", textJSONObject.getString("text"));
		Assertions.assertEquals("text", textJSONObject.getString("type"));
	}

	@Test
	public void testCreateHorizontalRule() {
		JSONObject jsonObject = JiraDocumentUtil.createHorizontalRule();

		Assertions.assertEquals("rule", jsonObject.getString("type"));
		Assertions.assertEquals(1, jsonObject.length());
	}

	@Test
	public void testCreateLinkParagraphAddsHrefMark() {
		JSONObject jsonObject = JiraDocumentUtil.createLinkParagraph(
			"Liferay", "https://liferay.com");

		Assertions.assertEquals("paragraph", jsonObject.getString("type"));

		JSONObject textJSONObject = _getTextJSONObject(jsonObject);

		Assertions.assertEquals("Liferay", textJSONObject.getString("text"));

		JSONArray marksJSONArray = textJSONObject.getJSONArray("marks");

		JSONObject markJSONObject = marksJSONArray.getJSONObject(0);

		Assertions.assertEquals("link", markJSONObject.getString("type"));

		JSONObject attrsJSONObject = markJSONObject.getJSONObject("attrs");

		Assertions.assertEquals(
			"https://liferay.com", attrsJSONObject.getString("href"));
	}

	@Test
	public void testCreateParagraphAddsStrongMarkOnlyWhenBold() {
		JSONObject textJSONObject = _getTextJSONObject(
			JiraDocumentUtil.createParagraph("Bold", true));

		JSONArray marksJSONArray = textJSONObject.getJSONArray("marks");

		Assertions.assertEquals(1, marksJSONArray.length());
		Assertions.assertEquals(
			"strong",
			marksJSONArray.getJSONObject(
				0
			).getString(
				"type"
			));

		JSONObject jsonObject = JiraDocumentUtil.createParagraph(
			"Plain", false);

		Assertions.assertEquals("paragraph", jsonObject.getString("type"));

		textJSONObject = _getTextJSONObject(jsonObject);

		Assertions.assertEquals("Plain", textJSONObject.getString("text"));
		Assertions.assertFalse(textJSONObject.has("marks"));
	}

	private JSONObject _getTextJSONObject(JSONObject jsonObject) {
		JSONArray contentJSONArray = jsonObject.getJSONArray("content");

		return contentJSONArray.getJSONObject(0);
	}

}