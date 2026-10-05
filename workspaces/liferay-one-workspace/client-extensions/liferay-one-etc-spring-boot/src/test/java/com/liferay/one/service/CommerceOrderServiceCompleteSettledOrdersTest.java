/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-COMPLETESETTLEDORDERS] CommerceOrderService#completeSettledOrders"
)
public class CommerceOrderServiceCompleteSettledOrdersTest {

	@BeforeEach
	public void setUp() throws Exception {
		_commerceOrderService = Mockito.spy(new CommerceOrderService());

		_pendingOrder = _createOrder(
			1L, CommerceOrderConstants.ORDER_STATUS_PENDING,
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED);
		_processingOrder = _createOrder(
			2L, CommerceOrderConstants.ORDER_STATUS_PROCESSING,
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);

		Mockito.doReturn(
			List.of(_pendingOrder, _processingOrder)
		).when(
			_commerceOrderService
		).getOrders(
			ArgumentMatchers.anyString()
		);

		Mockito.doReturn(
			_pendingOrder
		).when(
			_commerceOrderService
		).fetchCommerceOrder(
			1L
		);

		Mockito.doReturn(
			_processingOrder
		).when(
			_commerceOrderService
		).fetchCommerceOrder(
			2L
		);

		Mockito.doAnswer(
			invocation -> {
				long orderId = invocation.getArgument(0);

				Order order = _pendingOrder;

				if (orderId == 2L) {
					order = _processingOrder;
				}

				order.setOrderStatus(
					CommerceOrderConstants.ORDER_STATUS_COMPLETED);

				return null;
			}
		).when(
			_commerceOrderService
		).completeOrder(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyInt()
		);
	}

	@Test
	public void testCompleteSettledOrdersCompletesEachSettledOrder()
		throws Exception {

		_commerceOrderService.completeSettledOrders();

		Mockito.verify(
			_commerceOrderService
		).getOrders(
			"(orderStatus/any(x:x eq 1) or orderStatus/any(x:x eq 10)) and " +
				"((paymentStatus eq 0) or (paymentStatus eq 23))"
		);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			1L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			2L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	@Test
	public void testCompleteSettledOrdersContinuesAfterFailure()
		throws Exception {

		Mockito.doThrow(
			new IllegalStateException("Unable to complete order")
		).when(
			_commerceOrderService
		).completeOrder(
			1L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);

		_commerceOrderService.completeSettledOrders();

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			2L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	@Test
	public void testCompleteSettledOrdersIsIdempotent() throws Exception {
		_commerceOrderService.completeSettledOrders();
		_commerceOrderService.completeSettledOrders();

		Mockito.verify(
			_commerceOrderService, Mockito.times(1)
		).completeOrder(
			1L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);

		Mockito.verify(
			_commerceOrderService, Mockito.times(1)
		).completeOrder(
			2L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	private Order _createOrder(
		long orderId, int orderStatus, int paymentStatus) {

		Order order = new Order();

		order.setId(orderId);
		order.setOrderStatus(orderStatus);
		order.setOrderTypeExternalReferenceCode("CLOUD_APP");
		order.setPaymentStatus(paymentStatus);

		return order;
	}

	private CommerceOrderService _commerceOrderService;
	private Order _pendingOrder;
	private Order _processingOrder;

}