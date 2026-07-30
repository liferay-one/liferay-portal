/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class AccountUserAccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountUserAccountSynchronizer = new AccountUserAccountSynchronizer();

		_accountSynchronizer = Mockito.mock(AccountSynchronizer.class);
		_userAccountSynchronizer = Mockito.mock(UserAccountSynchronizer.class);

		ReflectionTestUtils.setField(
			_accountUserAccountSynchronizer, "_accountSynchronizer",
			_accountSynchronizer);
		ReflectionTestUtils.setField(
			_accountUserAccountSynchronizer, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testSyncAccountUserAccountMembershipSyncsBothSides()
		throws Exception {

		Account account = new Account();
		UserAccount userAccount = new UserAccount();

		_accountUserAccountSynchronizer.syncAccountUserAccountMembership(
			account, userAccount);

		Mockito.verify(
			_accountSynchronizer
		).syncAccountUserAccounts(
			account
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountAccounts(
			userAccount
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			userAccount
		);
	}

	@Test
	public void testSyncAccountUserAccountMembershipSyncsPastFailures()
		throws Exception {

		Mockito.doThrow(
			new RuntimeException("expected")
		).when(
			_accountSynchronizer
		).syncAccountUserAccounts(
			Mockito.any()
		);

		UserAccount userAccount = new UserAccount();

		_accountUserAccountSynchronizer.syncAccountUserAccountMembership(
			new Account(), userAccount);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountAccounts(
			userAccount
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			userAccount
		);
	}

	private AccountSynchronizer _accountSynchronizer;
	private AccountUserAccountSynchronizer _accountUserAccountSynchronizer;
	private UserAccountSynchronizer _userAccountSynchronizer;

}