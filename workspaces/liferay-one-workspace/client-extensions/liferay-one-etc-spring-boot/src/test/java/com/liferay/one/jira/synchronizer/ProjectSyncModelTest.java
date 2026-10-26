/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.UserAccountService;

import java.util.Arrays;
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
			_entitlementService.getActiveEntitlements(Mockito.anyString())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_projectSyncModel.getActiveEntitlementDefinitions());
	}

	@Test
	public void testGetActiveEntitlementDefinitionsWhenSupportIsRead()
		throws Exception {

		_whenEntitlements(
			_createEntitlement(
				EntitlementConstants.NAME_ACTIVE_SUBSCRIPTION, null));

		Assertions.assertTrue(_projectSyncModel.isSupported());

		_projectSyncModel.getActiveEntitlementDefinitions();

		Mockito.verify(
			_entitlementService
		).getActiveEntitlements(
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_entitlementService
		).getEntitlementDefinitions(
			Mockito.anyList()
		);
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

	@Test
	public void testIsSupportedWhenAccountIsSupported() throws Exception {
		_whenEntitlements();

		Mockito.when(
			_accountSyncModel.isSupported()
		).thenReturn(
			true
		);

		Assertions.assertTrue(_projectSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenAccountSupportFails() throws Exception {
		_whenEntitlements();

		Mockito.when(
			_accountSyncModel.isSupported()
		).thenReturn(
			null
		);

		Assertions.assertNull(_projectSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenEntitlementFails() throws Exception {
		Mockito.when(
			_entitlementService.getActiveEntitlements(Mockito.anyString())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_projectSyncModel.isSupported());

		Mockito.verify(
			_accountSyncModel, Mockito.never()
		).isSupported();
	}

	@Test
	public void testIsSupportedWhenProjectHasEPSEntitlement() throws Exception {
		_whenEntitlements(
			_createEntitlement(EntitlementConstants.NAME_EPS_7_3, null));

		Assertions.assertTrue(_projectSyncModel.isSupported());

		Mockito.verify(
			_accountSyncModel, Mockito.never()
		).isSupported();
	}

	@Test
	public void testIsSupportedWhenProjectHasOtherEntitlement()
		throws Exception {

		_whenEntitlements(_createEntitlement("dxp", null));

		Mockito.when(
			_accountSyncModel.isSupported()
		).thenReturn(
			false
		);

		Assertions.assertFalse(_projectSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenProjectHasSuspendedEntitlement()
		throws Exception {

		_whenEntitlements(
			_createEntitlement(
				EntitlementConstants.NAME_ACTIVE_SUBSCRIPTION,
				EntitlementConstants.TERMINATION_STATUS_SUSPENDED));

		Assertions.assertTrue(_projectSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenProjectHasTerminatedEntitlement()
		throws Exception {

		_whenEntitlements(
			_createEntitlement(
				EntitlementConstants.NAME_ACTIVE_SUBSCRIPTION,
				EntitlementConstants.TERMINATION_STATUS_TERMINATED));

		Mockito.when(
			_accountSyncModel.isSupported()
		).thenReturn(
			false
		);

		Assertions.assertFalse(_projectSyncModel.isSupported());
	}

	private void _assertUserAccountsAreNull() {
		Assertions.assertNull(_projectSyncModel.getProjectMembers());
		Assertions.assertNull(_projectSyncModel.getCustomerUserAccounts());
		Assertions.assertNull(
			_projectSyncModel.getRoleExternalKeysByUserAccountExternalKey());
		Assertions.assertNull(_projectSyncModel.getWorkerUserAccounts());
	}

	private Entitlement _createEntitlement(
		String name, String terminationStatus) {

		return new Entitlement(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"name", name
			).put(
				"terminationStatus", terminationStatus
			));
	}

	private void _whenEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Arrays.asList(entitlements)
		);
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