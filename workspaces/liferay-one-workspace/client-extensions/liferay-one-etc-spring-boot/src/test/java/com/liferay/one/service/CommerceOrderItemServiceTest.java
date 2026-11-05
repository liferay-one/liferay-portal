/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.headless.commerce.admin.order.client.problem.Problem;
import com.liferay.headless.commerce.admin.order.client.resource.v1_0.OrderItemResource;
import com.liferay.headless.commerce.admin.order.client.resource.v1_0.OrderResource;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;

import java.math.BigDecimal;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Felipe Franca
 */
@DisplayName("[SVC-COMMERCEORDERITEMSERVICE] CommerceOrderItemService")
public class CommerceOrderItemServiceTest {

	@BeforeEach
	public void setUp() {
		_commerceOrderItemService = Mockito.spy(new CommerceOrderItemService());

		Mockito.doReturn(
			"Bearer token"
		).when(
			_commerceOrderItemService
		).getAuthorization();

		Mockito.doReturn(
			"localhost:8080"
		).when(
			_commerceOrderItemService
		).getDXPEndpointAddress();

		_orderResource = Mockito.mock(OrderResource.class);
	}

	@Test
	public void testPatchOrderItemCustomFieldsPatchesOrderOnce()
		throws Exception {

		OrderItem orderItemA = _createOrderItem(11L, _ERC_A, null, null);
		OrderItem orderItemB = _createOrderItem(12L, _ERC_B, null, null);
		OrderItem orderItemC = _createOrderItem(13L, _ERC_C, null, null);

		Order order = _createOrder(orderItemA, orderItemB, orderItemC);

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			order
		);

		_patchOrderItemCustomFields(
			order,
			Map.of(
				11L, Map.of("effectiveEndDate", "2027-01-01T00:00:00Z"), 13L,
				Map.of("effectiveEndDate", "2027-02-01T00:00:00Z")));

		OrderItem[] patchedOrderItems = _getPatchedOrderItems();

		Assertions.assertEquals(3, patchedOrderItems.length);
		Assertions.assertSame(orderItemA, patchedOrderItems[0]);
		Assertions.assertSame(orderItemB, patchedOrderItems[1]);
		Assertions.assertSame(orderItemC, patchedOrderItems[2]);

