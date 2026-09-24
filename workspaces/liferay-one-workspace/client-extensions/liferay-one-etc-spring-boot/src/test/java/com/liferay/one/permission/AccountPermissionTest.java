/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class AccountPermissionTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_accountPermission, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_accountPermission, "_userAccountService", _userAccountService);
	}

	@Test
	public void testCheckAssignMembersAllowsAccountAdministrator()
		throws Exception {

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createUserAccount(
				_EXTERNAL_REFERENCE_CODE,
				RoleConstants.NAME_ACCOUNT_ADMINISTRATOR)
		);

		Assertions.assertDoesNotThrow(
			() -> _accountPermission.check(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null));
	}

	@Test
	public void testCheckAssignMembersRejectsAccountMember() throws Exception {
		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createUserAccount(
				_EXTERNAL_REFERENCE_CODE, RoleConstants.NAME_ACCOUNT_MEMBER)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _accountPermission.check(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null));
	}

	@Test
	public void testContainsAllowsAdministratorWithoutAccount()
		throws Exception {

		UserAccount userAccount = _createUserAccount(null, null);

		userAccount.setRoleBriefs(
			new RoleBrief[] {
				_createRoleBrief(RoleConstants.NAME_ADMINISTRATOR)
			});

		Assertions.assertTrue(
			_accountPermission.contains(
				null, ActionKeys.ASSIGN_MEMBERS, null, userAccount));
	}

	@Test
	public void testContainsAllowsLiferayStaff() throws Exception {
		UserAccount userAccount = _createUserAccount(null, null);

		userAccount.setRoleBriefs(
			new RoleBrief[] {
				_createRoleBrief(RoleConstants.NAME_LIFERAY_STAFF)
			});

		Assertions.assertTrue(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				userAccount));
	}

	@Test
	public void testContainsAllowsOrganizationMemberToView() throws Exception {
		UserAccount userAccount = _createUserAccount(null, null);

		userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {_createOrganizationBrief()});

		_mockAccount();

		Assertions.assertTrue(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.VIEW, null, userAccount));
	}

	@Test
	public void testContainsAllowsPartnerAccountAdminToAssignMembers()
		throws Exception {

		Assertions.assertTrue(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				_createUserAccount(
					_EXTERNAL_REFERENCE_CODE,
					RoleConstants.NAME_PARTNER_ACCOUNT_ADMIN)));
	}

	@Test
	public void testContainsAllowsSSAAdminToAssignMembers() throws Exception {
		Assertions.assertTrue(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				_createUserAccount(
					_EXTERNAL_REFERENCE_CODE, RoleConstants.NAME_SSA_ADMIN)));
	}

	@Test
	public void testContainsAllowsSupportRoleToView() throws Exception {
		Assertions.assertTrue(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.VIEW, null,
				_createUserAccount(
					_EXTERNAL_REFERENCE_CODE,
					RoleConstants.NAME_ACCOUNT_MEMBER)));
	}

	@Test
	public void testContainsRejectsAccountAdministratorOfAnotherAccount()
		throws Exception {

		Assertions.assertFalse(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				_createUserAccount(
					"ACC-2", RoleConstants.NAME_ACCOUNT_ADMINISTRATOR)));
	}

	@Test
	public void testContainsRejectsAccountRequesterToAssignMembers()
		throws Exception {

		Assertions.assertFalse(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				_createUserAccount(
					_EXTERNAL_REFERENCE_CODE,
					RoleConstants.NAME_ACCOUNT_REQUESTER)));
	}

	@Test
	public void testContainsRejectsOrganizationMemberToAssignMembers()
		throws Exception {

		UserAccount userAccount = _createUserAccount(null, null);

		userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {_createOrganizationBrief()});

		_mockAccount();

		Assertions.assertFalse(
			_accountPermission.contains(
				_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null,
				userAccount));

		Mockito.verifyNoInteractions(_accountService);
	}

	private OrganizationBrief _createOrganizationBrief() {
		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setId(_ORGANIZATION_ID);

		return organizationBrief;
	}

	private RoleBrief _createRoleBrief(String name) {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setName(name);

		return roleBrief;
	}

	private UserAccount _createUserAccount(
		String accountExternalReferenceCode, String accountRoleName) {

		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(new AccountBrief[0]);
		userAccount.setOrganizationBriefs(new OrganizationBrief[0]);
		userAccount.setRoleBriefs(new RoleBrief[0]);

		if (accountExternalReferenceCode == null) {
			return userAccount;
		}

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(accountExternalReferenceCode);
		accountBrief.setRoleBriefs(
			new RoleBrief[] {_createRoleBrief(accountRoleName)});

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});

		return userAccount;
	}

	private void _mockAccount() throws Exception {
		Account account = new Account();

		account.setOrganizationIds(new Long[] {_ORGANIZATION_ID});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);
	}

	private static final String _EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final long _ORGANIZATION_ID = 44444;

	private final AccountPermission _accountPermission =
		new AccountPermission();
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}