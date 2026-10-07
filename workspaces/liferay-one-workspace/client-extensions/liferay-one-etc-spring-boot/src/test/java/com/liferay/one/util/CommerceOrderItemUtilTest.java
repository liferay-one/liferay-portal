/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderItemConstants;

import java.time.Instant;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-COMMERCEORDERITEMUTIL] CommerceOrderItemUtil")
public class CommerceOrderItemUtilTest {

	@Test
	public void testGetEntitlementEndDateInstantPrefersEarlierEffectiveEndDate() {
		OrderItem orderItem = _createOrderItem(
			"effectiveEndDate", _JUNE_30, "endDate", _DECEMBER_31);

		Assertions.assertEquals(
			Instant.parse(_JUNE_30),
			CommerceOrderItemUtil.getEntitlementEndDateInstant(orderItem));
	}

	@Test
	public void testGetEntitlementEndDateInstantPrefersEarlierEndDate() {
		OrderItem orderItem = _createOrderItem(
			"effectiveEndDate", _DECEMBER_31, "endDate", _JUNE_30);

		Assertions.assertEquals(
			Instant.parse(_JUNE_30),
			CommerceOrderItemUtil.getEntitlementEndDateInstant(orderItem));
	}

	@Test
	public void testGetEntitlementEndDateInstantToleratesNulls() {
		Assertions.assertNull(
			CommerceOrderItemUtil.getEntitlementEndDateInstant(
				_createOrderItem()));
		Assertions.assertEquals(
			Instant.parse(_JUNE_30),
			CommerceOrderItemUtil.getEntitlementEndDateInstant(
				_createOrderItem("effectiveEndDate", _JUNE_30)));
		Assertions.assertEquals(
			Instant.parse(_DECEMBER_31),
			CommerceOrderItemUtil.getEntitlementEndDateInstant(
				_createOrderItem("endDate", _DECEMBER_31)));
	}

	@Test
	public void testGetEntitlementEndDateInstantTreatsEpochAsUnset() {
		Assertions.assertEquals(
			Instant.parse(_DECEMBER_31),
			CommerceOrderItemUtil.getEntitlementEndDateInstant(
				_createOrderItem(
					"effectiveEndDate", _EPOCH, "endDate", _DECEMBER_31)));
		Assertions.assertNull(
			CommerceOrderItemUtil.getEntitlementEndDateInstant(
				_createOrderItem(
					"effectiveEndDate", _EPOCH, "endDate", _EPOCH)));
	}

	@Test
	public void testGetProductOptionsParsesOptions() {
		OrderItem orderItem = _createOrderItem();

		orderItem.setOptions(
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"key", "Edition"
				).put(
					"value", new JSONArray(List.of("Enterprise"))
				)
			).put(
				new JSONObject(
				).put(
					"key", "Region"
				).put(
					"value", "US"
				)
			).put(
				new JSONObject(
				).put(
					"key", "Empty"
				).put(
					"value", new JSONArray()
				)
			).toString());

		Assertions.assertEquals(
			Map.of("edition", "Enterprise", "region", "US"),
			CommerceOrderItemUtil.getProductOptions(orderItem));
	}

	@Test
	public void testGetProductOptionsReturnsEmptyMapForMalformedOptions() {
		OrderItem orderItem = _createOrderItem();

		orderItem.setOptions("[{\"key\": ");

		Assertions.assertTrue(
			CommerceOrderItemUtil.getProductOptions(
				orderItem
			).isEmpty());
	}

	@Test
	public void testGetProductOptionsReturnsEmptyMapWithoutOptions() {
		Assertions.assertTrue(
			CommerceOrderItemUtil.getProductOptions(
				_createOrderItem()
			).isEmpty());
	}

	@Test
	public void testGetStartDateInstantTreatsEpochAsUnset() {
		Assertions.assertNull(
			CommerceOrderItemUtil.getStartDateInstant(
				_createOrderItem("startDate", _EPOCH)));
		Assertions.assertEquals(
			Instant.parse(_JUNE_30),
			CommerceOrderItemUtil.getStartDateInstant(
				_createOrderItem("startDate", _JUNE_30)));
	}

	@Test
	public void testIsApproved() {
		Assertions.assertTrue(
			CommerceOrderItemUtil.isApproved(
				_createOrderItem(
					"customStatus",
					CommerceOrderItemConstants.STATUS_APPROVED)));
		Assertions.assertFalse(
			CommerceOrderItemUtil.isApproved(
				_createOrderItem(
					"customStatus",
					CommerceOrderItemConstants.STATUS_CANCELED)));
		Assertions.assertFalse(
			CommerceOrderItemUtil.isApproved(_createOrderItem()));
	}

	@Test
	public void testIsCanceled() {
		Assertions.assertTrue(
			CommerceOrderItemUtil.isCanceled(
				_createOrderItem(
					"customStatus",
					CommerceOrderItemConstants.STATUS_CANCELED)));
		Assertions.assertFalse(
			CommerceOrderItemUtil.isCanceled(
				_createOrderItem(
					"customStatus",
					CommerceOrderItemConstants.STATUS_APPROVED)));
	}

	@Test
	public void testIsUpdateEffectiveEndDateComparesEndDateWhenNotTrimmed() {
		OrderItem orderItem = _createOrderItem("endDate", _DECEMBER_31);

		Assertions.assertFalse(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				orderItem, Instant.parse(_DECEMBER_31)));
		Assertions.assertTrue(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				orderItem, Instant.parse(_JUNE_30)));
	}

	@Test
	public void testIsUpdateEffectiveEndDateRejectsNullMessageEndDate() {
		Assertions.assertFalse(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				_createOrderItem("endDate", _DECEMBER_31), null));
	}

	@Test
	public void testIsUpdateEffectiveEndDateWithTrimmedEffectiveEndDate() {
		OrderItem orderItem = _createOrderItem(
			"effectiveEndDate", _JUNE_30, "endDate", _DECEMBER_31);

		Assertions.assertTrue(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				orderItem, Instant.parse("2026-05-01T00:00:00Z")));
		Assertions.assertFalse(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				orderItem, Instant.parse("2026-06-15T00:00:00Z")));
		Assertions.assertFalse(
			CommerceOrderItemUtil.isUpdateEffectiveEndDate(
				orderItem, Instant.parse(_DECEMBER_31)));
	}

	@Test
	public void testToOptionsJSONRoundTrips() {
		OrderItem orderItem = _createOrderItem();

		orderItem.setOptions(
			CommerceOrderItemUtil.toOptionsJSON("Edition", "Enterprise"));

		Assertions.assertEquals(
			Map.of("edition", "Enterprise"),
			CommerceOrderItemUtil.getProductOptions(orderItem));
	}

	private OrderItem _createOrderItem(String... namesAndValues) {
		OrderItem orderItem = new OrderItem();

		List<CustomField> customFields = new ArrayList<>();

		for (int i = 0; i < namesAndValues.length; i += 2) {
			CustomField customField = new CustomField();

			CustomValue customValue = new CustomValue();

			customValue.setData(namesAndValues[i + 1]);

			customField.setCustomValue(customValue);

			customField.setName(namesAndValues[i]);

			customFields.add(customField);
		}

		orderItem.setCustomFields(customFields.toArray(new CustomField[0]));

		return orderItem;
	}

	private static final String _DECEMBER_31 = "2026-12-31T00:00:00Z";

	private static final String _EPOCH = "1970-01-01T00:00:00Z";

	private static final String _JUNE_30 = "2026-06-30T00:00:00Z";

}