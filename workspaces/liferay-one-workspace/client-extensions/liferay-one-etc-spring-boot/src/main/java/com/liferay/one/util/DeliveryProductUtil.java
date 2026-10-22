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
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.Locale;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Maps an admin catalog product to the shape of a headless delivery catalog
 * product, so the project views read draft products the delivery catalog
 * does not return.
 *
 * @author Ryan Schuhler
 */
public class DeliveryProductUtil {

	public static String getLocalizedValue(
		Locale locale, Map<String, String> map) {

		if ((map == null) || map.isEmpty()) {
			return StringPool.BLANK;
		}

		if (locale != null) {
			String value = map.get(locale.toString());

			if (Validator.isNotNull(value)) {
				return value;
			}

			String languagePrefix = locale.getLanguage() + StringPool.UNDERLINE;

			for (Map.Entry<String, String> entry : map.entrySet()) {
				if (entry.getKey(
					).startsWith(
						languagePrefix
					) && Validator.isNotNull(entry.getValue())) {

					return entry.getValue();
				}
			}
		}

		String value = map.get(_LANGUAGE_ID_DEFAULT);

		if (Validator.isNotNull(value)) {
			return value;
		}

		for (String mapValue : map.values()) {
			if (Validator.isNotNull(mapValue)) {
				return mapValue;
			}
		}

		return StringPool.BLANK;
	}

	public static JSONObject toJSONObject(Locale locale, Product product) {
		Catalog catalog = product.getCatalog();

		return new JSONObject(
		).put(
			"attachments", new JSONArray()
		).put(
			"catalogName",
			(catalog == null) ? StringPool.BLANK :
				GetterUtil.getString(catalog.getName())
		).put(
			"categories", new JSONArray()
		).put(
			"description", getLocalizedValue(locale, product.getDescription())
		).put(
			"externalReferenceCode", product.getExternalReferenceCode()
		).put(
			"id", product.getId()
		).put(
			"images", new JSONArray()
		).put(
			"name", getLocalizedValue(locale, product.getName())
		).put(
			"productId", product.getProductId()
		).put(
			"productSpecifications",
			_toProductSpecificationsJSONArray(
				locale, product.getProductSpecifications())
		).put(
			"productStatus", product.getProductStatus()
		).put(
			"productType", product.getProductType()
		).put(
			"shortDescription",
			getLocalizedValue(locale, product.getShortDescription())
		).put(
			"skus", _toSkusJSONArray(product.getSkus())
		);
	}

	private static JSONArray _toProductSpecificationsJSONArray(
		Locale locale, ProductSpecification[] productSpecifications) {

		JSONArray jsonArray = new JSONArray();

		if (productSpecifications == null) {
			return jsonArray;
		}

		for (ProductSpecification productSpecification :
				productSpecifications) {

			jsonArray.put(
				new JSONObject(
				).put(
					"id", productSpecification.getId()
				).put(
					"priority", productSpecification.getPriority()
				).put(
					"specificationId", productSpecification.getSpecificationId()
				).put(
					"specificationKey",
					productSpecification.getSpecificationKey()
				).put(
					"specificationTitle",
					getLocalizedValue(locale, productSpecification.getLabel())
				).put(
					"value",
					getLocalizedValue(locale, productSpecification.getValue())
				));
		}

		return jsonArray;
	}

	private static JSONArray _toSkuOptionsJSONArray(SkuOption[] skuOptions) {
		JSONArray jsonArray = new JSONArray();

		if (skuOptions == null) {
			return jsonArray;
		}

		for (SkuOption skuOption : skuOptions) {
			jsonArray.put(
				new JSONObject(
				).put(
					"skuOptionKey", skuOption.getKey()
				).put(
					"skuOptionValueKey", skuOption.getValue()
				));
		}

		return jsonArray;
	}

	private static JSONArray _toSkusJSONArray(Sku[] skus) {
		JSONArray jsonArray = new JSONArray();

		if (skus == null) {
			return jsonArray;
		}

		for (Sku sku : skus) {
			jsonArray.put(
				new JSONObject(
				).put(
					"externalReferenceCode", sku.getExternalReferenceCode()
				).put(
					"id", sku.getId()
				).put(
					"published", GetterUtil.getBoolean(sku.getPublished())
				).put(
					"purchasable", GetterUtil.getBoolean(sku.getPurchasable())
				).put(
					"sku", sku.getSku()
				).put(
					"skuOptions", _toSkuOptionsJSONArray(sku.getSkuOptions())
				));
		}

		return jsonArray;
	}

	private static final String _LANGUAGE_ID_DEFAULT = "en_US";

}