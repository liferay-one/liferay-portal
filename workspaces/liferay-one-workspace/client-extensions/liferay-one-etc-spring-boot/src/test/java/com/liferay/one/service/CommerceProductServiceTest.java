/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Catalog;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductResource;
import com.liferay.one.exception.NoSuchProductException;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
public class CommerceProductServiceTest {

	@BeforeEach
	public void setUp() {
		_commerceProductService = Mockito.spy(new CommerceProductService());

		ReflectionTestUtils.setField(
			_commerceProductService, "_commerceCatalogService",
			_commerceCatalogService);
		ReflectionTestUtils.setField(
			_commerceProductService, "_commerceSkuService",
			_commerceSkuService);

		Mockito.doReturn(
			_productResource
		).when(
			_commerceProductService
		).buildProductResource();
	}

	@Test
	public void testDeactivateProductDeactivatesProductWhenNoOtherSkuIsPublished()
		throws Exception {

		_setUpSku(_SALESFORCE_PRODUCT_ID, false);

		_setUpSkus(
			_createSku(_SALESFORCE_PRODUCT_ID, false),
			_createSku("PROD-2", false));

		_commerceProductService.deactivateProduct(_SALESFORCE_PRODUCT_ID);

		Assertions.assertFalse(_capturePatchedSku().getPublished());

		Product product = _capturePatchedProduct();

		Assertions.assertFalse(product.getActive());
	}

	@Test
	public void testDeactivateProductIgnoresAbsentSku() throws Exception {
		_commerceProductService.deactivateProduct(_SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_commerceSkuService, Mockito.never()
		).getSkus(
			Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(_productResource);
	}

	@Test
	public void testDeactivateProductUnpublishesSkuWhenOtherSkuIsPublished()
		throws Exception {

		_setUpSku(_SALESFORCE_PRODUCT_ID, false);

		_setUpSkus(
			_createSku(_SALESFORCE_PRODUCT_ID, false),
			_createSku("PROD-2", true));

		_commerceProductService.deactivateProduct(_SALESFORCE_PRODUCT_ID);

		Assertions.assertFalse(_capturePatchedSku().getPublished());

		Mockito.verifyNoInteractions(_productResource);
	}

	@Test
	public void testGetProductReturnsProduct() throws Exception {
		Product product = new Product();

		Mockito.when(
			_productResource.getProduct(_PRODUCT_ID)
		).thenReturn(
			product
		);

		Assertions.assertSame(
			product, _commerceProductService.getProduct(_PRODUCT_ID));
	}

	@Test
	public void testGetProductThrowsWhenProductIsAbsent() {
		Assertions.assertThrows(
			NoSuchProductException.class,
			() -> _commerceProductService.getProduct(_PRODUCT_ID));
	}

	@Test
	public void testUpdateProductAddsProductAndSkuForUnknownProductGroup()
		throws Exception {

		Product product = new Product();

		product.setId(_PRODUCT_ID);

		_setUpCatalog();

		Mockito.when(
			_productResource.postProduct(Mockito.any())
		).thenReturn(
			product
		);

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Product addedProduct = _captureAddedProduct();

		Assertions.assertTrue(addedProduct.getActive());
		Assertions.assertEquals(_CATALOG_ID, addedProduct.getCatalogId());
		Assertions.assertEquals(
			_PRODUCT_GROUP, addedProduct.getExternalReferenceCode());

		Map<String, String> name = addedProduct.getName();

		Assertions.assertEquals("Widget", name.get("en_US"));

		Sku addedSku = _captureAddedSku();

		Assertions.assertEquals(
			_SALESFORCE_PRODUCT_ID, addedSku.getExternalReferenceCode());
		Assertions.assertTrue(addedSku.getPublished());
		Assertions.assertTrue(addedSku.getPurchasable());
	}

	@Test
	public void testUpdateProductAddsSkuToKnownProductGroup() throws Exception {
		Product product = new Product();

		product.setId(_PRODUCT_ID);

		Mockito.when(
			_productResource.getProductByExternalReferenceCode(_PRODUCT_GROUP)
		).thenReturn(
			product
		);

		_setUpSkus(
			_createSku(_SALESFORCE_PRODUCT_ID, true),
			_createSku("PROD-2", true));

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_productResource, Mockito.never()
		).postProduct(
			Mockito.any()
		);

		Assertions.assertEquals(
			_SALESFORCE_PRODUCT_ID,
			_captureAddedSku().getExternalReferenceCode());

		Product patchedProduct = _capturePatchedProduct();

		Assertions.assertTrue(patchedProduct.getActive());
		Assertions.assertNull(patchedProduct.getName());
	}

	@Test
	public void testUpdateProductIgnoresAbsentSkuWithoutCatalog()
		throws Exception {

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_productResource, Mockito.never()
		).postProduct(
			Mockito.any()
		);

