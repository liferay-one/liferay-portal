/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.UserAccountService;

import java.util.Collections;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SYNC-PROJECTSYNCMODEL] ProjectSyncModel")
public class ProjectSyncModelTest {

	@BeforeEach
	public void setUp() {
		_accountSyncModel = Mockito.mock(AccountSyncModel.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		_projectSyncModel = new ProjectSyncModel(
			_accountSyncModel, _entitlementService,
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
				)),
			_projectMembershipService, _userAccountService);
	}

	@Test
	public void testGetActiveEntitlementDefinitionsWhenEntitlementFails()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementDefinitions(
				Mockito.anyString())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_projectSyncModel.getActiveEntitlementDefinitions());
	}

	@Test
	public void testGetProjectMembersWhenProjectMembershipFails()
		throws Exception {

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenThrow(
			new RuntimeException()
		);

		_assertUserAccountsAreNull();

		Mockito.verify(
			_projectMembershipService
		).getProjectMemberships(
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetProjectMembersWhenUserAccountFails() throws Exception {
		_whenProjectMembership();

		Mockito.when(
			_userAccountService.getUserAccounts(Mockito.anyCollection())
		).thenThrow(
			new RuntimeException()
		);

		_assertUserAccountsAreNull();

		Mockito.verify(
			_userAccountService
		).getUserAccounts(
			Mockito.anyCollection()
		);
	}

	@Test
	public void testGetUserAccountsWhenAccountRolesFail() throws Exception {
		_whenProjectMembership();

		Mockito.when(
			_userAccountService.getUserAccounts(Mockito.anyCollection())
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_accountSyncModel.getAccountRolesByExternalReferenceCode()
		).thenReturn(
			null
		);

		Assertions.assertNotNull(_projectSyncModel.getProjectMembers());
		Assertions.assertNull(_projectSyncModel.getCustomerUserAccounts());
		Assertions.assertNull(_projectSyncModel.getWorkerUserAccounts());
	}

	private void _assertUserAccountsAreNull() {
		Assertions.assertNull(_projectSyncModel.getProjectMembers());
		Assertions.assertNull(_projectSyncModel.getCustomerUserAccounts());
		Assertions.assertNull(
			_projectSyncModel.getRoleExternalKeysByUserAccountExternalKey());
		Assertions.assertNull(_projectSyncModel.getWorkerUserAccounts());
	}

	private void _whenProjectMembership() throws Exception {
		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.singletonList(
				new ProjectMembership(
					new JSONObject(
					).put(
						"r_userToProjectMembership_userId", 2L
					)))
		);
	}

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE =
		"test-project-external-reference-code";

	private AccountSyncModel _accountSyncModel;
	private EntitlementService _entitlementService;
	private ProjectMembershipService _projectMembershipService;
	private ProjectSyncModel _projectSyncModel;
	private UserAccountService _userAccountService;

}