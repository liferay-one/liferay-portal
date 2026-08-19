/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.TeamContactRoleAssignmentConstants;
import com.liferay.one.jira.converter.TeamContactRoleAssignmentConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.util.KeyedLock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class OrganizationUserAccountRoleSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_organizationUserAccountRoleSynchronizer =
			new OrganizationUserAccountRoleSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		_teamContactRoleAssignmentConverter = Mockito.mock(
			TeamContactRoleAssignmentConverter.class);

		Mockito.when(
			_teamContactRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer, "_keyedLock",
			new KeyedLock());
		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer,
			"_teamContactRoleAssignmentConverter",
			_teamContactRoleAssignmentConverter);
	}

	@Test
	public void testSoftDeleteByOrganization() {
		_organizationUserAccountRoleSynchronizer.softDeleteByOrganization(
			"organization-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_teamContactRoleAssignmentConverter,
			TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY,
			"organization-erc"
		);
	}

	@Test
	public void testSoftDeleteByUserAccount() {
		_organizationUserAccountRoleSynchronizer.softDeleteByUserAccount(
			"user-account-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_teamContactRoleAssignmentConverter,
			TeamContactRoleAssignmentConstants.
				ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY,
			"user-account-erc"
		);
	}

	@Test
	public void testSyncAssignRoleMarksAssignmentUndeleted() throws Exception {
		_organizationUserAccountRoleSynchronizer.syncAssignRole(
			"role-erc", "user-account-erc", "organization-erc");

		Mockito.verify(
			_teamContactRoleAssignmentConverter
		).toAssetObject(
			Mockito.eq("role-erc"), Mockito.eq("user-account-erc"),
			Mockito.eq("organization-erc"), Mockito.eq(false), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any()
		);
	}

	@Test
	public void testSyncUnassignRoleMarksAssignmentDeleted() throws Exception {
		_organizationUserAccountRoleSynchronizer.syncUnassignRole(
			"role-erc", "user-account-erc", "organization-erc");

		Mockito.verify(
			_teamContactRoleAssignmentConverter
		).toAssetObject(
			Mockito.eq("role-erc"), Mockito.eq("user-account-erc"),
			Mockito.eq("organization-erc"), Mockito.eq(true), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any()
		);
	}

	private JiraAssetService _jiraAssetService;
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;
	private TeamContactRoleAssignmentConverter
		_teamContactRoleAssignmentConverter;

}