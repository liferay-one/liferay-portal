/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.AccountContactRoleAssignmentConstants;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class AccountContactRoleAssignmentConverterTest {

	@BeforeEach
	public void setUp() {
		_accountContactRoleAssignmentConverter =
			JiraAssetObjectConverterTestUtil.prepare(
				new AccountContactRoleAssignmentConverter());
	}

	@Test
	public void testGetDeletedAttributeNameIsDeleted() {
		Assertions.assertEquals(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED,
			_accountContactRoleAssignmentConverter.getDeletedAttributeName());
	}

	@Test
	public void testGetExternalKeyAttributeNameIsName() {
		Assertions.assertEquals(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_NAME,
			_accountContactRoleAssignmentConverter.
				getExternalKeyAttributeName());
	}

	@Test
	public void testGetNameJoinsExternalKeys() {
		Assertions.assertEquals(
			"contact-role-erc;contact-erc;account-erc",
			_accountContactRoleAssignmentConverter.getName(
				"account-erc", "contact-erc", "contact-role-erc"));
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		JiraAssetObject jiraAssetObject =
			_accountContactRoleAssignmentConverter.toAssetObject(
				"contact-role-erc", "contact-erc", "account-erc", false,
				new Date(0));

		Assertions.assertEquals(
			"account-erc",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY));
		Assertions.assertEquals(
			"contact-erc",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY));
		Assertions.assertEquals(
			"contact-role-erc",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_ROLE_EXTERNAL_KEY));
		Assertions.assertEquals(
			"false",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"contact-role-erc;contact-erc;account-erc",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_NAME));
	}

	@Test
	public void testToAssetObjectMapsDeleted() {
		JiraAssetObject jiraAssetObject =
			_accountContactRoleAssignmentConverter.toAssetObject(
				"contact-role-erc", "contact-erc", "account-erc", true,
				new Date(0));

		Assertions.assertEquals(
			"true",
			jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED));
	}

	private AccountContactRoleAssignmentConverter
		_accountContactRoleAssignmentConverter;

}