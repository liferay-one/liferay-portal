/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-COMMERCESKUUTIL] CommerceSkuUtil")
public class CommerceSkuUtilTest {

	@Test
	public void testHasLicenseUsageTypeOptionMatchesEveryLicenseFamily() {
		Assertions.assertTrue(
			CommerceSkuUtil.hasLicenseUsageTypeOption(
				_createSku("dxp-license-usage-type", "developer")));
		Assertions.assertTrue(
			CommerceSkuUtil.hasLicenseUsageTypeOption(
				_createSku("cmp-license-usage-type", "developer")));
		Assertions.assertTrue(
			CommerceSkuUtil.hasLicenseUsageTypeOption(
				_createSku("not-shipped-license-usage-type", "developer")));
	}

	@Test
	public void testHasLicenseUsageTypeOptionWithAnotherOption() {
		Assertions.assertFalse(
			CommerceSkuUtil.hasLicenseUsageTypeOption(
				_createSku("machinetype", "standard")));
	}

	@Test
	public void testHasLicenseUsageTypeOptionWithNoOptions() {
		Sku sku = new Sku();

		Assertions.assertFalse(CommerceSkuUtil.hasLicenseUsageTypeOption(sku));

		sku.setSkuOptions(new SkuOption[0]);

		Assertions.assertFalse(CommerceSkuUtil.hasLicenseUsageTypeOption(sku));
	}

	@Test
	public void testHasLicenseUsageTypeOptionWithNoSku() {
		Assertions.assertFalse(CommerceSkuUtil.hasLicenseUsageTypeOption(null));
	}

	private Sku _createSku(String key, String value) {
		Sku sku = new Sku();

		SkuOption skuOption = new SkuOption();

		skuOption.setKey(key);
		skuOption.setValue(value);

		sku.setSkuOptions(new SkuOption[] {skuOption});

		return sku;
	}

}