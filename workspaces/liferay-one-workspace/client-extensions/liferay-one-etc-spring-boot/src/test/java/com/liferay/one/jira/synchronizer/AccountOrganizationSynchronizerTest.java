/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.util.JiraSyncLock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class AccountOrganizationSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountOrganizationSynchronizer =
			new AccountOrganizationSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		AccountTeamRoleAssignmentConverter accountTeamRoleAssignmentConverter =
			Mockito.mock(AccountTeamRoleAssignmentConverter.class);

		Mockito.when(
			accountTeamRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_accountConverter",
			Mockito.mock(AccountConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer,
			"_accountTeamRoleAssignmentConverter",
			accountTeamRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_jiraSyncLock",
			new JiraSyncLock());
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamRoleSynchronizer",
			Mockito.mock(TeamRoleSynchronizer.class));
	}

	@Test
	public void testSyncAssignOrganizationWaitsForSyncAssignOrganization()
		throws Exception {

		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		Mockito.doAnswer(
			lockSerializationTestHelper.block("upsert")
		).when(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any()
		);

		lockSerializationTestHelper.assertSerialized(
			() -> _accountOrganizationSynchronizer.syncAssignOrganization(
				"organization-erc", "account-erc"),
			() -> _accountOrganizationSynchronizer.syncAssignOrganization(
				"organization-erc", "account-erc"),
			"upsert", "upsert");
	}

	private AccountOrganizationSynchronizer _accountOrganizationSynchronizer;
	private JiraAssetService _jiraAssetService;

}