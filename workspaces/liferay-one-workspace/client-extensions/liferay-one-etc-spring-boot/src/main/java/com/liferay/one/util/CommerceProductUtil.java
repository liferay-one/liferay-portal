/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Category;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author Amos Fong
 */
public class CommerceProductUtil {

	public static List<String> getCategoryExternalReferenceCodes(
		Product product) {

		if (product == null) {
			return Collections.emptyList();
		}

		Category[] categories = product.getCategories();

		if (categories == null) {
			return Collections.emptyList();
		}

		List<String> categoryExternalReferenceCodes = new ArrayList<>();

		for (Category category : categories) {
			categoryExternalReferenceCodes.add(
				category.getExternalReferenceCode());
		}

		return categoryExternalReferenceCodes;
	}

	public static String getName(Product product) {
		if (product == null) {
			return null;
		}

		Map<String, String> name = product.getName();

		if (name == null) {
			return null;
		}

		return name.get("en_US");
	}

	public static String getSpecificationValue(
		Product product, String specificationKey) {

		if (product == null) {
			return null;
		}

		ProductSpecification[] productSpecifications =
			product.getProductSpecifications();

		if (productSpecifications == null) {
			return null;
		}

		for (ProductSpecification productSpecification :
				productSpecifications) {

			if (!Objects.equals(
					specificationKey,
					productSpecification.getSpecificationKey())) {

				continue;
			}

			Map<String, String> value = productSpecification.getValue();

			if (value == null) {
				return null;
			}

			return value.get("en_US");
		}

		return null;
	}

}