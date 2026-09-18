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
 * @author Allen Ziegenfus
 */
public class LDPEventUsageStrategyTest {

	@Test
	public void testToJSONObjectMaxCountIsZeroWithoutEntitlements() {
		JSONObject jsonObject = _toJSONObject(null);

		Assertions.assertEquals(0, jsonObject.getInt("addOnBucketCount"));
		Assertions.assertEquals(0, jsonObject.getInt("baseAllotment"));
		Assertions.assertEquals(0, jsonObject.getInt("maxCount"));
	}

	@Test
	public void testToJSONObjectMaxCountMultipliesAddOnBucketsByBucketSize() {
		LDPEventUsageStrategy ldpEventUsageStrategy = new LDPEventUsageStrategy(
			Arrays.asList(
				_createEntitlement(EntitlementConstants.NAME_EVENTS, 1000000D),
				_createEntitlement(
					EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET, 2D)),
			_OVERAGE_BUCKET_SIZE, null);

		JSONObject jsonObject = ldpEventUsageStrategy.toJSONObject();

		Assertions.assertEquals(2, jsonObject.getInt("addOnBucketCount"));
		Assertions.assertEquals(1000000, jsonObject.getInt("baseAllotment"));
		Assertions.assertEquals(
			1000000 + (2 * _OVERAGE_BUCKET_SIZE),
			jsonObject.getInt("maxCount"));
	}

	@Test
	public void testToJSONObjectOmitsUsedCountWithoutUsage() {
		Assertions.assertFalse(
			_toJSONObject(
				null
			).has(
				"usedCount"
			));
	}

	private Entitlement _createEntitlement(String name, double quantity) {
		return new Entitlement(
			new JSONObject(
			).put(
				"grantType", "fixed"
			).put(
				"id", 1L
			).put(
				"name", name
			).put(
				"quantity", quantity
			));
	}

	private JSONObject _toJSONObject(String response) {
		LDPEventUsageStrategy ldpEventUsageStrategy = new LDPEventUsageStrategy(
			Collections.emptyList(), _OVERAGE_BUCKET_SIZE, response);

		return ldpEventUsageStrategy.toJSONObject();
	}

	private static final long _OVERAGE_BUCKET_SIZE = 200000;

}