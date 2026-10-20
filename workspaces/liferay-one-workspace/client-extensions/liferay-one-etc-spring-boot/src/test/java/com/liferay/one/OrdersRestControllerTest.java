/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Status;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.time.Instant;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[REST-GET-ORDERS-EXPORT] [CLS-COMMERCEORDERCSVUTIL] OrdersRestController"
)
public class OrdersRestControllerTest {

	@BeforeEach
	public void setUp() {
		_ordersRestController = new OrdersRestController();

		ReflectionTestUtils.setField(
			_ordersRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			_ordersRestController, "_commerceOrderService",
			_commerceOrderService);
	}

	@Test
	public void testGetOrdersExport() throws Exception {
		Mockito.when(
			_commerceOrderService.getLatestOrders(
				ArgumentMatchers.eq(_FILTER_STRING), ArgumentMatchers.anyInt())
		).thenReturn(
			List.of(_createOrder())
		);

		ResponseEntity<String> responseEntity =
			_ordersRestController.getOrdersExport(_jwt, _FILTER_STRING);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"orders.csv\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
		Assertions.assertEquals(
			"text/csv", String.valueOf(httpHeaders.getContentType()));

		Assertions.assertEquals(
			StringBundler.concat(
				"Account ERC,Account Name,Create Date,Creator Email,Order ID,",
				"Order Status,Order Type,Payment Status,Product Name,Total\n",
				"\"ACCNT-1\",\"Acme\",\"2026-10-01T12:00:00Z\",",
				"\"buyer@acme.com\",\"42\",\"Completed\",\"DXP\",",
				"\"Paid\",\"Liferay DXP\",\"'-$1,000.00\"\n"),
			responseEntity.getBody());
	}

	@Test
	public void testGetOrdersExportReadsBoundedOrders() throws Exception {
		Mockito.when(
			_commerceOrderService.getLatestOrders(
				ArgumentMatchers.isNull(), ArgumentMatchers.anyInt())
		).thenReturn(
			Collections.emptyList()
		);

		_ordersRestController.getOrdersExport(_jwt, "");

		Mockito.verify(
			_commerceOrderService
		).getLatestOrders(
			ArgumentMatchers.isNull(),
			ArgumentMatchers.intThat(maxCount -> maxCount > 0)
		);
	}

	@Test
	public void testGetOrdersExportRequiresAnAdministrator() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			_jwt
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ordersRestController.getOrdersExport(_jwt, _FILTER_STRING));

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	private Order _createOrder() {
		Order order = new Order();

		Account account = new Account();

		account.setExternalReferenceCode("ACCNT-1");
		account.setName("Acme");

		order.setAccount(account);

		order.setCreateDate(Date.from(Instant.parse("2026-10-01T12:00:00Z")));
		order.setCreatorEmailAddress("buyer@acme.com");
		order.setId(42L);

		OrderItem orderItem = new OrderItem();

		orderItem.setName(Collections.singletonMap("en_US", "Liferay DXP"));

		order.setOrderItems(new OrderItem[] {orderItem});

		Status orderStatus = new Status();

		orderStatus.setLabel("Completed");

		order.setOrderStatusInfo(orderStatus);

		order.setOrderTypeExternalReferenceCode("DXP");

		Status paymentStatus = new Status();

		paymentStatus.setLabel("Paid");

		order.setPaymentStatusInfo(paymentStatus);

		order.setTotalFormatted("-$1,000.00");

		return order;
	}

	private static final String _FILTER_STRING = "orderStatus eq 0";

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private OrdersRestController _ordersRestController;

}