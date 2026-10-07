/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Catalog;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Option;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOption;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductOptionValue;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.headless.commerce.admin.catalog.client.pagination.Page;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.OptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductOptionValueResource;
import com.liferay.headless.commerce.admin.catalog.client.resource.v1_0.ProductResource;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.exception.NoSuchProductException;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName("[SVC-COMMERCEPRODUCTSERVICE] CommerceProductService")
public class CommerceProductServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_commerceProductService = Mockito.spy(new CommerceProductService());

		ReflectionTestUtils.setField(
			_commerceProductService, "_commerceCatalogService",
			_commerceCatalogService);
		ReflectionTestUtils.setField(
			_commerceProductService, "_commerceSkuService",
			_commerceSkuService);

		Mockito.doReturn(
			_optionResource
		).when(
			_commerceProductService
		).buildOptionResource();

		Mockito.doReturn(
			_productResource
		).when(
			_commerceProductService
		).buildProductResource();

		Mockito.doReturn(
			_productOptionResource
		).when(
			_commerceProductService
		).buildProductOptionResource();

		Mockito.doReturn(
			_productOptionValueResource
		).when(
			_commerceProductService
		).buildProductOptionValueResource();

		_setUpSalesforceProductOption();
		_setUpProductOptionValues();
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

		product.setProductId(_PRODUCT_ID);

		_setUpCatalog();

		Mockito.when(
			_productResource.postProduct(Mockito.any())
		).thenReturn(
			product
		);

		Mockito.when(
			_productOptionResource.getProductIdProductOptionsPage(
				Mockito.eq(_PRODUCT_ID), Mockito.isNull(), Mockito.any(),
				Mockito.isNull())
		).thenReturn(
			_toPage(), _toPage(_createSalesforceProductOption())
		);

		_setUpProductOptionValues();

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

		_assertSkuOption(addedSku);

		ProductOption addedProductOption = _captureAddedProductOption();

		Assertions.assertEquals(
			CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
			addedProductOption.getKey());
		Assertions.assertEquals(
			CommerceProductConstants.
				OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT,
			addedProductOption.getOptionExternalReferenceCode());
		Assertions.assertTrue(addedProductOption.getSkuContributor());

		ProductOptionValue addedProductOptionValue =
			_captureAddedProductOptionValue();

		Assertions.assertEquals(
			_SKU_OPTION_VALUE_KEY, addedProductOptionValue.getKey());

		Map<String, String> productOptionValueName =
			addedProductOptionValue.getName();

		Assertions.assertEquals("Widget", productOptionValueName.get("en_US"));
	}

	@Test
	public void testUpdateProductAddsSalesforceOptionWhenAbsent()
		throws Exception {

		_setUpKnownProduct();

		Mockito.when(
			_productOptionResource.getProductIdProductOptionsPage(
				Mockito.eq(_PRODUCT_ID), Mockito.isNull(), Mockito.any(),
				Mockito.isNull())
		).thenReturn(
			_toPage(), _toPage(_createSalesforceProductOption())
		);

		_setUpProductOptionValues();

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		ArgumentCaptor<Option> optionArgumentCaptor = ArgumentCaptor.forClass(
			Option.class);

		Mockito.verify(
			_optionResource
		).postOption(
			optionArgumentCaptor.capture()
		);

		Option option = optionArgumentCaptor.getValue();

		Assertions.assertEquals(
			CommerceProductConstants.
				OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT,
			option.getExternalReferenceCode());
		Assertions.assertEquals(
			CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
			option.getKey());
		Assertions.assertTrue(option.getSkuContributor());
	}

	@Test
	public void testUpdateProductAddsSalesforceProductOptionToExistingSku()
		throws Exception {

		Sku sku = _setUpSku(_SALESFORCE_PRODUCT_ID, false);

		SkuOption skuOption = new SkuOption();

		skuOption.setKey("ai-hub-license-usage-type");
		skuOption.setValue("activate");

		sku.setSkuOptions(new SkuOption[] {skuOption});

		_setUpSkus(sku);

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Sku patchedSku = _capturePatchedSku();

		Assertions.assertTrue(patchedSku.getPublished());
		Assertions.assertTrue(patchedSku.getPurchasable());

		SkuOption[] skuOptions = patchedSku.getSkuOptions();

		Assertions.assertEquals(2, skuOptions.length);
		Assertions.assertEquals(
			"ai-hub-license-usage-type", skuOptions[0].getKey());
		Assertions.assertEquals("activate", skuOptions[0].getValue());
		Assertions.assertEquals(
			CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
			skuOptions[1].getKey());
		Assertions.assertEquals(
			_SKU_OPTION_VALUE_KEY, skuOptions[1].getValue());

		Assertions.assertEquals(
			_SKU_OPTION_VALUE_KEY, _captureAddedProductOptionValue().getKey());

		Mockito.verify(
			_commerceSkuService, Mockito.never()
		).addSku(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testUpdateProductAddsSkuToKnownProductGroup() throws Exception {
		Product product = new Product();

		product.setProductId(_PRODUCT_ID);

		Mockito.when(
			_productResource.getProductByExternalReferenceCode(_PRODUCT_GROUP)
		).thenReturn(
			product
		);

		_setUpSalesforceProductOption();
		_setUpProductOptionValues(_createProductOptionValue("prod-2"));
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

		Mockito.verify(
			_productOptionResource, Mockito.never()
		).postProductIdProductOptionsPage(
			Mockito.anyLong(), Mockito.any()
		);

		Assertions.assertEquals(
			_SKU_OPTION_VALUE_KEY, _captureAddedProductOptionValue().getKey());

		Sku addedSku = _captureAddedSku();

		Assertions.assertEquals(
			_SALESFORCE_PRODUCT_ID, addedSku.getExternalReferenceCode());

		_assertSkuOption(addedSku);

		Product patchedProduct = _capturePatchedProduct();

		Assertions.assertTrue(patchedProduct.getActive());
		Assertions.assertNull(patchedProduct.getName());
	}

	@Test
	public void testUpdateProductDoesNotAddSalesforceOptionWhenPresent()
		throws Exception {

		_setUpKnownProduct();

		Mockito.when(
			_optionResource.getOptionByExternalReferenceCode(
				CommerceProductConstants.
					OPTION_EXTERNAL_REFERENCE_CODE_SALESFORCE_PRODUCT)
		).thenReturn(
			new Option()
		);

		Mockito.when(
			_productOptionResource.getProductIdProductOptionsPage(
				Mockito.eq(_PRODUCT_ID), Mockito.isNull(), Mockito.any(),
				Mockito.isNull())
		).thenReturn(
			_toPage(), _toPage(_createSalesforceProductOption())
		);

		_setUpProductOptionValues();

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_optionResource, Mockito.never()
		).postOption(
			Mockito.any()
		);

		_assertSkuOption(_captureAddedSku());
	}

	@Test
	public void testUpdateProductDoesNotAddSkuThatAnotherSyncAdded()
		throws Exception {

		Mockito.when(
			_commerceSkuService.fetchSku(_SALESFORCE_PRODUCT_ID)
		).thenReturn(
			null, _createSku(_SALESFORCE_PRODUCT_ID, true)
		);

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_commerceSkuService, Mockito.never()
		).addSku(
			Mockito.any(), Mockito.any()
		);

		Mockito.verify(
			_productResource, Mockito.never()
		).postProduct(
			Mockito.any()
		);
	}

	@Test
	public void testUpdateProductDoesNotDuplicateExistingOptionValue()
		throws Exception {

		Product product = new Product();

		product.setProductId(_PRODUCT_ID);

		Mockito.when(
			_productResource.getProductByExternalReferenceCode(_PRODUCT_GROUP)
		).thenReturn(
			product
		);

		_setUpSalesforceProductOption();
		_setUpProductOptionValues(
			_createProductOptionValue(_SKU_OPTION_VALUE_KEY));
		_setUpSkus(
			_createSku(_SALESFORCE_PRODUCT_ID, true),
			_createSku("PROD-2", true));

		_commerceProductService.updateProduct(
			"A description", "Widget", _PRODUCT_GROUP, _SALESFORCE_PRODUCT_ID);

		Mockito.verify(
			_productOptionValueResource, Mockito.never()
		).postProductOptionIdProductOptionValue(
			Mockito.anyLong(), Mockito.any()
		);

		_assertSkuOption(_captureAddedSku());
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

	private void _assertSkuOption(Sku sku) {
		SkuOption[] skuOptions = sku.getSkuOptions();

		Assertions.assertEquals(1, skuOptions.length);
		Assertions.assertEquals(
			CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT,
			skuOptions[0].getKey());
		Assertions.assertEquals(
			_SKU_OPTION_VALUE_KEY, skuOptions[0].getValue());
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

	private ProductOption _captureAddedProductOption() throws Exception {
		ArgumentCaptor<ProductOption[]> productOptionsArgumentCaptor =
			ArgumentCaptor.forClass(ProductOption[].class);

		Mockito.verify(
			_productOptionResource
		).postProductIdProductOptionsPage(
			Mockito.eq(_PRODUCT_ID), productOptionsArgumentCaptor.capture()
		);

		ProductOption[] productOptions =
			productOptionsArgumentCaptor.getValue();

		return productOptions[0];
	}

	private ProductOptionValue _captureAddedProductOptionValue()
		throws Exception {

		ArgumentCaptor<ProductOptionValue> productOptionValueArgumentCaptor =
			ArgumentCaptor.forClass(ProductOptionValue.class);

		Mockito.verify(
			_productOptionValueResource
		).postProductOptionIdProductOptionValue(
			Mockito.eq(_PRODUCT_OPTION_ID),
			productOptionValueArgumentCaptor.capture()
		);

		return productOptionValueArgumentCaptor.getValue();
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

	private ProductOptionValue _createProductOptionValue(String key) {
		ProductOptionValue productOptionValue = new ProductOptionValue();

		productOptionValue.setKey(key);

		return productOptionValue;
	}

	private ProductOption _createSalesforceProductOption() {
		ProductOption productOption = new ProductOption();

		productOption.setId(_PRODUCT_OPTION_ID);
		productOption.setKey(
			CommerceProductConstants.OPTION_KEY_SALESFORCE_PRODUCT);

		return productOption;
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

	private Product _setUpKnownProduct() throws Exception {
		Product product = new Product();

		product.setProductId(_PRODUCT_ID);

		Mockito.when(
			_productResource.getProductByExternalReferenceCode(_PRODUCT_GROUP)
		).thenReturn(
			product
		);

		return product;
	}

	private void _setUpProductOptionValues(
			ProductOptionValue... productOptionValues)
		throws Exception {

		Mockito.when(
			_productOptionValueResource.
				getProductOptionIdProductOptionValuesPage(
					Mockito.eq(_PRODUCT_OPTION_ID), Mockito.isNull(),
					Mockito.any(), Mockito.isNull())
		).thenReturn(
			_toPage(productOptionValues)
		);
	}

	private void _setUpSalesforceProductOption() throws Exception {
		Mockito.when(
			_productOptionResource.getProductIdProductOptionsPage(
				Mockito.eq(_PRODUCT_ID), Mockito.isNull(), Mockito.any(),
				Mockito.isNull())
		).thenReturn(
			_toPage(_createSalesforceProductOption())
		);
	}

	private Sku _setUpSku(String externalReferenceCode, boolean published)
		throws Exception {

		Sku sku = _createSku(externalReferenceCode, published);

		Mockito.when(
			_commerceSkuService.fetchSku(externalReferenceCode)
		).thenReturn(
			sku
		);

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

	@SafeVarargs
	private final <T> Page<T> _toPage(T... items) {
		Page<T> page = new Page<>();

		page.setItems(List.of(items));
		page.setPage(1);
		page.setPageSize(100);
		page.setTotalCount(items.length);

		return page;
	}

	private static final long _CATALOG_ID = 55;

	private static final String _PRODUCT_GROUP = "PRDCT-AI-HUB";

	private static final long _PRODUCT_ID = 77;

	private static final long _PRODUCT_OPTION_ID = 88;

	private static final String _SALESFORCE_PRODUCT_ID = "PROD-1";

	private static final String _SKU_OPTION_VALUE_KEY = "prod-1";

	private final CommerceCatalogService _commerceCatalogService = Mockito.mock(
		CommerceCatalogService.class);
	private CommerceProductService _commerceProductService;
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final OptionResource _optionResource = Mockito.mock(
		OptionResource.class);
	private final ProductOptionResource _productOptionResource = Mockito.mock(
		ProductOptionResource.class);
	private final ProductOptionValueResource _productOptionValueResource =
		Mockito.mock(ProductOptionValueResource.class);
	private final ProductResource _productResource = Mockito.mock(
		ProductResource.class);

}