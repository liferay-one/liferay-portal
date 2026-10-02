/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.one.constants.SkuOptionConstants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SVC-COMMERCESKUSERVICE] CommerceSkuService")
public class CommerceSkuServiceTest {

	@BeforeEach
	public void setUp() {
		_commerceSkuService = Mockito.spy(new CommerceSkuService());
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

	private Sku _createSku(SkuOption... skuOptions) {
		Sku sku = new Sku();

		sku.setExternalReferenceCode(_SKU_EXTERNAL_REFERENCE_CODE);
		sku.setSkuOptions(skuOptions);

		return sku;
	}

	private SkuOption _createSkuOption(String key, String value) {
		SkuOption skuOption = new SkuOption();

		skuOption.setKey(key);
		skuOption.setValue(value);

		return skuOption;
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

	private static final String _SKU_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET";

	private CommerceSkuService _commerceSkuService;

}