/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AccountUserAccountSynchronizer {

	public void syncAccountUserAccountMembership(
		Account account, UserAccount userAccount) {

		try {
			_accountSynchronizer.syncAccountUserAccounts(account);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync user accounts for account " +
					account.getExternalReferenceCode(),
				exception);
		}

		try {
			_userAccountSynchronizer.syncUserAccountAccounts(userAccount);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync accounts for user account " +
					userAccount.getExternalReferenceCode(),
				exception);
		}

		try {
			_userAccountSynchronizer.syncUserAccountRoles(userAccount);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync roles for user account " +
					userAccount.getExternalReferenceCode(),
				exception);
		}
	}

	private static final Log _log = LogFactory.getLog(
		AccountUserAccountSynchronizer.class);

	@Autowired
	private AccountSynchronizer _accountSynchronizer;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}