		Mockito.verify(
			_commerceSkuService, Mockito.never()
		).addSku(
			Mockito.anyString(), Mockito.any()
		);
	}

	@Test
	public void testUpdateProductIgnoresAbsentSkuWithoutProductGroup()
		throws Exception {

		_commerceProductService.updateProduct(
			"A description", "Widget", null, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_commerceSkuService, Mockito.never()
		).getSkus(
			Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(_productResource);
	}

	@Test
	public void testUpdateProductReactivatesProductWithSeveralSkusWithoutRenaming()
		throws Exception {

		Sku sku = _setUpSku(_SALESFORCE_PRODUCT_ID, true);

		_setUpSkus(sku, _createSku("PROD-2", true));

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Assertions.assertTrue(_capturePatchedSku().getPublished());

		Product product = _capturePatchedProduct();

		Assertions.assertTrue(product.getActive());
		Assertions.assertNull(product.getDescription());
		Assertions.assertNull(product.getName());
	}

	@Test
	public void testUpdateProductUpdatesProductWithSingleSku()
		throws Exception {

		Sku sku = _setUpSku(_SALESFORCE_PRODUCT_ID, true);

		_setUpSkus(sku);

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Assertions.assertTrue(_capturePatchedSku().getPublished());

		Product product = _capturePatchedProduct();

		Assertions.assertTrue(product.getActive());

		Map<String, String> description = product.getDescription();

		Assertions.assertEquals("A description", description.get("en_US"));

		Map<String, String> name = product.getName();

		Assertions.assertEquals("Widget", name.get("en_US"));
	}

	private Product _captureAddedProduct() throws Exception {
		ArgumentCaptor<Product> productArgumentCaptor = ArgumentCaptor.forClass(
			Product.class);

		Mockito.verify(
			_productResource
		).postProduct(
			productArgumentCaptor.capture()
		);

		return productArgumentCaptor.getValue();
	}

	private Sku _captureAddedSku() throws Exception {
		ArgumentCaptor<Sku> skuArgumentCaptor = ArgumentCaptor.forClass(
			Sku.class);

		Mockito.verify(
			_commerceSkuService
		).addSku(
			Mockito.eq(_PRODUCT_GROUP), skuArgumentCaptor.capture()
		);

		return skuArgumentCaptor.getValue();
	}

	private Product _capturePatchedProduct() throws Exception {
		ArgumentCaptor<Product> productArgumentCaptor = ArgumentCaptor.forClass(
			Product.class);

		Mockito.verify(
			_productResource
		).patchProduct(
			Mockito.eq(_PRODUCT_ID), productArgumentCaptor.capture()
		);

		return productArgumentCaptor.getValue();
	}

	private Sku _capturePatchedSku() throws Exception {
		ArgumentCaptor<Sku> skuArgumentCaptor = ArgumentCaptor.forClass(
			Sku.class);

		Mockito.verify(
			_commerceSkuService
		).patchSku(
			Mockito.eq(_SALESFORCE_PRODUCT_ID), skuArgumentCaptor.capture()
		);

		return skuArgumentCaptor.getValue();
	}

	private Sku _createSku(String externalReferenceCode, boolean published) {
		Sku sku = new Sku();

		sku.setExternalReferenceCode(externalReferenceCode);
		sku.setProductId(_PRODUCT_ID);
		sku.setPublished(published);

		return sku;
	}

	private void _setUpCatalog() throws Exception {
		Catalog catalog = new Catalog();

		catalog.setId(_CATALOG_ID);

		Mockito.when(
			_commerceCatalogService.fetchCatalog("LIFERAY_INC_CATALOG")
		).thenReturn(
			catalog
		);
	}

	private Sku _setUpSku(String externalReferenceCode, boolean published)
		throws Exception {

		Sku sku = _createSku(externalReferenceCode, published);

		Mockito.when(
			_commerceSkuService.patchSku(
				Mockito.eq(externalReferenceCode), Mockito.any())
		).thenReturn(
			sku
		);

		return sku;
	}

	private void _setUpSkus(Sku... skus) throws Exception {
		Mockito.when(
			_commerceSkuService.getSkus(_PRODUCT_ID)
		).thenReturn(
			List.of(skus)
		);
	}

	private static final long _CATALOG_ID = 55;

	private static final String _PRODUCT_GROUP = "PRDCT-AI-HUB";

	private static final long _PRODUCT_ID = 77;

	private static final String _SALESFORCE_PRODUCT_ID = "PROD-1";

	private final CommerceCatalogService _commerceCatalogService = Mockito.mock(
		CommerceCatalogService.class);
	private CommerceProductService _commerceProductService;
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final ProductResource _productResource = Mockito.mock(
		ProductResource.class);

}