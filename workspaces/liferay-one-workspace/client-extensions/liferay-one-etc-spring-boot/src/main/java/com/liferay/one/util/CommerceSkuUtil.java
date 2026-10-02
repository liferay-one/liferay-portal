/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.one.constants.SkuOptionConstants;

/**
 * @author Ryan Schuhler
 */
public class CommerceSkuUtil {

	public static boolean hasLicenseUsageTypeOption(Sku sku) {
		if (sku == null) {
			return false;
		}

		SkuOption[] skuOptions = sku.getSkuOptions();

		if (skuOptions == null) {
			return false;
		}

		for (SkuOption skuOption : skuOptions) {
			String key = skuOption.getKey();

			if ((key != null) &&
				key.endsWith(
					SkuOptionConstants.KEY_SUFFIX_LICENSE_USAGE_TYPE)) {

				return true;
			}
		}

		return false;
	}

}