/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * @author Felipe Veloso
 */
public class OrderItemUtil {

	public static String getEffectiveEndDate(OrderItem orderItem) {
		return GetterUtil.getString(
			_getCustomFieldValue(orderItem, "effectiveEndDate"));
	}

	public static String getEndDate(OrderItem orderItem) {
		return GetterUtil.getString(_getCustomFieldValue(orderItem, "endDate"));
	}

	public static Map<String, String> getProductOptions(OrderItem orderItem) {
		Map<String, String> productOptions = new HashMap<>();

		String optionsJSON = orderItem.getOptions();

		if (Validator.isNull(optionsJSON)) {
			return productOptions;
		}

		try {
			JSONArray optionsJSONArray = new JSONArray(optionsJSON);

			for (int i = 0; i < optionsJSONArray.length(); i++) {
				JSONObject optionJSONObject = optionsJSONArray.getJSONObject(i);

				String value = _getOptionValue(optionJSONObject);

				if (value == null) {
					continue;
				}

				productOptions.put(optionJSONObject.optString("key"), value);
			}
		}
		catch (JSONException jsonException) {
			_log.error(jsonException);
		}

		return productOptions;
	}

	public static String getStartDate(OrderItem orderItem) {
		return GetterUtil.getString(
			_getCustomFieldValue(orderItem, "startDate"));
	}

	public static String getStatus(OrderItem orderItem) {
		return GetterUtil.getString(
			_getCustomFieldValue(orderItem, "customStatus"));
	}

	public static boolean isApproved(OrderItem orderItem) {
		return CommerceOrderItemConstants.STATUS_APPROVED.equals(
			getStatus(orderItem));
	}

	public static boolean isCanceled(OrderItem orderItem) {
		return CommerceOrderItemConstants.STATUS_CANCELED.equals(
			getStatus(orderItem));
	}

	private static Object _getCustomFieldValue(
		OrderItem orderItem, String name) {

		CustomField[] customFields = orderItem.getCustomFields();

		if (customFields == null) {
			return null;
		}

		for (CustomField customField : customFields) {
			if (!Objects.equals(customField.getName(), name)) {
				continue;
			}

			CustomValue customValue = customField.getCustomValue();

			if (customValue == null) {
				return null;
			}

			return customValue.getData();
		}

		return null;
	}

	private static String _getOptionValue(JSONObject optionJSONObject) {
		JSONArray valueJSONArray = optionJSONObject.optJSONArray("value");

		if (valueJSONArray != null) {
			if (valueJSONArray.isEmpty()) {
				return null;
			}

			return valueJSONArray.getString(0);
		}

		return optionJSONObject.optString("value", null);
	}

	private static final Log _log = LogFactory.getLog(OrderItemUtil.class);

}