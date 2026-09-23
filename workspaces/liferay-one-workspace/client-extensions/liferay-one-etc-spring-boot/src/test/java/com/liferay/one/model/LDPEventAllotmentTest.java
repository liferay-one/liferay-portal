/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class LDPEventAllotmentTest {

	@Test
	public void testAddsBaseAndAddOnBuckets() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS, 1000000D),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
					2D),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
					1D)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(3, ldpEventAllotment.getAddOnBucketCount());
		Assertions.assertEquals(1000000, ldpEventAllotment.getBaseQuantity());
		Assertions.assertEquals(
			1000000 + (3 * _OVERAGE_BUCKET_SIZE),
			ldpEventAllotment.getEntitledQuantity());
		Assertions.assertFalse(ldpEventAllotment.isUnlimited());
	}

	@Test
	public void testConflictingPricingLeavesOverageUnpriced() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEventsEntitlement(1000000D, _RATE),
				_createEventsEntitlement(500000D, 25D),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
					1D)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(ldpEventAllotment.hasConflictingOveragePricing());
		Assertions.assertNull(ldpEventAllotment.getOveragePricing());
		Assertions.assertEquals(
			1500000 + _OVERAGE_BUCKET_SIZE,
			ldpEventAllotment.getEntitledQuantity());
		Assertions.assertTrue(ldpEventAllotment.isEntitledQuantityKnown());
	}

	@Test
	public void testIgnoresUnrelatedEntitlements() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_API_REQUESTS, 5000000D),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS, 1000000D)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(
			1000000, ldpEventAllotment.getEntitledQuantity());
	}

	@Test
	public void testIsEntitledQuantityUnknownForAddOnBucketsWithoutBucketSize() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS, 1000000D),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
					1D)),
			0);

		Assertions.assertFalse(ldpEventAllotment.isEntitledQuantityKnown());
	}

	@Test
	public void testNoEntitlementsMeansNoAllotment() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Collections.emptyList(), _OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(0, ldpEventAllotment.getEntitledQuantity());
		Assertions.assertNull(ldpEventAllotment.getOveragePricing());
		Assertions.assertFalse(ldpEventAllotment.isUnlimited());
	}

	@Test
	public void testResolvesOveragePricingFromEventsEntitlements() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEventsEntitlement(1000000D, _RATE),
				_createEventsEntitlement(500000D, _RATE)),
			_OVERAGE_BUCKET_SIZE);

		OveragePricing overagePricing = ldpEventAllotment.getOveragePricing();

		Assertions.assertEquals(_RATE, overagePricing.getRate());

		Assertions.assertFalse(
			ldpEventAllotment.hasConflictingOveragePricing());
	}

	@Test
	public void testUnlimitedGrantType() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Arrays.asList(
				_createEntitlement(
					EntitlementConstants.GRANT_TYPE_UNLIMITED,
					EntitlementConstants.NAME_EVENTS, null),
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
					1D)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(ldpEventAllotment.isUnlimited());
		Assertions.assertEquals(
			_OVERAGE_BUCKET_SIZE, ldpEventAllotment.getEntitledQuantity());
	}

	@Test
	public void testUnlimitedNegativeQuantity() {
		LDPEventAllotment ldpEventAllotment = new LDPEventAllotment(
			Collections.singletonList(
				_createEntitlement(
					"fixed", EntitlementConstants.NAME_EVENTS, -1D)),
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertTrue(ldpEventAllotment.isUnlimited());
	}

	private Entitlement _createEntitlement(
		String grantType, String name, Double quantity) {

		return new Entitlement(
			_createEntitlementJSONObject(grantType, name, quantity));
	}

	private JSONObject _createEntitlementJSONObject(
		String grantType, String name, Double quantity) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"grantType", grantType
		).put(
			"id", 1L
		).put(
			"name", name
		);

		if (quantity != null) {
			jsonObject.put("quantity", quantity);
		}

		return jsonObject;
	}

	private Entitlement _createEventsEntitlement(
		Double quantity, double overageRate) {

		JSONObject jsonObject = _createEntitlementJSONObject(
			"fixed", EntitlementConstants.NAME_EVENTS, quantity);

		jsonObject.put(
			"overageRate", overageRate
		).put(
			"overageSkuExternalReferenceCode",
			"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET"
		);

		return new Entitlement(jsonObject);
	}

	private static final long _OVERAGE_BUCKET_SIZE = 200000;

	private static final double _RATE = 20;

}