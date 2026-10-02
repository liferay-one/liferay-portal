/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.util.UsageUnitUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
@DisplayName("[CLS-USAGEALLOTMENT] UsageAllotment")
public class UsageAllotmentTest {

	@Test
	public void testAddsBaseAndAddOnBuckets() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement("fixed", 1000000D, _SKU_ALLOTMENT),
				_createEntitlement("fixed", 2D, _SKU_ADD_ON),
				_createEntitlement("fixed", 1D, _SKU_ADD_ON)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(3, usageAllotment.getAddOnBucketCount());
		Assertions.assertEquals(1000000D, usageAllotment.getBaseQuantity());
		Assertions.assertEquals(
			1000000D + (3 * _OVERAGE_BUCKET_SIZE),
			usageAllotment.getEntitledQuantity());
		Assertions.assertFalse(usageAllotment.isUnlimited());
	}

	@Test
	public void testConflictingPricingLeavesOverageUnpriced() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createPricedEntitlement(1000000D, _RATE, _SKU_ALLOTMENT),
				_createPricedEntitlement(500000D, 25D, _SKU_ALLOTMENT),
				_createEntitlement("fixed", 1D, _SKU_ADD_ON)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(usageAllotment.hasConflictingOveragePricing());
		Assertions.assertNull(usageAllotment.getOveragePricing());
		Assertions.assertEquals(
			1500000D + _OVERAGE_BUCKET_SIZE,
			usageAllotment.getEntitledQuantity());
		Assertions.assertTrue(usageAllotment.isEntitledQuantityKnown());
	}

	@Test
	public void testConvertsAllotmentsToTheUsageDefinitionUnit() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				new Entitlement(
					_createEntitlementJSONObject(
						"fixed", 1D, _SKU_ALLOTMENT, UsageUnitUtil.UNIT_TIB)),
				new Entitlement(
					_createEntitlementJSONObject(
						"fixed", 100D, _SKU_ALLOTMENT,
						UsageUnitUtil.UNIT_GIB))),
			0, UsageUnitUtil.UNIT_GIB);

		Assertions.assertEquals(1124D, usageAllotment.getEntitledQuantity());
	}

	@Test
	public void testIgnoresOverageBuckets() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement("fixed", 1000000D, _SKU_ALLOTMENT),
				_createPricedEntitlement(5D, _RATE, _SKU_OVERAGE)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(1000000D, usageAllotment.getEntitledQuantity());
		Assertions.assertNull(usageAllotment.getOveragePricing());
	}

	@Test
	public void testIgnoresUnknownRoles() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement("fixed", 1000000D, _SKU_ALLOTMENT),
				_createEntitlement("fixed", 5D, _SKU_UNKNOWN)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(1000000D, usageAllotment.getEntitledQuantity());
	}

	@Test
	public void testIsEntitledQuantityUnknownForAddOnBucketsWithoutBucketSize() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement("fixed", 1000000D, _SKU_ALLOTMENT),
				_createEntitlement("fixed", 1D, _SKU_ADD_ON)),
			0);

		Assertions.assertFalse(usageAllotment.isEntitledQuantityKnown());
	}

	@Test
	public void testMissingRoleMeansAllotment() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement("fixed", 1000000D, _SKU_UNLISTED),
				_createEntitlement("fixed", 500000D, null)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(1500000D, usageAllotment.getEntitledQuantity());
	}

	@Test
	public void testNoEntitlementsMeansNoAllotment() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Collections.emptyList(), _OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(0D, usageAllotment.getEntitledQuantity());
		Assertions.assertNull(usageAllotment.getOveragePricing());
		Assertions.assertFalse(usageAllotment.isUnlimited());
	}

	@Test
	public void testResolvesOveragePricingFromAllotmentsOnly() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createPricedEntitlement(1000000D, _RATE, _SKU_ALLOTMENT),
				_createPricedEntitlement(500000D, _RATE, _SKU_ALLOTMENT),
				_createPricedEntitlement(1D, 25D, _SKU_ADD_ON)),
			_OVERAGE_BUCKET_SIZE);

		OveragePricing overagePricing = usageAllotment.getOveragePricing();

		Assertions.assertEquals(_RATE, overagePricing.getRate());

		Assertions.assertFalse(usageAllotment.hasConflictingOveragePricing());
	}

	@Test
	public void testUnlimitedGrantType() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Arrays.asList(
				_createEntitlement(
					EntitlementConstants.GRANT_TYPE_UNLIMITED, null,
					_SKU_ALLOTMENT),
				_createEntitlement("fixed", 1D, _SKU_ADD_ON)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(usageAllotment.isUnlimited());
		Assertions.assertEquals(
			(double)_OVERAGE_BUCKET_SIZE, usageAllotment.getEntitledQuantity());
	}

	@Test
	public void testUnlimitedNegativeQuantity() {
		UsageAllotment usageAllotment = _createUsageAllotment(
			Collections.singletonList(
				_createEntitlement("fixed", -1D, _SKU_ALLOTMENT)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(usageAllotment.isUnlimited());
	}

	private Entitlement _createEntitlement(
		String grantType, Double quantity, String skuExternalReferenceCode) {

		return new Entitlement(
			_createEntitlementJSONObject(
				grantType, quantity, skuExternalReferenceCode));
	}

	private JSONObject _createEntitlementJSONObject(
		String grantType, Double quantity, String skuExternalReferenceCode) {

		return _createEntitlementJSONObject(
			grantType, quantity, skuExternalReferenceCode, null);
	}

	private JSONObject _createEntitlementJSONObject(
		String grantType, Double quantity, String skuExternalReferenceCode,
		String unit) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"grantType", grantType
		).put(
			"id", 1L
		);

		if (quantity != null) {
			jsonObject.put("quantity", quantity);
		}

		if (skuExternalReferenceCode != null) {
			jsonObject.put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"id", 1L
				).put(
					"skuExternalReferenceCode", skuExternalReferenceCode
				).put(
					"unit", unit
				));
		}

		return jsonObject;
	}

	private Entitlement _createPricedEntitlement(
		Double quantity, double overageRate, String skuExternalReferenceCode) {

		JSONObject jsonObject = _createEntitlementJSONObject(
			"fixed", quantity, skuExternalReferenceCode);

		jsonObject.put(
			"overageRate", overageRate
		).put(
			"overageSkuExternalReferenceCode", _SKU_OVERAGE
		);

		return new Entitlement(jsonObject);
	}

	private UsageAllotment _createUsageAllotment(
		List<Entitlement> entitlements, long overageBucketSize) {

		return _createUsageAllotment(
			entitlements, overageBucketSize, _UNIT_EVENTS);
	}

	private UsageAllotment _createUsageAllotment(
		List<Entitlement> entitlements, long overageBucketSize, String unit) {

		return new UsageAllotment(
			HashMapBuilder.put(
				_SKU_ADD_ON, SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ADD_ON
			).put(
				_SKU_ALLOTMENT,
				SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT
			).put(
				_SKU_OVERAGE, SkuOptionConstants.VALUE_CONSUMPTION_ROLE_OVERAGE
			).put(
				_SKU_UNKNOWN, "bonus"
			).build(),
			entitlements, overageBucketSize, unit);
	}

	private static final long _OVERAGE_BUCKET_SIZE = 200000;

	private static final double _RATE = 20;

	private static final String _SKU_ADD_ON =
		"PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET";

	private static final String _SKU_ALLOTMENT = "PRDCT-DATA-PLATFORM";

	private static final String _SKU_OVERAGE =
		"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET";

	private static final String _SKU_UNKNOWN = "PRDCT-DATA-PLATFORM-BONUS";

	private static final String _SKU_UNLISTED = "PRDCT-DATA-PLATFORM-LEGACY";

	private static final String _UNIT_EVENTS = "events";

}