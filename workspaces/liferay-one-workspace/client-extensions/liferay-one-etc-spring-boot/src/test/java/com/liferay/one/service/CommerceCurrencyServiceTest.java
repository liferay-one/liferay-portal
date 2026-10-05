/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.CurrencyResource;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-COMMERCECURRENCYSERVICE] CommerceCurrencyService")
public class CommerceCurrencyServiceTest {

	@BeforeEach
	public void setUp() {
		CurrencyResource.Builder builder = Mockito.mock(
			CurrencyResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_currencyResource
		);

		_currencyResourceMockedStatic = Mockito.mockStatic(
			CurrencyResource.class);

		_currencyResourceMockedStatic.when(
			CurrencyResource::builder
		).thenReturn(
			builder
		);
	}

	@AfterEach
	public void tearDown() {
		_currencyResourceMockedStatic.close();
	}

	@Test
	public void testFetchCurrencyEscapesTheISOCodeAndReadsOneItem()
		throws Exception {

		_whenGetCurrenciesPage(null);

		_commerceCurrencyService.fetchCurrency("U'SD");

		ArgumentCaptor<Pagination> argumentCaptor = ArgumentCaptor.forClass(
			Pagination.class);

		Mockito.verify(
			_currencyResource
		).getCurrenciesPage(
			ArgumentMatchers.isNull(), ArgumentMatchers.eq("code eq 'U''SD'"),
			argumentCaptor.capture(), ArgumentMatchers.isNull()
		);

		Pagination pagination = argumentCaptor.getValue();

		Assertions.assertEquals(1, pagination.getPage());
		Assertions.assertEquals(1, pagination.getPageSize());
	}

	@Test
	public void testFetchCurrencyReturnsFirstItem() throws Exception {
		Currency currency = new Currency();

		_whenGetCurrenciesPage(currency);

		Assertions.assertSame(
			currency, _commerceCurrencyService.fetchCurrency("USD"));
	}

	@Test
	public void testFetchCurrencyReturnsNullWhenNoCurrencyMatches()
		throws Exception {

		_whenGetCurrenciesPage(null);

		Assertions.assertNull(_commerceCurrencyService.fetchCurrency("XYZ"));
	}

	private void _whenGetCurrenciesPage(Currency currency) throws Exception {
		Page<Currency> page = Mockito.mock(Page.class);

		Mockito.when(
			page.fetchFirstItem()
		).thenReturn(
			currency
		);

		Mockito.when(
			_currencyResource.getCurrenciesPage(
				ArgumentMatchers.any(), ArgumentMatchers.anyString(),
				ArgumentMatchers.any(Pagination.class), ArgumentMatchers.any())
		).thenReturn(
			page
		);
	}

	private final CommerceCurrencyService _commerceCurrencyService =
		new CommerceCurrencyService() {

			@Override
			protected String getAuthorization() {
				return "Bearer test";
			}

			@Override
			protected String getDXPEndpointAddress() {
				return "localhost:8080";
			}

		};

	private final CurrencyResource _currencyResource = Mockito.mock(
		CurrencyResource.class);
	private MockedStatic<CurrencyResource> _currencyResourceMockedStatic;

}