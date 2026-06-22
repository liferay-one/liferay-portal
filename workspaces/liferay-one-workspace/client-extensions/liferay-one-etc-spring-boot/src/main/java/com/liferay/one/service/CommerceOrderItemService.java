/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.problem.Problem;
import com.liferay.headless.commerce.admin.order.client.resource.v1_0.OrderItemResource;
import com.liferay.one.model.OrderItem;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class CommerceOrderItemService extends OneBaseService {

	public OrderItem fetchCommerceOrderItem(long commerceOrderItemId)
		throws Exception {

		OrderItemResource orderItemResource = _buildOrderItemResource();

		try {
			com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem
				orderItem = orderItemResource.getOrderItem(commerceOrderItemId);

			return new OrderItem(orderItem);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	public void patchOrderItem(
			Long orderItemId,
			com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem
				orderItem)
		throws Exception {

		OrderItemResource orderItemResource = _buildOrderItemResource();

		orderItemResource.patchOrderItem(orderItemId, orderItem);
	}

	private OrderItemResource _buildOrderItemResource() {
		return OrderItemResource.builder(
		).endpoint(
			lxcDXPMainDomain, lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameters(
			"nestedFields", "customFields"
		).build();
	}

}