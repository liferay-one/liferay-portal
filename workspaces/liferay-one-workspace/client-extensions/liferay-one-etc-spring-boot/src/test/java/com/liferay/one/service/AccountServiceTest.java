/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.exception.DuplicateAccountException;
import com.liferay.one.util.KeyedLock;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
@DisplayName("[SVC-ACCOUNTSERVICE] AccountService")
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

	@Test
	public void testGetDefaultLicensingCustomFields() {
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", true, "allowPermanentLicenses", true,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("Spain", "Liferay Inc."));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", true, "allowPermanentLicenses", true,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields(null, null));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", false, "allowPermanentLicenses", true,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("Ireland", "Liferay Inc."));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", false, "allowPermanentLicenses", true,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("United Kingdom", "Liferay Inc."));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", true, "allowPermanentLicenses", false,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("Brazil", "Liferay Brazil"));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", true, "allowPermanentLicenses", false,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("China", "Liferay China"));
		Assertions.assertEquals(
			Map.of(
				"allowComplimentary", true, "allowPermanentLicenses", false,
				"allowSelfProvisioning", true),
			_getDefaultLicensingCustomFields("India", "Liferay India"));
	}

	private AccountService _createAccountService() {
		AccountService accountService = Mockito.spy(new AccountService());

		ReflectionTestUtils.setField(
			accountService, "_keyedLock", new KeyedLock());

		return accountService;
	}

	private Map<String, Object> _getDefaultLicensingCustomFields(
		String billingCountry, String soldBy) {

		Map<String, Object> values = new HashMap<>();

		List<CustomField> customFields = ReflectionTestUtils.invokeMethod(
			new AccountService(), "_getDefaultLicensingCustomFields",
			billingCountry, soldBy);

		for (CustomField customField : customFields) {
			CustomValue customValue = customField.getCustomValue();

			values.put(customField.getName(), customValue.getData());
		}

		return values;
	}

}