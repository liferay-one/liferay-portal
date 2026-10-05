/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-JIRABUSINESSEVENTVERSION] JiraBusinessEventVersion")
public class JiraBusinessEventVersionTest {

	@Test
	public void testToJSONObjectNestsChangeAsKeyAndNamePair() {
		JiraBusinessEventVersion jiraBusinessEventVersion =
			new JiraBusinessEventVersion(
				"author@liferay.com", "Status Changed", "Comment",
				"2026-01-02T03:04:05Z");

		JSONObject jsonObject = jiraBusinessEventVersion.toJSONObject();

		Assertions.assertEquals(
			"author@liferay.com", jsonObject.getString("author"));

		JSONObject changeJSONObject = jsonObject.getJSONObject("change");

		Assertions.assertEquals(
			"Status Changed", changeJSONObject.getString("key"));
		Assertions.assertEquals(
			"Status Changed", changeJSONObject.getString("name"));

		Assertions.assertEquals("Comment", jsonObject.getString("comment"));
		Assertions.assertEquals(
			"2026-01-02T03:04:05Z", jsonObject.getString("createdDate"));
	}

}