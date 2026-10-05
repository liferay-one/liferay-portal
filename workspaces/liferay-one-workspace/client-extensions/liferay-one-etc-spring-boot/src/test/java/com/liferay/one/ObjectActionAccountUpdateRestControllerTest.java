/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceAccountCurrencyService;

import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class ObjectActionAccountUpdateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionAccountUpdateRestController =
			new ObjectActionAccountUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionAccountUpdateRestController, "_accountService",
			_accountService);
		ReflectionTestUtils.setField(
			_objectActionAccountUpdateRestController, "_accountSynchronizer",
			_accountSynchronizer);
		ReflectionTestUtils.setField(
			_objectActionAccountUpdateRestController,
			"_commerceAccountCurrencyService", _commerceAccountCurrencyService);
	}

	@Test
	public void testPost() throws Exception {
		Account account = _mockAccount();

		_objectActionAccountUpdateRestController.post(_createJSON());

		InOrder inOrder = Mockito.inOrder(
			_accountSynchronizer, _commerceAccountCurrencyService);

		inOrder.verify(
			_commerceAccountCurrencyService
		).assignDefaultCurrency(
			account
		);

		inOrder.verify(
			_accountSynchronizer
		).syncAccount(
			account
		);
	}

	@Test
	public void testPostReturnsWhenAccountIsNotFound() throws Exception {
		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			null
		);

		_objectActionAccountUpdateRestController.post(_createJSON());

		Mockito.verifyNoInteractions(
			_accountSynchronizer, _commerceAccountCurrencyService);
	}

	@Test
	public void testPostSyncsAccountWhenDefaultCurrencyFails()
		throws Exception {

		Account account = _mockAccount();

		Mockito.doThrow(
			new Exception()
		).when(
			_commerceAccountCurrencyService
		).assignDefaultCurrency(
			account
		);

		_objectActionAccountUpdateRestController.post(_createJSON());

		Mockito.verify(
			_accountSynchronizer
		).syncAccount(
			account
		);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionAccountUpdateRestController.post("{}"));

		Mockito.verifyNoInteractions(
			_accountService, _accountSynchronizer,
			_commerceAccountCurrencyService);
	}

	private String _createJSON() {
		return new JSONObject(
		).put(
			"classPK", _ACCOUNT_ID
		).toString();
	}

	private Account _mockAccount() throws Exception {
		Account account = new Account();

		account.setId(_ACCOUNT_ID);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		return account;
	}

	private static final long _ACCOUNT_ID = 1000L;

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final AccountSynchronizer _accountSynchronizer = Mockito.mock(
		AccountSynchronizer.class);
	private final CommerceAccountCurrencyService
		_commerceAccountCurrencyService = Mockito.mock(
			CommerceAccountCurrencyService.class);
	private ObjectActionAccountUpdateRestController
		_objectActionAccountUpdateRestController;

}