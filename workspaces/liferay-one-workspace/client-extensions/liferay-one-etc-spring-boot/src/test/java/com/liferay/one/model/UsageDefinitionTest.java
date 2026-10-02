/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-USAGEDEFINITION] UsageDefinition")
public class UsageDefinitionTest {

	@Test
	public void testNoOverageMeansNoBuckets() {
		UsageDefinition usageDefinition = _createUsageDefinition(
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(
			0, usageDefinition.getOverageBucketQuantity(-500000));
		Assertions.assertEquals(0, usageDefinition.getOverageBucketQuantity(0));
	}

	@Test
	public void testRoundsPartialBucketUp() {
		UsageDefinition usageDefinition = _createUsageDefinition(
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(1, usageDefinition.getOverageBucketQuantity(1));
		Assertions.assertEquals(
			2, usageDefinition.getOverageBucketQuantity(200001));
		Assertions.assertEquals(
			3, usageDefinition.getOverageBucketQuantity(500000));
	}

	@Test
	public void testSourceUnitFallsBackToUnit() {
		UsageDefinition usageDefinition = new UsageDefinition(
			_createUsageSourceJSONObject(
				_USAGE_SOURCE, _USAGE_SOURCE_METRIC_KEY, null));

		Assertions.assertEquals(_UNIT, usageDefinition.getUsageSourceUnit());

		usageDefinition = new UsageDefinition(
			_createUsageSourceJSONObject(
				_USAGE_SOURCE, _USAGE_SOURCE_METRIC_KEY, _USAGE_SOURCE_UNIT));

		Assertions.assertEquals(
			_USAGE_SOURCE_UNIT, usageDefinition.getUsageSourceUnit());
	}

	@Test
	public void testUsageSourceNeedsSourceAndMetricKey() {
		UsageDefinition usageDefinition = new UsageDefinition(
			_createUsageSourceJSONObject(
				_USAGE_SOURCE, _USAGE_SOURCE_METRIC_KEY, null));

		Assertions.assertTrue(usageDefinition.hasUsageSource());

		usageDefinition = new UsageDefinition(
			_createUsageSourceJSONObject(_USAGE_SOURCE, null, null));

		Assertions.assertFalse(usageDefinition.hasUsageSource());

		usageDefinition = new UsageDefinition(
			_createUsageSourceJSONObject(null, _USAGE_SOURCE_METRIC_KEY, null));

		Assertions.assertFalse(usageDefinition.hasUsageSource());

		usageDefinition = _createUsageDefinition(null);

		Assertions.assertFalse(usageDefinition.hasUsageSource());
	}

	@Test
	public void testUsesWholeBucketsForExactMultiples() {
		UsageDefinition usageDefinition = _createUsageDefinition(
			_OVERAGE_BUCKET_SIZE);

		Assertions.assertEquals(
			1, usageDefinition.getOverageBucketQuantity(200000));
		Assertions.assertEquals(
			2, usageDefinition.getOverageBucketQuantity(400000));
	}

	@Test
	public void testWithoutOverageBucketSizeNothingIsBillable() {
		UsageDefinition usageDefinition = _createUsageDefinition(null);

		Assertions.assertFalse(usageDefinition.hasOverageBucketSize());
		Assertions.assertEquals(
			0, usageDefinition.getOverageBucketQuantity(500000));
	}

	private UsageDefinition _createUsageDefinition(Double overageBucketSize) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"id", 1L
		);

		if (overageBucketSize != null) {
			jsonObject.put("overageBucketSize", overageBucketSize);
		}

		return new UsageDefinition(jsonObject);
	}

	private JSONObject _createUsageSourceJSONObject(
		String usageSource, String usageSourceMetricKey,
		String usageSourceUnit) {

		return new JSONObject(
		).put(
			"id", 1L
		).put(
			"unit", _UNIT
		).put(
			"usageSource", usageSource
		).put(
			"usageSourceMetricKey", usageSourceMetricKey
		).put(
			"usageSourceUnit", usageSourceUnit
		);
	}

	private static final double _OVERAGE_BUCKET_SIZE = 200000;

	private static final String _UNIT = "events";

	private static final String _USAGE_SOURCE = "ldp-event-summary";

	private static final String _USAGE_SOURCE_METRIC_KEY = "eventsCount";

	private static final String _USAGE_SOURCE_UNIT = "bytes";

}