		Assertions.assertEquals(
			"2027-01-01T00:00:00Z",
			_getCustomFieldData(patchedOrderItems[0], "effectiveEndDate"));
		Assertions.assertNull(patchedOrderItems[1].getCustomFields());
		Assertions.assertEquals(
			"2027-02-01T00:00:00Z",
			_getCustomFieldData(patchedOrderItems[2], "effectiveEndDate"));
	}

	@Test
	public void testPatchOrderItemCustomFieldsSkipsOrderWithoutChanges()
		throws Exception {

		Order order = _createOrder(_createOrderItem(11L, _ERC_A, null, null));

		_patchOrderItemCustomFields(order, Map.of());

		Mockito.verifyNoInteractions(_orderResource);
	}

	@Test
	public void testUpsertOrderItemsKeepsCanceledStatus() throws Exception {
		OrderItem existingOrderItem = _createOrderItem(
			11L, _ERC_A, "customStatus",
			CommerceOrderItemConstants.STATUS_CANCELED);

		Order order = _createOrder(existingOrderItem);

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			order
		);

		_upsertOrderItems(order, _createLineItemJSON(_ERC_A, 3, null));

		OrderItem[] patchedOrderItems = _getPatchedOrderItems();

		Assertions.assertFalse(
			_hasCustomField(patchedOrderItems[0], "customStatus"));
		Assertions.assertTrue(
			_hasCustomField(patchedOrderItems[0], "startDate"));
	}

	@Test
	public void testUpsertOrderItemsKeepsEffectiveEndDateWhenEndDateIsUnchanged()
		throws Exception {

		OrderItem existingOrderItem = _createOrderItem(
			11L, _ERC_A, "endDate", "2027-11-01T00:00:00Z");

		Order order = _createOrder(existingOrderItem);

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			order
		);

		_upsertOrderItems(order, _createLineItemJSON(_ERC_A, 3, "2027-10-31"));

		OrderItem[] patchedOrderItems = _getPatchedOrderItems();

		Assertions.assertFalse(
			_hasCustomField(patchedOrderItems[0], "effectiveEndDate"));
		Assertions.assertTrue(_hasCustomField(patchedOrderItems[0], "endDate"));
	}

	@Test
	public void testUpsertOrderItemsPatchesOrderOnce() throws Exception {
		OrderItem orderItemA = _createOrderItem(11L, _ERC_A, null, null);
		OrderItem orderItemB = _createOrderItem(12L, _ERC_B, null, null);

		Order order = _createOrder(orderItemA, orderItemB);

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			order
		);

		try (MockedStatic<OrderItemResource> orderItemResourceMockedStatic =
				Mockito.mockStatic(OrderItemResource.class)) {

			_upsertOrderItems(
				order, _createLineItemJSON(_ERC_A, 3, null),
				_createLineItemJSON(_ERC_C, 1, null));

			orderItemResourceMockedStatic.verifyNoInteractions();
		}

		ArgumentCaptor<Order> orderArgumentCaptor = ArgumentCaptor.forClass(
			Order.class);

		Mockito.verify(
			_orderResource, Mockito.times(1)
		).patchOrder(
			ArgumentMatchers.eq(_ORDER_ID), orderArgumentCaptor.capture()
		);

		Order patchedOrder = orderArgumentCaptor.getValue();

		Assertions.assertNull(patchedOrder.getCustomFields());
		Assertions.assertNull(patchedOrder.getTotal());

		OrderItem[] patchedOrderItems = patchedOrder.getOrderItems();

		Assertions.assertEquals(3, patchedOrderItems.length);

		Assertions.assertEquals(
			_ERC_A, patchedOrderItems[0].getExternalReferenceCode());
		Assertions.assertEquals(11L, patchedOrderItems[0].getId());
		Assertions.assertEquals(
			BigDecimal.valueOf(3.0), patchedOrderItems[0].getQuantity());
		Assertions.assertEquals(
			BigDecimal.valueOf(1000.0), patchedOrderItems[0].getUnitPrice());
		Assertions.assertEquals(
			BigDecimal.valueOf(3000.0), patchedOrderItems[0].getFinalPrice());
		Assertions.assertSame(orderItemB, patchedOrderItems[1]);
		Assertions.assertEquals(
			_ERC_C, patchedOrderItems[2].getExternalReferenceCode());
		Assertions.assertNull(patchedOrderItems[2].getId());
	}

	@Test
	public void testUpsertOrderItemsRefreshesOrderItems() throws Exception {
		Order order = _createOrder(
			_createOrderItem(11L, _ERC_A, null, null),
			_createOrderItem(12L, _ERC_B, null, null));

		OrderItem[] updatedOrderItems = {
			_createOrderItem(11L, _ERC_A, null, null),
			_createOrderItem(12L, _ERC_B, null, null)
		};

		Order updatedOrder = new Order();

		updatedOrder.setOrderItems(updatedOrderItems);

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			updatedOrder
		);

		_upsertOrderItems(order, _createLineItemJSON(_ERC_A, 3, null));

		Assertions.assertSame(updatedOrderItems, order.getOrderItems());
	}

	@Test
	public void testUpsertOrderItemsRequestsEveryOrderItem() throws Exception {
		Order order = _createOrder(_createOrderItem(11L, _ERC_A, null, null));

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenReturn(
			order
		);

		_upsertOrderItems(order, _createLineItemJSON(_ERC_A, 3, null));

		Mockito.verify(
			_orderResourceBuilder
		).parameters(
			"nestedFields", "orderItems,orderItems.customFields",
			"orderItems.pageSize", "-1"
		);
	}

	@Test
	public void testUpsertOrderItemsThrowsWhenPatchOrderFails()
		throws Exception {

		Order order = _createOrder(_createOrderItem(11L, _ERC_A, null, null));

		Mockito.when(
			_orderResource.patchOrder(
				ArgumentMatchers.eq(_ORDER_ID), ArgumentMatchers.any())
		).thenThrow(
			new Problem.ProblemException(new Problem())
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() -> _upsertOrderItems(
				order, _createLineItemJSON(_ERC_A, 3, null)));
	}

	private JSONObject _createLineItemJSON(
		String id, int quantity, String endDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"Id", id
		).put(
			"Product2Id", "01t4u00000dkhimAAA"
		).put(
			"Quantity", quantity
		).put(
			"ServiceDate", "2026-11-01"
		).put(
			"TotalPrice", quantity * 1000
		).put(
			"UnitPrice", 1000
		);

		if (endDate != null) {
			jsonObject.put("End_Date__c", endDate);
		}

		return jsonObject;
	}

	private Order _createOrder(OrderItem... orderItems) {
		Order order = new Order();

		order.setId(_ORDER_ID);
		order.setOrderItems(orderItems);

		return order;
	}

	private OrderItem _createOrderItem(
		long id, String externalReferenceCode, String customFieldName,
		String customFieldValue) {

		OrderItem orderItem = new OrderItem();

		if (customFieldName != null) {
			CustomValue customValue = new CustomValue();

			customValue.setData(customFieldValue);

			CustomField customField = new CustomField();

			customField.setCustomValue(customValue);
			customField.setName(customFieldName);

			orderItem.setCustomFields(new CustomField[] {customField});
		}

		orderItem.setExternalReferenceCode(externalReferenceCode);
		orderItem.setId(id);

		return orderItem;
	}

	private String _getCustomFieldData(OrderItem orderItem, String name) {
		for (CustomField customField : orderItem.getCustomFields()) {
			if (name.equals(customField.getName())) {
				CustomValue customValue = customField.getCustomValue();

				return String.valueOf(customValue.getData());
			}
		}

		return null;
	}

	private OrderItem[] _getPatchedOrderItems() throws Exception {
		ArgumentCaptor<Order> orderArgumentCaptor = ArgumentCaptor.forClass(
			Order.class);

		Mockito.verify(
			_orderResource
		).patchOrder(
			ArgumentMatchers.eq(_ORDER_ID), orderArgumentCaptor.capture()
		);

		Order patchedOrder = orderArgumentCaptor.getValue();

		return patchedOrder.getOrderItems();
	}

	private boolean _hasCustomField(OrderItem orderItem, String name) {
		CustomField[] customFields = orderItem.getCustomFields();

		for (CustomField customField : customFields) {
			if (name.equals(customField.getName())) {
				return true;
			}
		}

		return false;
	}

	private OrderResource.Builder _mockOrderResourceBuilder() {
		OrderResource.Builder builder = Mockito.mock(
			OrderResource.Builder.class, Mockito.RETURNS_SELF);

		_orderResourceBuilder = builder;

		Mockito.when(
			builder.build()
		).thenReturn(
			_orderResource
		);

		return builder;
	}

	private void _patchOrderItemCustomFields(
			Order order, Map<Long, Map<String, Object>> customFieldValuesMap)
		throws Exception {

		OrderResource.Builder builder = _mockOrderResourceBuilder();

		try (MockedStatic<OrderResource> orderResourceMockedStatic =
				Mockito.mockStatic(OrderResource.class)) {

			orderResourceMockedStatic.when(
				OrderResource::builder
			).thenReturn(
				builder
			);

			_commerceOrderItemService.patchOrderItemCustomFields(
				order, customFieldValuesMap);
		}
	}

	private void _upsertOrderItems(Order order, JSONObject... jsonObjects)
		throws Exception {

		OrderResource.Builder builder = _mockOrderResourceBuilder();

		try (MockedStatic<OrderResource> orderResourceMockedStatic =
				Mockito.mockStatic(OrderResource.class)) {

			orderResourceMockedStatic.when(
				OrderResource::builder
			).thenReturn(
				builder
			);

			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
				new ArrayList<>();

			for (JSONObject jsonObject : jsonObjects) {
				salesforceOpportunityLineItems.add(
					new SalesforceOpportunityLineItem(jsonObject));
			}

			_commerceOrderItemService.upsertOrderItems(
				order, salesforceOpportunityLineItems, "Closed Won");
		}
	}

	private static final String _ERC_A = "00kLPD113954TEST0A";

	private static final String _ERC_B = "00kLPD113954TEST0B";

	private static final String _ERC_C = "00kLPD113954TEST0C";

	private static final long _ORDER_ID = 1001L;

	private CommerceOrderItemService _commerceOrderItemService;
	private OrderResource _orderResource;
	private OrderResource.Builder _orderResourceBuilder;

}