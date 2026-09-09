/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Category;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Amos Fong
 */
public class CommerceProductUtilTest {

	@Test
	public void testGetCategoryExternalReferenceCodesReadsEveryCategory() {
		Product product = new Product();

		product.setCategories(
			new Category[] {
				_createCategory("MARKETPLACE_PRODUCT_TYPE_APP"),
				_createCategory("MARKETPLACE_PRODUCT_TYPE_PRODUCT")
			});

		Assertions.assertEquals(
			List.of(
				"MARKETPLACE_PRODUCT_TYPE_APP",
				"MARKETPLACE_PRODUCT_TYPE_PRODUCT"),
			CommerceProductUtil.getCategoryExternalReferenceCodes(product));
	}

	@Test
	public void testGetCategoryExternalReferenceCodesReturnsEmptyWhenCategoriesAreAbsent() {
		Assertions.assertEquals(
			List.of(),
			CommerceProductUtil.getCategoryExternalReferenceCodes(
				new Product()));
	}

	@Test
	public void testGetCategoryExternalReferenceCodesReturnsEmptyWhenProductIsAbsent() {
		Assertions.assertEquals(
			List.of(),
			CommerceProductUtil.getCategoryExternalReferenceCodes(null));
	}

	@Test
	public void testGetNameReadsLocalizedValue() {
		Product product = new Product();

		product.setName(
			() -> Map.of("en_US", "PaaS Experience", "pt_BR", "ignorado"));

		Assertions.assertEquals(
			"PaaS Experience", CommerceProductUtil.getName(product));
	}

	@Test
	public void testGetNameReturnsNullWhenNameIsAbsent() {
		Assertions.assertNull(CommerceProductUtil.getName(new Product()));
	}

	@Test
	public void testGetNameReturnsNullWhenProductIsAbsent() {
		Assertions.assertNull(CommerceProductUtil.getName(null));
	}

	@Test
	public void testGetSpecificationValueReadsLocalizedValue() {
		Product product = _createProduct(
			_createProductSpecification(
				"type", Map.of("en_US", "dxp", "pt_BR", "ignorado")),
			_createProductSpecification(
				"cloudEnabled", Map.of("en_US", "true")));

		Assertions.assertEquals(
			"dxp", CommerceProductUtil.getSpecificationValue(product, "type"));
	}

	@Test
	public void testGetSpecificationValueReturnsNullWhenKeyIsAbsent() {
		Product product = _createProduct(
			_createProductSpecification("type", Map.of("en_US", "dxp")));

		Assertions.assertNull(
			CommerceProductUtil.getSpecificationValue(product, "cloudEnabled"));
	}

	@Test
	public void testGetSpecificationValueReturnsNullWhenProductIsAbsent() {
		Assertions.assertNull(
			CommerceProductUtil.getSpecificationValue(null, "type"));
	}

	@Test
	public void testGetSpecificationValueReturnsNullWhenSpecificationsAreAbsent() {
		Assertions.assertNull(
			CommerceProductUtil.getSpecificationValue(new Product(), "type"));
	}

	@Test
	public void testGetSpecificationValueReturnsNullWhenValueIsAbsent() {
		Product product = _createProduct(
			_createProductSpecification("type", null));

		Assertions.assertNull(
			CommerceProductUtil.getSpecificationValue(product, "type"));
	}

	private Category _createCategory(String externalReferenceCode) {
		Category category = new Category();

		category.setExternalReferenceCode(externalReferenceCode);

		return category;
	}

	private Product _createProduct(
		ProductSpecification... productSpecifications) {

		Product product = new Product();

		product.setProductSpecifications(productSpecifications);

		return product;
	}

	private ProductSpecification _createProductSpecification(
		String specificationKey, Map<String, String> value) {

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(specificationKey);
		productSpecification.setValue(value);

		return productSpecification;
	}

}