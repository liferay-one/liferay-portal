/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.exception.DuplicateAccountException;
import com.liferay.one.util.KeyedLock;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class AccountServiceTest {

	@Test
	public void testAddAccountChecksTheExternalReferenceCode()
		throws Exception {

		AccountService accountService = _createAccountService();

		Account account = new Account();

		account.setExternalReferenceCode("ACC-101");
		account.setName(() -> "Acme");

		Mockito.doReturn(
			true
		).when(
			accountService
		).hasDuplicateAccountName(
			"Acme", "ACC-101"
		);

		Assertions.assertThrows(
			DuplicateAccountException.class,
			() -> accountService.addAccount(account));

		Mockito.verify(
			accountService
		).hasDuplicateAccountName(
			"Acme", "ACC-101"
		);
	}

	@Test
	public void testAddAccountThrowsDuplicateAccountException()
		throws Exception {

		AccountService accountService = _createAccountService();

		Account account = new Account();

		account.setName(() -> "Acme");

		Mockito.doReturn(
			true
		).when(
			accountService
		).hasDuplicateAccountName(
			"Acme", null
		);

		DuplicateAccountException duplicateAccountException =
			Assertions.assertThrows(
				DuplicateAccountException.class,
				() -> accountService.addAccount(account));

		Assertions.assertEquals(
			"An account already exists with the name Acme",
			duplicateAccountException.getMessage());
	}

	private AccountService _createAccountService() {
		AccountService accountService = Mockito.spy(new AccountService());

		ReflectionTestUtils.setField(
			accountService, "_keyedLock", new KeyedLock());

		return accountService;
	}

}