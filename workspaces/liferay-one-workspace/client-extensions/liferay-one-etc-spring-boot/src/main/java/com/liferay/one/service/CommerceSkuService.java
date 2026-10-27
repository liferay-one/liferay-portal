/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOption;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOptionValue;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Pagination;
import com.liferay.headless.commerce.admin.catalog.client.problem.Problem;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionValueResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.SkuResource;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.util.CommerceOrderUtil;
import com.liferay.petra.string.StringBundler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

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

	/**
	 * Returns the <code>consumption-role</code> option value of the SKU, which
	 * tells a consumable product's SKUs apart. Returns <code>null</code> when
	 * the SKU does not exist or carries no such option, which callers read as
	 * the base allotment.
	 */
	@Cacheable("skuConsumptionRole")
	public String fetchConsumptionRole(String skuExternalReferenceCode)
		throws Exception {

		Sku sku = fetchSku(skuExternalReferenceCode);

		if (sku == null) {
			return null;
		}

		SkuOption[] skuOptions = sku.getSkuOptions();

		if (skuOptions == null) {
			return null;
		}

		return CommerceOrderUtil.getSkuOptionValue(
			SkuOptionConstants.KEY_CONSUMPTION_ROLE, skuOptions);
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

	/**
	 * Returns the options of the SKU as order item options JSON, with the
	 * name of each option and option value. An order item that sets its own
	 * options replaces the options that Liferay derives from the SKU, so the
	 * caller sends these with its own to keep the SKU option value names.
	 */
	@Cacheable("skuOptionsJSON")
	public String getSkuOptionsJSON(String skuExternalReferenceCode)
		throws Exception {

		JSONArray jsonArray = new JSONArray();

		Sku sku = _commerceSkuService.fetchSku(skuExternalReferenceCode);

		if ((sku == null) || (sku.getSkuOptions() == null)) {
			return jsonArray.toString();
		}

		ProductOptionResource productOptionResource =
			buildProductOptionResource();
		ProductOptionValueResource productOptionValueResource =
			buildProductOptionValueResource();

		for (SkuOption skuOption : sku.getSkuOptions()) {
			ProductOptionValue productOptionValue = _fetchProductOptionValue(
				productOptionValueResource, skuOption.getOptionValueId());

			if (productOptionValue == null) {
				if (_log.isWarnEnabled()) {
					_log.warn(
						StringBundler.concat(
							"Unable to find the value of option ",
							skuOption.getKey(), " for SKU ",
							skuExternalReferenceCode));
				}

				continue;
			}

			ProductOption productOption =
				productOptionResource.getProductOption(skuOption.getOptionId());

			jsonArray.put(
				new JSONObject(
				).put(
					"key", skuOption.getKey()
				).put(
					"skuOptionName", _getName(productOption.getName())
				).put(
					"skuOptionValueNames",
					new JSONArray(
					).put(
						_getName(productOptionValue.getName())
					)
				).put(
					"value",
					new JSONArray(
					).put(
						skuOption.getValue()
					)
				));
		}

		return jsonArray.toString();
	}

	public List<Sku> getSkus(long productId) throws Exception {
		SkuResource skuResource = _buildSkuResource();

		Page<Sku> skusPage = skuResource.getProductIdSkusPage(
			productId, Pagination.of(1, _PAGE_SIZE));

		return new ArrayList<>(skusPage.getItems());
	}

	@CacheEvict(allEntries = true, cacheNames = {"sku", "skuOptionsJSON"})
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

	protected ProductOptionResource buildProductOptionResource() {
		return ProductOptionResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	protected ProductOptionValueResource buildProductOptionValueResource() {
		return ProductOptionValueResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	private SkuResource _buildSkuResource() {
		return SkuResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	private ProductOptionValue _fetchProductOptionValue(
			ProductOptionValueResource productOptionValueResource,
			Long productOptionValueId)
		throws Exception {

		if (productOptionValueId == null) {
			return null;
		}

		try {
			return productOptionValueResource.getProductOptionValue(
				productOptionValueId);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	private String _getName(Map<String, String> nameMap) {
		if (nameMap == null) {
			return null;
		}

		String name = nameMap.get("en_US");

		if (name != null) {
			return name;
		}

		for (String value : nameMap.values()) {
			if (value != null) {
				return value;
			}
		}

		return null;
	}

	private static final int _PAGE_SIZE = 500;

	private static final Log _log = LogFactory.getLog(CommerceSkuService.class);

	@Autowired
	@Lazy
	private CommerceSkuService _commerceSkuService;

}