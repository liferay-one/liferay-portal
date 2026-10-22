/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Catalog;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;

import java.util.Collections;
import java.util.Locale;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-DELIVERYPRODUCTUTIL] DeliveryProductUtil")
public class DeliveryProductUtilTest {

	@Test
	public void testGetLocalizedValueFallsBackToAnyValue() {
		Assertions.assertEquals(
			"Deutsch",
			DeliveryProductUtil.getLocalizedValue(
				Locale.forLanguageTag("fr-FR"), Map.of("de_DE", "Deutsch")));
	}

	@Test
	public void testGetLocalizedValueFallsBackToDefaultLanguage() {
		Assertions.assertEquals(
			"English",
			DeliveryProductUtil.getLocalizedValue(
				Locale.forLanguageTag("fr-FR"), Map.of("en_US", "English")));
	}

	@Test
	public void testGetLocalizedValueMatchesLanguageWithoutCountry() {
		Assertions.assertEquals(
			"Español",
			DeliveryProductUtil.getLocalizedValue(
				Locale.forLanguageTag("es"),
				Map.of("en_US", "English", "es_ES", "Español")));
	}

	@Test
	public void testGetLocalizedValueReadsRequestLocale() {
		Assertions.assertEquals(
			"Português",
			DeliveryProductUtil.getLocalizedValue(
				Locale.forLanguageTag("pt-BR"),
				Map.of("en_US", "English", "pt_BR", "Português")));
	}

	@Test
	public void testGetLocalizedValueReturnsBlankWithoutValues() {
		Assertions.assertEquals(
			"", DeliveryProductUtil.getLocalizedValue(LocaleUtil.US, null));
		Assertions.assertEquals(
			"",
			DeliveryProductUtil.getLocalizedValue(
				LocaleUtil.US, Collections.emptyMap()));
	}

	@Test
	public void testToJSONObjectMapsProduct() {
		Catalog catalog = new Catalog();

		catalog.setName("Liferay, Inc.");

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setLabel(Map.of("en_US", "Project Item Type"));
		productSpecification.setSpecificationKey("project-item-type");
		productSpecification.setValue(Map.of("en_US", "product"));

		SkuOption skuOption = new SkuOption();

		skuOption.setKey("liferay-cloud-native");
		skuOption.setValue("01tvo00000qyrl1yad");

		Sku sku = new Sku();

		sku.setExternalReferenceCode("01tVO00000QYrl1YAD");
		sku.setPublished(false);
		sku.setPurchasable(false);
		sku.setSkuOptions(new SkuOption[] {skuOption});

		Product product = new Product();

		product.setCatalog(catalog);
		product.setDescription(Map.of("en_US", "Cloud Native"));
		product.setName(Map.of("en_US", "Liferay Cloud Native"));
		product.setProductId(55555L);
		product.setProductSpecifications(
			new ProductSpecification[] {productSpecification});
		product.setProductStatus(2);
		product.setSkus(new Sku[] {sku});

		JSONObject jsonObject = DeliveryProductUtil.toJSONObject(
			LocaleUtil.US, product);

		Assertions.assertEquals(
			"Liferay, Inc.", jsonObject.getString("catalogName"));
		Assertions.assertEquals(
			"Cloud Native", jsonObject.getString("description"));
		Assertions.assertEquals(
			"Liferay Cloud Native", jsonObject.getString("name"));
		Assertions.assertEquals(2, jsonObject.getInt("productStatus"));

		JSONObject productSpecificationJSONObject = jsonObject.getJSONArray(
			"productSpecifications"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			"project-item-type",
			productSpecificationJSONObject.getString("specificationKey"));
		Assertions.assertEquals(
			"Project Item Type",
			productSpecificationJSONObject.getString("specificationTitle"));
		Assertions.assertEquals(
			"product", productSpecificationJSONObject.getString("value"));

		JSONObject skuJSONObject = jsonObject.getJSONArray(
			"skus"
		).getJSONObject(
			0
		);

		Assertions.assertFalse(skuJSONObject.getBoolean("published"));
		Assertions.assertFalse(skuJSONObject.getBoolean("purchasable"));

		JSONObject skuOptionJSONObject = skuJSONObject.getJSONArray(
			"skuOptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			"liferay-cloud-native",
			skuOptionJSONObject.getString("skuOptionKey"));
		Assertions.assertEquals(
			"01tvo00000qyrl1yad",
			skuOptionJSONObject.getString("skuOptionValueKey"));
	}

	@Test
	public void testToJSONObjectToleratesMissingCollections() {
		Product product = new Product();

		product.setProductId(55555L);

		JSONObject jsonObject = DeliveryProductUtil.toJSONObject(
			LocaleUtil.US, product);

		Assertions.assertEquals("", jsonObject.getString("catalogName"));
		Assertions.assertEquals("", jsonObject.getString("description"));
		Assertions.assertEquals("", jsonObject.getString("name"));
		Assertions.assertTrue(
			jsonObject.getJSONArray(
				"productSpecifications"
			).isEmpty());
		Assertions.assertTrue(
			jsonObject.getJSONArray(
				"skus"
			).isEmpty());
	}

}