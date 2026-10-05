/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;

import java.math.BigDecimal;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-BASEUSAGESTRATEGY] BaseUsageStrategy")
public class BaseUsageStrategyTest {

	@Test
	public void testCreateCapacityUsageJSONObjectKeepsGibibytesBelowOneTebibyte() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createCapacityUsageJSONObject(
			new BigDecimal(1023), new BigDecimal(10));

		_assertBigDecimalEquals(
			new BigDecimal(1023), jsonObject.getBigDecimal("maxCount"));
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_GIB, jsonObject.getString("maxCountUnits"));
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_GIB, jsonObject.getString("usedCountUnits"));
	}

	@Test
	public void testCreateCapacityUsageJSONObjectPromotesToTebibytes() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createCapacityUsageJSONObject(
			new BigDecimal(2048), new BigDecimal(1024));

		_assertBigDecimalEquals(
			new BigDecimal(2), jsonObject.getBigDecimal("maxCount"));
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_TIB, jsonObject.getString("maxCountUnits"));
		Assertions.assertEquals("50.0000", jsonObject.getString("percentage"));
		_assertBigDecimalEquals(
			BigDecimal.ONE, jsonObject.getBigDecimal("usedCount"));
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_TIB, jsonObject.getString("usedCountUnits"));
	}

	@Test
	public void testCreateCapacityUsageJSONObjectWithNegativeMaxCountIsUnlimited() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createCapacityUsageJSONObject(
			new BigDecimal(-1), new BigDecimal(2048));

		Assertions.assertEquals(-1, jsonObject.getLong("maxCount"));
		Assertions.assertFalse(jsonObject.has("maxCountUnits"));
		Assertions.assertEquals("0", jsonObject.getString("percentage"));
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_TIB, jsonObject.getString("usedCountUnits"));
	}

	@Test
	public void testCreateCapacityUsageJSONObjectWithoutUsageReturnsZeroPercent() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			(String)null);

		JSONObject jsonObject = testUsageStrategy.createCapacityUsageJSONObject(
			new BigDecimal(100), new BigDecimal(50));

		Assertions.assertEquals("0", jsonObject.getString("percentage"));
		Assertions.assertFalse(jsonObject.has("usedCount"));
	}

	@Test
	public void testCreateUsageJSONObjectCalculatesPercentage() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createUsageJSONObject(
			new BigDecimal(200), new BigDecimal(50));

		_assertBigDecimalEquals(
			new BigDecimal(200), jsonObject.getBigDecimal("maxCount"));
		Assertions.assertEquals("25.0000", jsonObject.getString("percentage"));
		_assertBigDecimalEquals(
			new BigDecimal(50), jsonObject.getBigDecimal("usedCount"));
	}

	@Test
	public void testCreateUsageJSONObjectWithNegativeMaxCountIsUnlimited() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createUsageJSONObject(
			new BigDecimal(-5), new BigDecimal(50));

		Assertions.assertEquals(-1, jsonObject.getLong("maxCount"));
		Assertions.assertEquals("0", jsonObject.getString("percentage"));
		_assertBigDecimalEquals(
			new BigDecimal(50), jsonObject.getBigDecimal("usedCount"));
	}

	@Test
	public void testCreateUsageJSONObjectWithZeroMaxCountReturnsZeroPercent() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		JSONObject jsonObject = testUsageStrategy.createUsageJSONObject(
			BigDecimal.ZERO, new BigDecimal(50));

		Assertions.assertEquals("0", jsonObject.getString("percentage"));
	}

	@Test
	public void testCreateUsageJSONObjectWithoutUsageReturnsZeroPercent() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			new JSONObject());

		Assertions.assertFalse(testUsageStrategy.hasUsage());

		JSONObject jsonObject = testUsageStrategy.createUsageJSONObject(
			new BigDecimal(100), new BigDecimal(50));

		_assertBigDecimalEquals(
			new BigDecimal(100), jsonObject.getBigDecimal("maxCount"));
		Assertions.assertEquals("0", jsonObject.getString("percentage"));
		Assertions.assertFalse(jsonObject.has("usedCount"));
	}

	@Test
	public void testGetMaxCountAddsQuantity() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		_assertBigDecimalEquals(
			new BigDecimal(105),
			testUsageStrategy.getMaxCount(
				new BigDecimal(100),
				new Entitlement(
					_createEntitlementJSONObject().put("quantity", 5))));
	}

	@Test
	public void testGetMaxCountConvertsTebibyteQuantity() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		_assertBigDecimalEquals(
			new BigDecimal(2148),
			testUsageStrategy.getMaxCount(
				new BigDecimal(100),
				new Entitlement(
					_createEntitlementJSONObject(
					).put(
						"entitlementDefinitionToEntitlement",
						new JSONObject(
						).put(
							"id", 2
						).put(
							"unit", BaseUsageStrategy.UNIT_TIB
						)
					).put(
						"quantity", 2
					))));
	}

	@Test
	public void testGetMaxCountKeepsUnlimitedMaxCount() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		_assertBigDecimalEquals(
			new BigDecimal(-1),
			testUsageStrategy.getMaxCount(
				new BigDecimal(-1),
				new Entitlement(
					_createEntitlementJSONObject().put("quantity", 5))));
	}

	@Test
	public void testGetMaxCountWithUnlimitedGrantTypeOverridesQuantity() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		_assertBigDecimalEquals(
			new BigDecimal(-1),
			testUsageStrategy.getMaxCount(
				new BigDecimal(100),
				new Entitlement(
					_createEntitlementJSONObject(
					).put(
						"grantType", EntitlementConstants.GRANT_TYPE_UNLIMITED
					).put(
						"quantity", 5
					))));
	}

	@Test
	public void testGetMaxCountWithoutQuantityKeepsMaxCount() {
		TestUsageStrategy testUsageStrategy = new TestUsageStrategy(
			_USAGE_RESPONSE);

		_assertBigDecimalEquals(
			new BigDecimal(100),
			testUsageStrategy.getMaxCount(
				new BigDecimal(100),
				new Entitlement(_createEntitlementJSONObject())));
	}

	private void _assertBigDecimalEquals(
		BigDecimal expectedBigDecimal, BigDecimal actualBigDecimal) {

		Assertions.assertEquals(
			0, expectedBigDecimal.compareTo(actualBigDecimal),
			expectedBigDecimal + " != " + actualBigDecimal);
	}

	private JSONObject _createEntitlementJSONObject() {
		return new JSONObject(
		).put(
			"id", 1
		);
	}

	private static final String _USAGE_RESPONSE = "{\"used\": 1}";

	private static class TestUsageStrategy extends BaseUsageStrategy {

		@Override
		public JSONObject toJSONObject() {
			return getUsageJSONObject();
		}

		private TestUsageStrategy(JSONObject usageJSONObject) {
			super(usageJSONObject);
		}

		private TestUsageStrategy(String response) {
			super(response);
		}

	}

}