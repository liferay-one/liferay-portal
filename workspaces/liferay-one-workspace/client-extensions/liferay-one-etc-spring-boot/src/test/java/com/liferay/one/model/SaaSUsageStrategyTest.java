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
@DisplayName("[CLS-SAASUSAGESTRATEGY] SaaSUsageStrategy")
public class SaaSUsageStrategyTest {

	@Test
	public void testToJSONObjectAcceptsBothNamingVariants() {
		SaaSUsageStrategy saaSUsageStrategy = new SaaSUsageStrategy(
			null,
			List.of(
				_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_RAM, 2),
				_createEntitlement(
					EntitlementConstants.NAME_EXTENSIONS_VCPU, 1),
				_createEntitlement(EntitlementConstants.NAME_RAM, 6),
				_createEntitlement(EntitlementConstants.NAME_VCPU, 3)));

		JSONObject jsonObject = saaSUsageStrategy.toJSONObject();

		_assertCount(
			"8", jsonObject, "clientExtensionsCapacityRAM", "maxCount");
		_assertCount(
			"4", jsonObject, "clientExtensionsCapacityCPU", "maxCount");
	}

	@Test
	public void testToJSONObjectDefaultsUsageToZeroWithoutPayload() {
		SaaSUsageStrategy saaSUsageStrategy = new SaaSUsageStrategy(
			"{\"other\": 1}", _createEntitlements());

		JSONObject jsonObject = saaSUsageStrategy.toJSONObject();

		for (String key : jsonObject.keySet()) {
			_assertCount("0", jsonObject, key, "usedCount");
		}

		saaSUsageStrategy = new SaaSUsageStrategy(null, _createEntitlements());

		Assertions.assertFalse(saaSUsageStrategy.hasUsage());

		jsonObject = saaSUsageStrategy.toJSONObject();

		for (String key : jsonObject.keySet()) {
			JSONObject metricJSONObject = jsonObject.getJSONObject(key);

			Assertions.assertFalse(metricJSONObject.has("usedCount"), key);
			Assertions.assertEquals(
				"0", metricJSONObject.getString("percentage"), key);
		}
	}

	@Test
	public void testToJSONObjectFeedsEachEntitlementIntoItsMaximum() {
		SaaSUsageStrategy saaSUsageStrategy = new SaaSUsageStrategy(
			new JSONObject(
			).put(
				"totalAnonymousPageViewsCount", 500
			).put(
				"totalClientExtensionsCapacityCPUCount", 1.5
			).put(
				"totalClientExtensionsCapacityRAM", 2
			).put(
				"totalMonthlyActiveLoggedInUsersCount", 25
			).put(
				"totalSitesCount", 3
			).put(
				"totalStorageCapacityDocumentLibrary", 40
			).toString(),
			_createEntitlements());

		JSONObject jsonObject = saaSUsageStrategy.toJSONObject();

		_assertCount("1000", jsonObject, "anonymousPageViews", "maxCount");
		_assertCount("500", jsonObject, "anonymousPageViews", "usedCount");
		_assertCount(
			"2", jsonObject, "clientExtensionsCapacityCPU", "maxCount");
		_assertCount(
			"1.5", jsonObject, "clientExtensionsCapacityCPU", "usedCount");
		_assertCount(
			"4", jsonObject, "clientExtensionsCapacityRAM", "maxCount");
		_assertCount(
			"2", jsonObject, "clientExtensionsCapacityRAM", "usedCount");
		_assertCount(
			"50", jsonObject, "monthlyActiveLoggedInUsers", "maxCount");
		_assertCount(
			"25", jsonObject, "monthlyActiveLoggedInUsers", "usedCount");
		_assertCount("10", jsonObject, "sites", "maxCount");
		_assertCount("3", jsonObject, "sites", "usedCount");
		_assertCount(
			"100", jsonObject, "storageCapacityDocumentLibrary", "maxCount");
		_assertCount(
			"40", jsonObject, "storageCapacityDocumentLibrary", "usedCount");
	}

	private void _assertCount(
		String expected, JSONObject jsonObject, String key, String countKey) {

		JSONObject metricJSONObject = jsonObject.getJSONObject(key);

		Assertions.assertEquals(
			0,
			new BigDecimal(
				expected
			).compareTo(
				metricJSONObject.getBigDecimal(countKey)
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
			_createEntitlement(EntitlementConstants.NAME_APV, 1000),
			_createEntitlement(
				EntitlementConstants.NAME_DOCUMENT_LIBRARY_SIZE, 100),
			_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_RAM, 4),
			_createEntitlement(EntitlementConstants.NAME_EXTENSIONS_VCPU, 2),
			_createEntitlement(EntitlementConstants.NAME_LOGS, 99),
			_createEntitlement(EntitlementConstants.NAME_MALU, 50),
			_createEntitlement(EntitlementConstants.NAME_SITES, 10));
	}

}