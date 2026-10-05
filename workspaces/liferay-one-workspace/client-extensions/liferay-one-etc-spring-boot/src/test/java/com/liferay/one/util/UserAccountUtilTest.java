/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-USERACCOUNTUTIL] UserAccountUtil")
public class UserAccountUtilTest {

	@Test
	public void testGetAccountRoleNamesCollectsOnlyMatchingAccount() {
		UserAccount userAccount = _createUserAccount(
			_createAccountBrief(1L, "Account Administrator", "Account Member"),
			_createAccountBrief(2L, "Account Supervisor"),
			_createAccountBrief(null, "Ignored"));

		Assertions.assertEquals(
			Set.of("Account Administrator", "Account Member"),
			UserAccountUtil.getAccountRoleNames(userAccount, 1));
		Assertions.assertTrue(
			UserAccountUtil.getAccountRoleNames(
				userAccount, 3
			).isEmpty());
	}

	@Test
	public void testGetAccountRoleNamesHandlesNullBriefs() {
		Assertions.assertTrue(
			UserAccountUtil.getAccountRoleNames(
				new UserAccount(), 1
			).isEmpty());

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(1L);

		Assertions.assertTrue(
			UserAccountUtil.getAccountRoleNames(
				_createUserAccount(accountBrief), 1
			).isEmpty());
	}

	@Test
	public void testGetUuid() {
		Assertions.assertNull(UserAccountUtil.getUuid(new UserAccount()));
		Assertions.assertNull(
			UserAccountUtil.getUuid(_createUserAccount("other", "value")));
		Assertions.assertNull(
			UserAccountUtil.getUuid(_createUserAccount("uuid_", null)));
		Assertions.assertEquals(
			"1234",
			UserAccountUtil.getUuid(_createUserAccount("uuid_", "1234")));
	}

	@Test
	public void testHasAccountMembership() {
		Assertions.assertFalse(
			UserAccountUtil.hasAccountMembership(new UserAccount(), 1));

		UserAccount userAccount = _createUserAccount(
			_createAccountBrief(1L, "Account Member"));

		Assertions.assertTrue(
			UserAccountUtil.hasAccountMembership(userAccount, 1));
		Assertions.assertFalse(
			UserAccountUtil.hasAccountMembership(userAccount, 2));
	}

	@Test
	public void testHasAccountRole() {
		Assertions.assertFalse(
			UserAccountUtil.hasAccountRole(
				new UserAccount(), List.of("Account Member")));

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(2L);

		UserAccount userAccount = _createUserAccount(
			accountBrief, _createAccountBrief(1L, "Account Member"));

		Assertions.assertTrue(
			UserAccountUtil.hasAccountRole(
				userAccount,
				List.of("Account Administrator", "Account Member")));
		Assertions.assertFalse(
			UserAccountUtil.hasAccountRole(
				userAccount, List.of("Account Administrator")));
	}

	@Test
	public void testHasAccountRoleForAccount() {
		UserAccount userAccount = _createUserAccount(
			_createAccountBrief(1L, "Account Member"),
			_createAccountBrief(2L, "Account Administrator"));

		Assertions.assertTrue(
			UserAccountUtil.hasAccountRole(
				userAccount, 2, List.of("Account Administrator")));
		Assertions.assertFalse(
			UserAccountUtil.hasAccountRole(
				userAccount, 1, List.of("Account Administrator")));
	}

	@Test
	public void testIsVerified() {
		Assertions.assertFalse(UserAccountUtil.isVerified(new UserAccount()));
		Assertions.assertFalse(
			UserAccountUtil.isVerified(_createUserAccount("other", "true")));
		Assertions.assertFalse(
			UserAccountUtil.isVerified(_createUserAccount("verified", null)));
		Assertions.assertFalse(
			UserAccountUtil.isVerified(
				_createUserAccount("verified", "false")));
		Assertions.assertTrue(
			UserAccountUtil.isVerified(_createUserAccount("verified", "true")));
	}

	private AccountBrief _createAccountBrief(Long id, String... roleNames) {
		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(id);

		RoleBrief[] roleBriefs = new RoleBrief[roleNames.length];

		for (int i = 0; i < roleNames.length; i++) {
			RoleBrief roleBrief = new RoleBrief();

			roleBrief.setName(roleNames[i]);

			roleBriefs[i] = roleBrief;
		}

		accountBrief.setRoleBriefs(roleBriefs);

		return accountBrief;
	}

	private UserAccount _createUserAccount(AccountBrief... accountBriefs) {
		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(accountBriefs);

		return userAccount;
	}

	private UserAccount _createUserAccount(String name, String data) {
		CustomField customField = new CustomField();

		if (data != null) {
			CustomValue customValue = new CustomValue();

			customValue.setData(data);

			customField.setCustomValue(customValue);
		}

		customField.setName(name);

		UserAccount userAccount = new UserAccount();

		userAccount.setCustomFields(new CustomField[] {customField});

		return userAccount;
	}

}