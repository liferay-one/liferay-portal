/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.SkuOption;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;

import java.time.ZonedDateTime;

import java.util.Date;
import java.util.Map;
import java.util.function.Function;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-COMMERCEORDERUTIL] CommerceOrderUtil")
public class CommerceOrderUtilTest {

	@Test
	public void testGetOrderMetadataJSONObjectFallsBackToEmptyObject() {
		Order order = new Order();

		Assertions.assertTrue(
			CommerceOrderUtil.getOrderMetadataJSONObject(
				order
			).isEmpty());

		order.setCustomFields(Map.of("salesforceProjectId", "PRJ-1"));

		Assertions.assertTrue(
			CommerceOrderUtil.getOrderMetadataJSONObject(
				order
			).isEmpty());
	}

	@Test
	public void testGetOrderMetadataJSONObjectParsesOrderMetadata() {
		Order order = new Order();

		order.setCustomFields(
			Map.of("order-metadata", "{\"source\": \"web\"}"));

		JSONObject jsonObject = CommerceOrderUtil.getOrderMetadataJSONObject(
			order);

		Assertions.assertEquals("web", jsonObject.getString("source"));
	}

	@Test
	public void testGetOrderPurchaseEndDateForLimitedBetaIsThreeMonths() {
		_assertOrderPurchaseEndDate(
			zonedDateTime -> zonedDateTime.plusMonths(3),
			"3 months limited beta", "Trial");
	}

	@Test
	public void testGetOrderPurchaseEndDateForTrialIsOneMonth() {
		_assertOrderPurchaseEndDate(
			zonedDateTime -> zonedDateTime.plusMonths(1), "Standard", "trial");
	}

	@Test
	public void testGetOrderPurchaseEndDateIsOneYearByDefault() {
		_assertOrderPurchaseEndDate(
			zonedDateTime -> zonedDateTime.plusYears(1), "Standard",
			"Production");
		_assertOrderPurchaseEndDate(
			zonedDateTime -> zonedDateTime.plusYears(1), null, null);
	}

	@Test
	public void testGetSkuOptionValueFromOptionsJSON() {
		String options =
			"[{\"key\": \"product-edition\", \"value\": [\"Enterprise\"]}]";

		Assertions.assertEquals(
			"Enterprise",
			CommerceOrderUtil.getSkuOptionValue("edition", options));
		Assertions.assertNull(
			CommerceOrderUtil.getSkuOptionValue("region", options));
	}

	@Test
	public void testGetSkuOptionValueFromSkuOptions() {
		SkuOption[] skuOptions = {
			_createSkuOption(null, "Ignored"),
			_createSkuOption("product-edition", "Enterprise")
		};

		Assertions.assertEquals(
			"Enterprise",
			CommerceOrderUtil.getSkuOptionValue("edition", skuOptions));
		Assertions.assertNull(
			CommerceOrderUtil.getSkuOptionValue("region", skuOptions));
	}

	private void _assertOrderPurchaseEndDate(
		Function<ZonedDateTime, ZonedDateTime> function, String licenseType,
		String licenseUsageType) {

		Date minimumDate = Date.from(
			function.apply(
				ZonedDateTime.now()
			).toInstant());

		Date date = CommerceOrderUtil.getOrderPurchaseEndDate(
			licenseType, licenseUsageType);

		Date maximumDate = Date.from(
			function.apply(
				ZonedDateTime.now()
			).toInstant());

		Assertions.assertFalse(date.before(minimumDate));
		Assertions.assertFalse(date.after(maximumDate));
	}

	private SkuOption _createSkuOption(String key, String value) {
		SkuOption skuOption = new SkuOption();

		skuOption.setKey(key);
		skuOption.setValue(value);

		return skuOption;
	}

}