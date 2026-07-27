/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Catalog;
import com.liferay.headless.commerce.admin.pricing.client.dto.v2_0.PriceList;
import com.liferay.headless.commerce.admin.pricing.client.problem.Problem;
import com.liferay.headless.commerce.admin.pricing.client.resource.v2_0.PriceListResource;
import com.liferay.one.constants.CommerceCatalogConstants;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class CommercePriceListService extends OneBaseService {

	public PriceList fetchOrAddPriceList(
			String currencyCode, String externalReferenceCode, String name)
		throws Exception {

		PriceListResource priceListResource = PriceListResource.builder(
		).endpoint(
			lxcDXPMainDomain, lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();

		PriceList existingPriceList = _fetchPriceList(
			externalReferenceCode, priceListResource);

		if (existingPriceList != null) {
			return existingPriceList;
		}

		Catalog catalog = _commerceCatalogService.fetchCatalog(
			CommerceCatalogConstants.
				EXTERNAL_REFERENCE_CODE_SALESFORCE_CATALOG);

		if (catalog == null) {
			return null;
		}

		PriceList priceList = new PriceList();

		priceList.setActive(() -> Boolean.TRUE);
		priceList.setCatalogId(catalog::getId);
		priceList.setCurrencyCode(() -> currencyCode);
		priceList.setName(() -> name);
		priceList.setType(() -> PriceList.Type.PRICE_LIST);

		return priceListResource.putPriceListByExternalReferenceCode(
			externalReferenceCode, priceList);
	}

	private PriceList _fetchPriceList(
			String externalReferenceCode, PriceListResource priceListResource)
		throws Exception {

		try {
			return priceListResource.getPriceListByExternalReferenceCode(
				externalReferenceCode);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	@Autowired
	private CommerceCatalogService _commerceCatalogService;

}