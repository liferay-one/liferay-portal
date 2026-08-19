/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.one.jira.constants.ContactRoleConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.util.role.EmployeeRoles;

import java.util.Date;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class ContactRoleConverterTest {

	@BeforeEach
	public void setUp() {
		_contactRoleConverter = JiraAssetObjectConverterTestUtil.prepare(
			new ContactRoleConverter());
	}

	@Test
	public void testToAssetObjectMapsAccountWorkerTypeForEmployeeRole() {
		Role role = new Role();

		role.setName(EmployeeRoles.LIFERAY_SALES.getName());
		role.setRoleType("account");

		JiraAssetObject jiraAssetObject = _contactRoleConverter.toAssetObject(
			role);

		Assertions.assertEquals(
			ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_WORKER,
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_TYPE));
	}

	@Test
	public void testToAssetObjectMapsAttributes() {
		Role role = new Role();

		role.setDateCreated(new Date(0));
		role.setDateModified(new Date(86400000));
		role.setDescription("Test description");
		role.setExternalReferenceCode("test-erc");
		role.setName("Test Role");
		role.setRoleType("account");

		JiraAssetObject jiraAssetObject = _contactRoleConverter.toAssetObject(
			role);

		Assertions.assertEquals(
			"Test description",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_DESCRIPTION));
		Assertions.assertEquals(
			"1970-01-01T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"test-erc",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"1970-01-02T00:00:00Z",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_UPDATED_AT));
		Assertions.assertEquals(
			"Test Role",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_CUSTOMER,
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_TYPE));
	}

	@Test
	public void testToAssetObjectMapsTeamTypeForOrganizationRole() {
		Role role = new Role();

		role.setName("Test Role");
		role.setRoleType("organization");

		JiraAssetObject jiraAssetObject = _contactRoleConverter.toAssetObject(
			role);

		Assertions.assertEquals(
			ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_TEAM,
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_TYPE));
	}

	@Test
	public void testToAssetObjectSkipsMissingValues() {
		JiraAssetObject jiraAssetObject = _contactRoleConverter.toAssetObject(
			new Role());

		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_DESCRIPTION));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_CREATED_AT));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_EXTERNAL_KEY));
		Assertions.assertEquals(
			"",
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_NAME));
		Assertions.assertEquals(
			ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_CUSTOMER,
			jiraAssetObject.getAttributeValue(
				ContactRoleConstants.ATTRIBUTE_NAME_TYPE));
	}

	private ContactRoleConverter _contactRoleConverter;

}