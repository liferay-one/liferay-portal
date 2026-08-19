/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.TeamContactRoleAssignmentConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class TeamContactRoleAssignmentConverterTest {

	@BeforeEach
	public void setUp() {
		_teamContactRoleAssignmentConverter =
			JiraAssetObjectConverterTestUtil.prepare(
				new TeamContactRoleAssignmentConverter());
	}

	@Test
	public void testGetDeletedAttributeNameIsDeleted() {
		Assertions.assertEquals(
			TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED,
			_teamContactRoleAssignmentConverter.getDeletedAttributeName());
	}

	@Test
	public void testGetExternalKeyAttributeNameIsName() {
		Assertions.assertEquals(
			TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_NAME,
			_teamContactRoleAssignmentConverter.getExternalKeyAttributeName());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject =
			_teamContactRoleAssignmentConverter.toAssetObject(
				"contact-role-erc", "contact-erc", "team-erc", false,
				new Date(0));

		Assertions.assertEquals(
			"contact-erc",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY));
		Assertions.assertEquals(
			"contact-role-erc",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_ROLE_EXTERNAL_KEY));
		Assertions.assertEquals(
			"false",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"contact-role-erc;contact-erc;team-erc",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"team-erc",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY));
	}

	@Test
	public void testToAssetObjectMapsDeleted() {
		JiraAssetObject jiraAssetObject =
			_teamContactRoleAssignmentConverter.toAssetObject(
				"contact-role-erc", "contact-erc", "team-erc", true,
				new Date(0));

		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
	}

	private TeamContactRoleAssignmentConverter
		_teamContactRoleAssignmentConverter;

}