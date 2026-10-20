/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Status;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;

import java.util.Collection;
import java.util.Date;
import java.util.Map;

/**
 * @author Ryan Schuhler
 */
public class CommerceOrderCSVUtil {

	public static final String FILE_NAME = "orders.csv";

	public static String toCSV(Collection<Order> orders) {
		StringBundler sb = new StringBundler(1 + orders.size());

		sb.append(_HEADER);

		for (Order order : orders) {
			Account account = order.getAccount();

			sb.append(
				CSVUtil.formatFields(
					(account == null) ? null :
						account.getExternalReferenceCode(),
					(account == null) ? null : account.getName(),
					_formatDate(order.getCreateDate()),
					order.getCreatorEmailAddress(), order.getId(),
					_getLabel(order.getOrderStatusInfo()),
					order.getOrderTypeExternalReferenceCode(),
					_getLabel(order.getPaymentStatusInfo()),
					_getProductName(order), order.getTotalFormatted()));
		}

		return sb.toString();
	}

	private static String _formatDate(Date date) {
		if (date == null) {
			return null;
		}

		return String.valueOf(date.toInstant());
	}

	private static String _getLabel(Status status) {
		if (status == null) {
			return null;
		}

		return status.getLabel();
	}

	private static String _getProductName(Order order) {
		OrderItem[] orderItems = order.getOrderItems();

		if (ArrayUtil.isEmpty(orderItems)) {
			return null;
		}

		Map<String, String> name = orderItems[0].getName();

		if (name == null) {
			return null;
		}

		return CommerceOrderUtil.getDefaultLocale(name);
	}

	private static final String _HEADER = StringBundler.concat(
		"Account ERC,Account Name,Create Date,Creator Email,Order ID,",
		"Order Status,Order Type,Payment Status,Product Name,Total\n");

}