/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceAccountCurrencyService;
import com.liferay.one.service.PostalAddressService;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class ObjectActionPostalAddressCreateRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_objectActionPostalAddressCreateRestController =
			new ObjectActionPostalAddressCreateRestController();

		ReflectionTestUtils.setField(
			_objectActionPostalAddressCreateRestController, "_accountService",
			_accountService);
		ReflectionTestUtils.setField(
			_objectActionPostalAddressCreateRestController,
			"_commerceAccountCurrencyService", _commerceAccountCurrencyService);
		ReflectionTestUtils.setField(
			_objectActionPostalAddressCreateRestController,
			"_postalAddressService", _postalAddressService);
	}

	@Test
	public void testPostAssignsCurrencyWithoutPatchingExistingBillingAddress()
		throws Exception {

		Account account = _mockAccount(_OTHER_ADDRESS_ID);

		_mockPostalAddress("Brazil");

		_objectActionPostalAddressCreateRestController.post(
			_createJSON(
				new JSONObject(
				).put(
					"classPK", _ACCOUNT_ID
				)));

		Mockito.verify(
			_accountService, Mockito.never()
		).patchAccount(
			Mockito.anyLong(), Mockito.any()
		);

		Mockito.verify(
			_commerceAccountCurrencyService
		).assignDefaultCurrency(
			account, "Brazil"
		);
	}

	@Test
	public void testPostFallsBackToAccountIdThenParentClassPK()
		throws Exception {

		_mockAccount(_OTHER_ADDRESS_ID);
		_mockPostalAddress(null);

		_objectActionPostalAddressCreateRestController.post(
			new JSONObject(
			).put(
				"accountId", _ACCOUNT_ID
			).put(
				"classPK", _ADDRESS_ID
			).toString());

		_objectActionPostalAddressCreateRestController.post(
			new JSONObject(
			).put(
				"classPK", _ADDRESS_ID
			).put(
				"parentClassPK", _ACCOUNT_ID
			).toString());

		Mockito.verify(
			_accountService, Mockito.times(2)
		).fetchAccount(
			_ACCOUNT_ID
		);

		Mockito.verifyNoInteractions(_commerceAccountCurrencyService);
	}

	@Test
	public void testPostReturnsWhenAccountIsNotFound() throws Exception {
		_objectActionPostalAddressCreateRestController.post(
			_createJSON(
				new JSONObject(
				).put(
					"classPK", _ACCOUNT_ID
				)));

		Mockito.verify(
			_accountService
		).fetchAccount(
			_ACCOUNT_ID
		);

		Mockito.verifyNoMoreInteractions(_accountService);
		Mockito.verifyNoInteractions(
			_commerceAccountCurrencyService, _postalAddressService);
	}

	@Test
	public void testPostReturnsWithoutAccountId() throws Exception {
		_objectActionPostalAddressCreateRestController.post(
			new JSONObject(
			).put(
				"classPK", _ADDRESS_ID
			).toString());

		Mockito.verifyNoInteractions(
			_accountService, _commerceAccountCurrencyService,
			_postalAddressService);
	}

	@Test
	public void testPostSetsDefaultBillingAddressWhenAccountHasNone()
		throws Exception {

		_mockAccount(null);
		_mockPostalAddress("United States");

		_objectActionPostalAddressCreateRestController.post(
			_createJSON(
				new JSONObject(
				).put(
					"classPK", _ACCOUNT_ID
				)));

		ArgumentCaptor<Account> argumentCaptor = ArgumentCaptor.forClass(
			Account.class);

		Mockito.verify(
			_accountService
		).patchAccount(
			Mockito.eq(_ACCOUNT_ID), argumentCaptor.capture()
		);

		Account patchAccount = argumentCaptor.getValue();

		Assertions.assertEquals(
			_ADDRESS_ID, patchAccount.getDefaultBillingAddressId());
	}

	@Test
	public void testPostSkipsCurrencyWhenCountryIsMissing() throws Exception {
		_mockAccount(0L);
		_mockPostalAddress("");

		_objectActionPostalAddressCreateRestController.post(
			_createJSON(
				new JSONObject(
				).put(
					"classPK", _ACCOUNT_ID
				)));

		Mockito.verify(
			_accountService
		).patchAccount(
			Mockito.eq(_ACCOUNT_ID), Mockito.any(Account.class)
		);

		Mockito.verifyNoInteractions(_commerceAccountCurrencyService);
	}

	private String _createJSON(JSONObject modelAddressJSONObject) {
		return new JSONObject(
		).put(
			"classPK", _ADDRESS_ID
		).put(
			"modelAddress", modelAddressJSONObject
		).toString();
	}

	private Account _mockAccount(Long defaultBillingAddressId)
		throws Exception {

		Account account = new Account();

		account.setDefaultBillingAddressId(defaultBillingAddressId);
		account.setId(_ACCOUNT_ID);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		return account;
	}

	private void _mockPostalAddress(String addressCountry) throws Exception {
		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setAddressCountry(addressCountry);

		Mockito.when(
			_postalAddressService.getPostalAddress(_ADDRESS_ID)
		).thenReturn(
			postalAddress
		);
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final long _ADDRESS_ID = 2000L;

	private static final long _OTHER_ADDRESS_ID = 2001L;

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final CommerceAccountCurrencyService
		_commerceAccountCurrencyService = Mockito.mock(
			CommerceAccountCurrencyService.class);
	private ObjectActionPostalAddressCreateRestController
		_objectActionPostalAddressCreateRestController;
	private final PostalAddressService _postalAddressService = Mockito.mock(
		PostalAddressService.class);

}