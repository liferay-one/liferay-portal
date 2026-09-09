/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.EntitlementDefinitionService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class EntitlementDefinitionsRestControllerTest {

	@BeforeEach
	public void setUp() {
		_entitlementDefinitionsRestController =
			new EntitlementDefinitionsRestController();

		ReflectionTestUtils.setField(
			_entitlementDefinitionsRestController, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_entitlementDefinitionsRestController,
			"_entitlementDefinitionService", _entitlementDefinitionService);
	}

	@Test
	public void testPostGeneratesForApprovedProduct() throws Exception {
		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct(0)
		);

		_entitlementDefinitionsRestController.
			postEntitlementDefinitionsGenerate(_C_PRODUCT_ID);

		Mockito.verify(
			_entitlementDefinitionService
		).generateEntitlementDefinition(
			_C_PRODUCT_ID
		);
	}

	@Test
	public void testPostSkipsMissingProduct() throws Exception {
		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			null
		);

		_entitlementDefinitionsRestController.
			postEntitlementDefinitionsGenerate(_C_PRODUCT_ID);

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
	}

	@Test
	public void testPostSkipsUnapprovedProduct() throws Exception {
		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct(2)
		);

		_entitlementDefinitionsRestController.
			postEntitlementDefinitionsGenerate(_C_PRODUCT_ID);

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
	}

	private Product _createProduct(int productStatus) {
		Product product = new Product();

		product.setProductStatus(productStatus);

		return product;
	}

	private static final long _C_PRODUCT_ID = 3000L;

	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final EntitlementDefinitionService _entitlementDefinitionService =
		Mockito.mock(EntitlementDefinitionService.class);
	private EntitlementDefinitionsRestController
		_entitlementDefinitionsRestController;

}