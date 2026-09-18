/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Felipe Franca
 */
public class CommerceCurrencyServiceTest {

	@Test
	public void testFetchCurrencyIdReturnsIdWhenCurrencyIsActive()
		throws Exception {

		TestCommerceCurrencyService testCommerceCurrencyService =
			new TestCommerceCurrencyService();

		testCommerceCurrencyService.currency = _createCurrency(true);

		Assertions.assertEquals(
			_CURRENCY_ID, testCommerceCurrencyService.fetchCurrencyId("EUR"));
	}

	@Test
	public void testFetchCurrencyIdReturnsNullWhenCurrencyIsInactive()
		throws Exception {

		TestCommerceCurrencyService testCommerceCurrencyService =
			new TestCommerceCurrencyService();

		testCommerceCurrencyService.currency = _createCurrency(false);

		Assertions.assertNull(
			testCommerceCurrencyService.fetchCurrencyId("EUR"));
	}

	@Test
	public void testFetchCurrencyIdReturnsNullWhenCurrencyIsMissing()
		throws Exception {

		TestCommerceCurrencyService testCommerceCurrencyService =
			new TestCommerceCurrencyService();

		Assertions.assertNull(
			testCommerceCurrencyService.fetchCurrencyId("EUR"));
	}

	private Currency _createCurrency(boolean active) {
		Currency currency = new Currency();

		currency.setActive(active);
		currency.setId(_CURRENCY_ID);

		return currency;
	}

	private static final long _CURRENCY_ID = 1000L;

	private static class TestCommerceCurrencyService
		extends CommerceCurrencyService {

		@Override
		public Currency fetchCurrency(String currencyIsoCode) {
			return currency;
		}

		public Currency currency;

	}

}