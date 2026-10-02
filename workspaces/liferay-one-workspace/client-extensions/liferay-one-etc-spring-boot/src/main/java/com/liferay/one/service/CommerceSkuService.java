/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.problem.Problem;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.SkuResource;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class CommerceSkuService extends OneBaseService {

	public Sku addSku(String productExternalReferenceCode, Sku sku)
		throws Exception {

		SkuResource skuResource = _buildSkuResource();

		return skuResource.postProductByExternalReferenceCodeSku(
			productExternalReferenceCode, sku);
	}

	public Long fetchProductId(String skuExternalReferenceCode)
		throws Exception {

		Sku sku = _commerceSkuService.fetchSku(skuExternalReferenceCode);

		if (sku == null) {
			return null;
		}

		return sku.getProductId();
	}

	@Cacheable(unless = "#result == null", value = "sku")
	public Sku fetchSku(String externalReferenceCode) throws Exception {
		SkuResource skuResource = _buildSkuResource();

		try {
			return skuResource.getSkuByExternalReferenceCode(
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

	public List<Sku> getSkus(long productId) throws Exception {
		SkuResource skuResource = _buildSkuResource();

		Page<Sku> skusPage = skuResource.getProductIdSkusPage(
			productId, Pagination.of(1, _PAGE_SIZE));

		return new ArrayList<>(skusPage.getItems());
	}

	@CacheEvict(allEntries = true, cacheNames = "sku")
	public Sku patchSku(String externalReferenceCode, Sku sku)
		throws Exception {

		SkuResource skuResource = _buildSkuResource();

		try {
			return skuResource.patchSkuByExternalReferenceCode(
				externalReferenceCode, sku);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	private SkuResource _buildSkuResource() {
		return SkuResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	private static final int _PAGE_SIZE = 500;

	@Autowired
	@Lazy
	private CommerceSkuService _commerceSkuService;

}