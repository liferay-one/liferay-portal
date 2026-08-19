/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.TeamRoleConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class TeamRoleConverterTest {

	@BeforeEach
	public void setUp() {
		_teamRoleConverter = JiraAssetObjectConverterTestUtil.prepare(
			new TeamRoleConverter());
	}

	@Test
	public void testToFirstLineSupportAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject =
			_teamRoleConverter.toFirstLineSupportAssetObject();

		Assertions.assertEquals(
			TeamRoleConstants.EXTERNAL_KEY_FIRST_LINE_SUPPORT,
			jiraAssetObject.getAttributeValue(
				TeamRoleConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			TeamRoleConstants.NAME_FIRST_LINE_SUPPORT,
			jiraAssetObject.getAttributeValue(
				TeamRoleConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"Account",
			jiraAssetObject.getAttributeValue(
				TeamRoleConstants.ATTRIBUTE_NAME_TYPE));
	}

	private TeamRoleConverter _teamRoleConverter;

}