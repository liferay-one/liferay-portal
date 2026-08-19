/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.AccountTeamRoleAssignmentConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class AccountTeamRoleAssignmentConverterTest {

	@BeforeEach
	public void setUp() {
		_accountTeamRoleAssignmentConverter =
			JiraAssetObjectConverterTestUtil.prepare(
				new AccountTeamRoleAssignmentConverter());
	}

	@Test
	public void testGetDeletedAttributeNameIsDeleted() {
		Assertions.assertEquals(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED,
			_accountTeamRoleAssignmentConverter.getDeletedAttributeName());
	}

	@Test
	public void testGetExternalKeyAttributeNameIsName() {
		Assertions.assertEquals(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_NAME,
			_accountTeamRoleAssignmentConverter.getExternalKeyAttributeName());
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject =
			_accountTeamRoleAssignmentConverter.toAssetObject(
				"team-role-erc", "team-erc", "account-erc", false, new Date(0));

		Assertions.assertEquals(
			"account-erc",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY));
		Assertions.assertEquals(
			"false",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"team-role-erc;team-erc;account-erc",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			"team-erc",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY));
		Assertions.assertEquals(
			"team-role-erc",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_ROLE_EXTERNAL_KEY));
	}

	@Test
	public void testToAssetObjectMapsDeleted() {
		JiraAssetObject jiraAssetObject =
			_accountTeamRoleAssignmentConverter.toAssetObject(
				"team-role-erc", "team-erc", "account-erc", true, new Date(0));

		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
	}

	private AccountTeamRoleAssignmentConverter
		_accountTeamRoleAssignmentConverter;

}