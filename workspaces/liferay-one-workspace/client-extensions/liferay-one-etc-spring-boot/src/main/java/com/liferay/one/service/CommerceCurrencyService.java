/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.CurrencyResource;
import com.liferay.petra.string.StringBundler;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class CommerceCurrencyService extends OneBaseService {

	@Cacheable(
		unless = "#result == null||#result.active != true", value = "currency"
	)
	public Currency fetchCurrency(String currencyIsoCode) throws Exception {
		CurrencyResource currencyResource = _buildCurrencyResource();

		return currencyResource.getCurrenciesPage(
			null,
			StringBundler.concat(
				"code eq '", escapeODataString(currencyIsoCode), "'"),
			Pagination.of(1, 1), null
		).fetchFirstItem();
	}

	private CurrencyResource _buildCurrencyResource() {
		return CurrencyResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

}