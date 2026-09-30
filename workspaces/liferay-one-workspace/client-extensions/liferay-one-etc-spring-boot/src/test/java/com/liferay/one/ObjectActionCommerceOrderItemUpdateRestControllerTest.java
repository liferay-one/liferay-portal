/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.custom.field.CustomField;
import com.liferay.headless.commerce.admin.order.client.custom.field.CustomValue;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.service.CommerceOrderItemService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.PropertyService;

import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class ObjectActionCommerceOrderItemUpdateRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_objectActionCommerceOrderItemUpdateRestController =
			new ObjectActionCommerceOrderItemUpdateRestController();

		ReflectionTestUtils.setField(
			_objectActionCommerceOrderItemUpdateRestController,
			"_commerceOrderItemService", _commerceOrderItemService);
		ReflectionTestUtils.setField(
			_objectActionCommerceOrderItemUpdateRestController,
			"_commerceOrderService", _commerceOrderService);
		ReflectionTestUtils.setField(
			_objectActionCommerceOrderItemUpdateRestController, "_oktaService",
			_oktaService);
		ReflectionTestUtils.setField(
			_objectActionCommerceOrderItemUpdateRestController,
			"_propertyService", _propertyService);

		Order order = new Order();

		order.setAccountId(_ACCOUNT_ID);
		order.setId(_ORDER_ID);

		Mockito.when(
			_commerceOrderService.getCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_OKTA_APPLICATION)
		).thenReturn(
			_OKTA_APPLICATION_ID
		);
	}

	@Test
	public void testPostDeletesOktaApplicationAndProperty() throws Exception {
		_mockOrderItem(
			_createOrderItem(
				CommerceOrderItemConstants.STATUS_CANCELED, _ORDER_ITEM_ID));

		_objectActionCommerceOrderItemUpdateRestController.post(_createJSON());

		InOrder inOrder = Mockito.inOrder(_oktaService, _propertyService);

		inOrder.verify(
			_oktaService
		).deleteApplication(
			_OKTA_APPLICATION_ID
		);

		inOrder.verify(
			_propertyService
		).deleteAccountProperties(
			_ACCOUNT_ID, PropertyConstants.NAME_OKTA_APPLICATION
		);
	}

	@Test
	public void testPostKeepsOktaApplicationWithOtherActivePaasExperience()
		throws Exception {

		_mockOrderItem(
			_createOrderItem(
				CommerceOrderItemConstants.STATUS_CANCELED, _ORDER_ITEM_ID));

		Order otherOrder = new Order();

		otherOrder.setOrderItems(
			new OrderItem[] {
				_createOrderItem(
					CommerceOrderItemConstants.STATUS_APPROVED,
					_OTHER_ORDER_ITEM_ID)
			});

		Mockito.when(
			_commerceOrderService.getAccountOrders(_ACCOUNT_ID)
		).thenReturn(
			List.of(otherOrder)
		);

		_objectActionCommerceOrderItemUpdateRestController.post(_createJSON());

		Mockito.verifyNoInteractions(_oktaService);

		Mockito.verify(
			_propertyService, Mockito.never()
		).deleteAccountProperties(
			Mockito.anyLong(), Mockito.anyString()
		);
	}

	@Test
	public void testPostSkipsOrderItemThatIsNotCanceled() throws Exception {
		_mockOrderItem(
			_createOrderItem(
				CommerceOrderItemConstants.STATUS_APPROVED, _ORDER_ITEM_ID));

		_objectActionCommerceOrderItemUpdateRestController.post(_createJSON());

		Mockito.verifyNoInteractions(_oktaService, _propertyService);
	}

	private String _createJSON() {
		return new JSONObject(
		).put(
			"classPK", _ORDER_ITEM_ID
		).toString();
	}

	private OrderItem _createOrderItem(String customStatus, long orderItemId) {
		OrderItem orderItem = new OrderItem();

		CustomValue customValue = new CustomValue();

		customValue.setData(customStatus);

		CustomField customField = new CustomField();

		customField.setCustomValue(customValue);
		customField.setName("customStatus");

		orderItem.setCustomFields(new CustomField[] {customField});

		orderItem.setId(orderItemId);
		orderItem.setName(
			Map.of("en_US", CommerceProductConstants.NAME_PAAS_EXPERIENCE));
		orderItem.setOrderId(_ORDER_ID);

		return orderItem;
	}

	private void _mockOrderItem(OrderItem orderItem) throws Exception {
		Mockito.when(
			_commerceOrderItemService.fetchCommerceOrderItem(_ORDER_ITEM_ID)
		).thenReturn(
			orderItem
		);
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _OKTA_APPLICATION_ID = "0oa-cloud-native";

	private static final long _ORDER_ID = 2000L;

	private static final long _ORDER_ITEM_ID = 3000L;

	private static final long _OTHER_ORDER_ITEM_ID = 3001L;

	private final CommerceOrderItemService _commerceOrderItemService =
		Mockito.mock(CommerceOrderItemService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private ObjectActionCommerceOrderItemUpdateRestController
		_objectActionCommerceOrderItemUpdateRestController;
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);

}