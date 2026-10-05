/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;

import java.math.BigDecimal;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-EXPERIENCEUSAGESTRATEGY] ExperienceUsageStrategy")
public class ExperienceUsageStrategyTest {

	@Test
	public void testToJSONObjectConvertsByteUsageToGibibytesRoundingDown() {
		ExperienceUsageStrategy experienceUsageStrategy =
			new ExperienceUsageStrategy(
				new JSONObject(
				).put(
					"usage",
					new JSONObject(
					).put(
						ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_CPU,
						1.25
					).put(
						ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_RAM,
						_GIB - 1
					).put(
						ExperienceUsageStrategy.METRIC_DATABASE_STORAGE,
						_GIB + (_GIB / 2)
					).put(
						ExperienceUsageStrategy.
							METRIC_DOCUMENT_LIBRARY_AND_BACKUP_STORAGE,
						_GIB * 2
					).put(
						ExperienceUsageStrategy.METRIC_LOG_STORAGE, _GIB / 4
					).put(
						ExperienceUsageStrategy.METRIC_NETWORK_TRAFFIC, _GIB * 3
					)
				).toString(),
				_createEntitlements());

		JSONObject jsonObject = experienceUsageStrategy.toJSONObject();

		_assertUsedCount(
			"1.25", jsonObject,
			ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_CPU);
		_assertUsedCount(
			"0.99", jsonObject,
			ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_RAM);
		_assertUsedCount(
			"1.50", jsonObject,
			ExperienceUsageStrategy.METRIC_DATABASE_STORAGE);
		_assertUsedCount(
			"2.00", jsonObject,
			ExperienceUsageStrategy.METRIC_DOCUMENT_LIBRARY_AND_BACKUP_STORAGE);
		_assertUsedCount(
			"0.25", jsonObject, ExperienceUsageStrategy.METRIC_LOG_STORAGE);
		_assertUsedCount(
			"3.00", jsonObject, ExperienceUsageStrategy.METRIC_NETWORK_TRAFFIC);
	}

	@Test
	public void testToJSONObjectFeedsEachEntitlementIntoItsMaximum() {
		ExperienceUsageStrategy experienceUsageStrategy =
			new ExperienceUsageStrategy(null, _createEntitlements());

		JSONObject jsonObject = experienceUsageStrategy.toJSONObject();

		_assertMaxCount(
			"3", jsonObject,
			ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_CPU);
		_assertMaxCount(
			"4", jsonObject,
			ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_RAM);
		_assertMaxCount(
			"10", jsonObject, ExperienceUsageStrategy.METRIC_DATABASE_STORAGE);
		_assertMaxCount(
			"20", jsonObject,
			ExperienceUsageStrategy.METRIC_DOCUMENT_LIBRARY_AND_BACKUP_STORAGE);
		_assertMaxCount(
			"5", jsonObject, ExperienceUsageStrategy.METRIC_LOG_STORAGE);
		_assertMaxCount(
			"100", jsonObject, ExperienceUsageStrategy.METRIC_NETWORK_TRAFFIC);
	}

	@Test
	public void testToJSONObjectLeavesUsageAtZeroWithoutUsagePayload() {
		for (String response : new String[] {null, "", "{}"}) {
			ExperienceUsageStrategy experienceUsageStrategy =
				new ExperienceUsageStrategy(response, _createEntitlements());

			Assertions.assertFalse(experienceUsageStrategy.hasUsage());

			JSONObject jsonObject = experienceUsageStrategy.toJSONObject();

			for (String key : jsonObject.keySet()) {
				JSONObject metricJSONObject = jsonObject.getJSONObject(key);

				Assertions.assertFalse(metricJSONObject.has("usedCount"), key);
				Assertions.assertEquals(
					"0", metricJSONObject.getString("percentage"), key);
			}
		}
	}

	private void _assertMaxCount(
		String expected, JSONObject jsonObject, String key) {

		JSONObject metricJSONObject = jsonObject.getJSONObject(key);

		Assertions.assertEquals(
			0,
			new BigDecimal(
				expected
			).compareTo(
				metricJSONObject.getBigDecimal("maxCount")
			),
			key);
	}

	private void _assertUsedCount(
		String expected, JSONObject jsonObject, String key) {

		JSONObject metricJSONObject = jsonObject.getJSONObject(key);

		Assertions.assertEquals(
			0,
			new BigDecimal(
				expected
			).compareTo(
				metricJSONObject.getBigDecimal("usedCount")
			),
			key);
	}

	private Entitlement _createEntitlement(String name, double quantity) {
		return new Entitlement(
			new JSONObject(
			).put(
				"id", 1
			).put(
				"name", name
			).put(
				"quantity", quantity
			));
	}

	private List<Entitlement> _createEntitlements() {
		return List.of(
			_createEntitlement(EntitlementConstants.NAME_DATABASE, 10),
			_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_RAM, 4),
			_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_VCPU, 2),
			_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_VCPUS, 1),
			_createEntitlement(EntitlementConstants.NAME_LOGS, 5),
			_createEntitlement(EntitlementConstants.NAME_SITES, 50),
			_createEntitlement(EntitlementConstants.NAME_STORAGE, 20),
			_createEntitlement(
				EntitlementConstants.NAME_TRAFFIC_NETWORKING, 100));
	}

	private static final long _GIB = 1024L * 1024L * 1024L;

}