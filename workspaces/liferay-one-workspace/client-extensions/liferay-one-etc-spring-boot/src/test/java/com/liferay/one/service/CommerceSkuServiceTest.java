/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOption;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOptionValue;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.headless.commerce.admin.catalog.client.problem.Problem;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionValueResource;
import com.liferay.one.constants.SkuOptionConstants;

import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName("[SVC-COMMERCESKUSERVICE] CommerceSkuService")
public class CommerceSkuServiceTest {

	@BeforeEach
	public void setUp() {
		_commerceSkuService = Mockito.spy(new CommerceSkuService());

		ReflectionTestUtils.setField(
			_commerceSkuService, "_commerceSkuService", _commerceSkuService);

		Mockito.doReturn(
			_productOptionResource
		).when(
			_commerceSkuService
		).buildProductOptionResource();

		Mockito.doReturn(
			_productOptionValueResource
		).when(
			_commerceSkuService
		).buildProductOptionValueResource();
	}

	@Test
	public void testFetchConsumptionRoleIsNullWithoutOption() throws Exception {
		_setUpSku(_createSku(_createSkuOption("machineType", "standard")));

		Assertions.assertNull(
			_commerceSkuService.fetchConsumptionRole(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testFetchConsumptionRoleIsNullWithoutOptions()
		throws Exception {

		_setUpSku(_createSku((SkuOption[])null));

		Assertions.assertNull(
			_commerceSkuService.fetchConsumptionRole(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testFetchConsumptionRoleIsNullWithoutSku() throws Exception {
		_setUpSku(null);

		Assertions.assertNull(
			_commerceSkuService.fetchConsumptionRole(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testFetchConsumptionRoleReadsOption() throws Exception {
		_setUpSku(
			_createSku(
				_createSkuOption("machineType", "standard"),
				_createSkuOption(
					SkuOptionConstants.KEY_CONSUMPTION_ROLE,
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ADD_ON)));

		Assertions.assertEquals(
			SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ADD_ON,
			_commerceSkuService.fetchConsumptionRole(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testGetSkuOptionsJSONIsEmptyWithoutSku() throws Exception {
		_setUpSku(null);

		Assertions.assertEquals(
			"[]",
			_commerceSkuService.getSkuOptionsJSON(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testGetSkuOptionsJSONNamesOptionValue() throws Exception {
		_setUpSku(_createSku(_createSkuOption("support-plans", "global")));
		_setUpProductOptionValue(
			_createProductOptionValue(
				"global", _PRODUCT_OPTION_VALUE_ID, "Global 24/7 Support"));

		JSONArray jsonArray = new JSONArray(
			_commerceSkuService.getSkuOptionsJSON(
				_SKU_EXTERNAL_REFERENCE_CODE));

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("support-plans", jsonObject.getString("key"));
		Assertions.assertEquals(
			"Support Plans", jsonObject.getString("skuOptionName"));
		Assertions.assertEquals(
			"Global 24/7 Support",
			jsonObject.getJSONArray(
				"skuOptionValueNames"
			).getString(
				0
			));
		Assertions.assertEquals(
			"global",
			jsonObject.getJSONArray(
				"value"
			).getString(
				0
			));
	}

	@Test
	public void testGetSkuOptionsJSONNamesOptionValueWithoutEnglishName()
		throws Exception {

		_setUpSku(_createSku(_createSkuOption("support-plans", "global")));

		ProductOptionValue productOptionValue = _createProductOptionValue(
			"global", _PRODUCT_OPTION_VALUE_ID, "Global 24/7 Support");

		productOptionValue.setName(Map.of("es_ES", "Soporte Global 24/7"));

		_setUpProductOptionValue(productOptionValue);

		JSONArray jsonArray = new JSONArray(
			_commerceSkuService.getSkuOptionsJSON(
				_SKU_EXTERNAL_REFERENCE_CODE));

		Assertions.assertEquals(
			"Soporte Global 24/7",
			jsonArray.getJSONObject(
				0
			).getJSONArray(
				"skuOptionValueNames"
			).getString(
				0
			));
	}

	@Test
	public void testGetSkuOptionsJSONSkipsMissingOptionValue()
		throws Exception {

		_setUpSku(_createSku(_createSkuOption("support-plans", "global")));

		Problem problem = new Problem();

		problem.setStatus("NOT_FOUND");

		Mockito.when(
			_productOptionValueResource.getProductOptionValue(
				_PRODUCT_OPTION_VALUE_ID)
		).thenThrow(
			new Problem.ProblemException(problem)
		);

		Assertions.assertEquals(
			"[]",
			_commerceSkuService.getSkuOptionsJSON(
				_SKU_EXTERNAL_REFERENCE_CODE));
	}

	private ProductOptionValue _createProductOptionValue(
		String key, long id, String name) {

		ProductOptionValue productOptionValue = new ProductOptionValue();

		productOptionValue.setId(id);
		productOptionValue.setKey(key);
		productOptionValue.setName(Map.of("en_US", name));

		return productOptionValue;
	}

	private Sku _createSku(SkuOption... skuOptions) {
		Sku sku = new Sku();

		sku.setExternalReferenceCode(_SKU_EXTERNAL_REFERENCE_CODE);
		sku.setSkuOptions(skuOptions);

		return sku;
	}

	private SkuOption _createSkuOption(String key, String value) {
		SkuOption skuOption = new SkuOption();

		skuOption.setKey(key);
		skuOption.setOptionId(_PRODUCT_OPTION_ID);
		skuOption.setOptionValueId(_PRODUCT_OPTION_VALUE_ID);
		skuOption.setValue(value);

		return skuOption;
	}

	private void _setUpProductOptionValue(ProductOptionValue productOptionValue)
		throws Exception {

		ProductOption productOption = new ProductOption();

		productOption.setName(Map.of("en_US", "Support Plans"));

		Mockito.when(
			_productOptionResource.getProductOption(_PRODUCT_OPTION_ID)
		).thenReturn(
			productOption
		);

		Mockito.when(
			_productOptionValueResource.getProductOptionValue(
				_PRODUCT_OPTION_VALUE_ID)
		).thenReturn(
			productOptionValue
		);
	}

	private void _setUpSku(Sku sku) throws Exception {
		Mockito.doReturn(
			sku
		).when(
			_commerceSkuService
		).fetchSku(
			_SKU_EXTERNAL_REFERENCE_CODE
		);
	}

	private static final long _PRODUCT_OPTION_ID = 38216288L;

	private static final long _PRODUCT_OPTION_VALUE_ID = 38216294L;

	private static final String _SKU_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET";

	private CommerceSkuService _commerceSkuService;
	private final ProductOptionResource _productOptionResource = Mockito.mock(
		ProductOptionResource.class);
	private final ProductOptionValueResource _productOptionValueResource =
		Mockito.mock(ProductOptionValueResource.class);

}