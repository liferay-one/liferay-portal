/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SYNC-USERACCOUNTBUCKET] UserAccountBucket")
public class UserAccountBucketTest {

	@Test
	public void testGetUserAccountsRejectModification() {
		UserAccountBucket userAccountBucket = new UserAccountBucket();

		UserAccount customerUserAccount = new UserAccount();
		UserAccount workerUserAccount = new UserAccount();

		userAccountBucket.addCustomerUserAccount(customerUserAccount);
		userAccountBucket.addWorkerUserAccount(workerUserAccount);

		List<UserAccount> customerUserAccounts =
			userAccountBucket.getCustomerUserAccounts();

		Assertions.assertEquals(
			List.of(customerUserAccount), customerUserAccounts);
		Assertions.assertThrows(
			UnsupportedOperationException.class,
			() -> customerUserAccounts.add(new UserAccount()));

		List<UserAccount> workerUserAccounts =
			userAccountBucket.getWorkerUserAccounts();

		Assertions.assertEquals(List.of(workerUserAccount), workerUserAccounts);
		Assertions.assertThrows(
			UnsupportedOperationException.class,
			() -> workerUserAccounts.add(new UserAccount()));
	}

}