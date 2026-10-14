/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Project;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[SVC-ACCOUNTINVITATIONACCEPTANCESERVICE] " +
		"AccountInvitationAcceptanceService"
)
public class AccountInvitationAcceptanceServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_adminAccountRole.setExternalReferenceCode("ROLE_ADMIN");
		_memberAccountRole.setExternalReferenceCode("ROLE_MEMBER");

		_accountInvitationAcceptanceService =
			new AccountInvitationAcceptanceService();

		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_accountRoleService",
			_accountRoleService);
		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_accountService",
			_accountService);
		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_projectContactRoleService",
			_projectContactRoleService);
		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_projectService",
			_projectService);
		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			_accountInvitationAcceptanceService, "_userAssignmentService",
			_userAssignmentService);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"ROLE_ADMIN")
		).thenReturn(
			_adminAccountRole
		);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"ROLE_MEMBER")
		).thenReturn(
			_memberAccountRole
		);

		Mockito.when(
			_accountService.getAccount(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_account
		);

		_userAccount.setId(_USER_ID);
	}

	@Test
	public void testProvisionAccountInvitationAssignsAccountRolesInOrder()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation(null, "ROLE_ADMIN", "ROLE_MEMBER"));

		InOrder inOrder = Mockito.inOrder(_userAssignmentService);

		inOrder.verify(
			_userAssignmentService
		).assignAccount(
			_account, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _adminAccountRole, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _memberAccountRole, _USER_ID
		);

		Mockito.verify(
			_userAccountService, Mockito.never()
		).addUserAccount(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyString()
		);

		Mockito.verifyNoInteractions(_projectService);
	}

	@Test
	public void testProvisionAccountInvitationAssignsContactRolesOnTheAccountWithoutAProject()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		AccountRole criticalIncidentContactAccountRole = new AccountRole();

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				_CONTACT_ROLE_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			criticalIncidentContactAccountRole
		);

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation(
				null, _CONTACT_ROLE_EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, criticalIncidentContactAccountRole, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			ArgumentMatchers.any(), ArgumentMatchers.any(),
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testProvisionAccountInvitationAssignsProjectContactRolesOnTheProject()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		Project project = new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", "PRJCT-1"
			).put(
				"id", 5
			));

		Mockito.when(
			_projectService.fetchProject("PRJCT-1")
		).thenReturn(
			project
		);

		_setUpProjectContactRoles("PRJCT-1");

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation(
				"PRJCT-1", _CONTACT_ROLE_EXTERNAL_REFERENCE_CODE,
				"ROLE_MEMBER"));

		InOrder inOrder = Mockito.inOrder(_userAssignmentService);

		inOrder.verify(
			_userAssignmentService
		).assignProjectRole(
			project, "PROJECT_ROLE_MEMBER", _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignProjectRole(
			project, _CONTACT_ROLE_EXTERNAL_REFERENCE_CODE, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _memberAccountRole, _USER_ID
		);

		Mockito.verify(
			_accountRoleService, Mockito.never()
		).fetchAccountRoleByExternalReferenceCode(
			_CONTACT_ROLE_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testProvisionAccountInvitationCreatesMissingUserAccount()
		throws Exception {

		_whenFetchUserAccount(null);

		Mockito.when(
			_userAccountService.addUserAccount(_EMAIL_ADDRESS, "Doe", "Jane")
		).thenReturn(
			_userAccount
		);

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation(null, "ROLE_MEMBER"));

		Mockito.verify(
			_userAccountService
		).addUserAccount(
			_EMAIL_ADDRESS, "Doe", "Jane"
		);

		Mockito.verify(
			_userAssignmentService
		).assignAccount(
			_account, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _memberAccountRole, _USER_ID
		);
	}

	@Test
	public void testProvisionAccountInvitationLinksProjectMembership()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		Project project = new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", "PRJCT-1"
			).put(
				"id", 5
			));

		Mockito.when(
			_projectService.fetchProject("PRJCT-1")
		).thenReturn(
			project
		);

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation("PRJCT-1", "ROLE_MEMBER"));

		Mockito.verify(
			_userAssignmentService
		).assignProjectRole(
			project, "PROJECT_ROLE_MEMBER", _USER_ID
		);
	}

	@Test
	public void testProvisionAccountInvitationRejectsUnknownAccountRole()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		IllegalArgumentException illegalArgumentException =
			Assertions.assertThrows(
				IllegalArgumentException.class,
				() ->
					_accountInvitationAcceptanceService.
						provisionAccountInvitation(
							_createAccountInvitation(
								null, "ROLE_MEMBER", "ROLE_UNKNOWN")));

		Assertions.assertEquals(
			"Unable to find account role ROLE_UNKNOWN",
			illegalArgumentException.getMessage());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testProvisionAccountInvitationSkipsMissingProject()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		Mockito.when(
			_projectService.fetchProject("PRJCT-404")
		).thenReturn(
			null
		);

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation("PRJCT-404", "ROLE_MEMBER"));

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			ArgumentMatchers.any(), ArgumentMatchers.any(),
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testProvisionAccountInvitationSkipsTheContactRolesOfAMissingProject()
		throws Exception {

		_whenFetchUserAccount(_userAccount);

		_setUpProjectContactRoles("PRJCT-404");

		_accountInvitationAcceptanceService.provisionAccountInvitation(
			_createAccountInvitation(
				"PRJCT-404", _CONTACT_ROLE_EXTERNAL_REFERENCE_CODE,
				"ROLE_MEMBER"));

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _memberAccountRole, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			ArgumentMatchers.any(), ArgumentMatchers.any(),
			ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_accountRoleService, Mockito.never()
		).fetchAccountRoleByExternalReferenceCode(
			_CONTACT_ROLE_EXTERNAL_REFERENCE_CODE
		);
	}

	private AccountInvitation _createAccountInvitation(
		String projectExternalReferenceCode,
		String... roleExternalReferenceCodes) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"accountExternalReferenceCode", _ACCOUNT_EXTERNAL_REFERENCE_CODE
		).put(
			"emailAddress", _EMAIL_ADDRESS
		).put(
			"familyName", "Doe"
		).put(
			"givenName", "Jane"
		).put(
			"id", 1
		).put(
			"projectRoleExternalReferenceCode", "PROJECT_ROLE_MEMBER"
		).put(
			"roleExternalReferenceCodes",
			new JSONArray(
				roleExternalReferenceCodes
			).toString()
		);

		if (projectExternalReferenceCode != null) {
			jsonObject.put(
				"projectExternalReferenceCode", projectExternalReferenceCode);
		}

		return new AccountInvitation(jsonObject);
	}

	private void _setUpProjectContactRoles(String projectExternalReferenceCode)
		throws Exception {

		Mockito.when(
			_projectContactRoleService.getContactRoleExternalReferenceCodes(
				projectExternalReferenceCode)
		).thenReturn(
			List.of(_CONTACT_ROLE_EXTERNAL_REFERENCE_CODE)
		);
	}

	private void _whenFetchUserAccount(UserAccount userAccount)
		throws Exception {

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			userAccount
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-1";

	private static final String _CONTACT_ROLE_EXTERNAL_REFERENCE_CODE =
		"C_CRITICAL_INCIDENT_CONTACT";

	private static final String _EMAIL_ADDRESS = "jane.doe@example.com";

	private static final long _USER_ID = 301L;

	private final Account _account = new Account();
	private AccountInvitationAcceptanceService
		_accountInvitationAcceptanceService;
	private final AccountRoleService _accountRoleService = Mockito.mock(
		AccountRoleService.class);
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final AccountRole _adminAccountRole = new AccountRole();
	private final AccountRole _memberAccountRole = new AccountRole();
	private final ProjectContactRoleService _projectContactRoleService =
		Mockito.mock(ProjectContactRoleService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final UserAccount _userAccount = new UserAccount();
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAssignmentService _userAssignmentService = Mockito.mock(
		UserAssignmentService.class);

}