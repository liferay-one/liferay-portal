/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class OveragePricingTest {

	@Test
	public void testEqualsComparesRateAndSku() {
		Assertions.assertEquals(
			_createOveragePricing(_RATE, _SKU_EXTERNAL_REFERENCE_CODE),
			_createOveragePricing(_RATE, _SKU_EXTERNAL_REFERENCE_CODE));
		Assertions.assertNotEquals(
			_createOveragePricing(_RATE, _SKU_EXTERNAL_REFERENCE_CODE),
			_createOveragePricing(25D, _SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testNoBucketsMeansNoAmount() {
		OveragePricing overagePricing = _createOveragePricing(
			_RATE, _SKU_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(0, overagePricing.getAmount(-1));
		Assertions.assertEquals(0, overagePricing.getAmount(0));
	}

	@Test
	public void testOfReturnsNullWithoutOverageFields() {
		Assertions.assertNull(
			OveragePricing.of(
				new JSONObject(
				).put(
					"name", "events"
				)));
		Assertions.assertNull(
			OveragePricing.of(
				new JSONObject(
				).put(
					"overageSkuExternalReferenceCode", ""
				)));
	}

	@Test
	public void testOfRequiresRateAndSku() {
		Assertions.assertNotNull(
			_createOveragePricing(_RATE, _SKU_EXTERNAL_REFERENCE_CODE));
		Assertions.assertNull(
			_createOveragePricing(null, _SKU_EXTERNAL_REFERENCE_CODE));
		Assertions.assertNull(_createOveragePricing(_RATE, null));
	}

	@Test
	public void testOfRequiresPositiveRate() {
		Assertions.assertNull(
			_createOveragePricing(0D, _SKU_EXTERNAL_REFERENCE_CODE));
		Assertions.assertNull(
			_createOveragePricing(-5D, _SKU_EXTERNAL_REFERENCE_CODE));
		Assertions.assertNotNull(
			_createOveragePricing(0.5, _SKU_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testPricesEveryBucketAtTheOverageRate() {
		OveragePricing overagePricing = _createOveragePricing(
			_RATE, _SKU_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(3 * _RATE, overagePricing.getAmount(3));
	}

	@Test
	public void testToJSONObjectRoundTrips() {
		OveragePricing overagePricing = _createOveragePricing(
			_RATE, _SKU_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(
			overagePricing, OveragePricing.of(overagePricing.toJSONObject()));
	}

	private OveragePricing _createOveragePricing(
		Double rate, String skuExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject();

		if (rate != null) {
			jsonObject.put("overageRate", rate);
		}

		if (skuExternalReferenceCode != null) {
			jsonObject.put(
				"overageSkuExternalReferenceCode", skuExternalReferenceCode);
		}

		return OveragePricing.of(jsonObject);
	}

	private static final double _RATE = 20;

	private static final String _SKU_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET";

}