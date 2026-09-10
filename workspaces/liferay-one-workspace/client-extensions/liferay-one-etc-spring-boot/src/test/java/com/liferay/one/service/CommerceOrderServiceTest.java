/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.BillingAddress;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ricardo Mariz
 */
public class CommerceOrderServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_aiHubService = Mockito.mock(AIHubService.class);
		_commerceOrderService = Mockito.spy(new CommerceOrderService());
		_countryService = Mockito.mock(CountryService.class);
		_salesforceService = Mockito.mock(SalesforceService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		ReflectionTestUtils.setField(
			_commerceOrderService, "_aiHubService", _aiHubService);
		ReflectionTestUtils.setField(
			_commerceOrderService, "_countryService", _countryService);
		ReflectionTestUtils.setField(
			_commerceOrderService, "_salesforceService", _salesforceService);
		ReflectionTestUtils.setField(
			_commerceOrderService, "_userAccountService", _userAccountService);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).completeOrder(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyInt()
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).patchOrderExternalReferenceCode(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyString()
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).updateOrder(
			ArgumentMatchers.any(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyInt()
		);
	}

	@Test
	public void testCompleteSettledOrderCompletesAIHubTokenOrder()
		throws Exception {

		_whenFetchCommerceOrder(_createAIHubTokenOrder());

		Mockito.doReturn(
			new JSONObject(
			).put(
				"accountEntryId", 4321L
			)
		).when(
			_aiHubService
		).getAIHubApplicationJSONObject(
			"AI-HUB-ACCNT-TEST"
		);

		Mockito.doReturn(
			new JSONObject("{\"data\": {\"opportunityId\": \"006TEST\"}}")
		).when(
			_salesforceService
		).postSalesforceOpportunity(
			ArgumentMatchers.any(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any(Order.class), ArgumentMatchers.any()
		);

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		ArgumentCaptor<JSONObject> jsonObjectArgumentCaptor =
			ArgumentCaptor.forClass(JSONObject.class);

		Mockito.verify(
			_aiHubService
		).purchaseQuotaPrepaidBlock(
			ArgumentMatchers.eq(4321L), jsonObjectArgumentCaptor.capture()
		);

		JSONObject jsonObject = jsonObjectArgumentCaptor.getValue();

		Assertions.assertEquals(5000000L, jsonObject.getLong("size"));
		Assertions.assertEquals(_ORDER_ID, jsonObject.getLong("transactionId"));

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);

		Mockito.verify(
			_commerceOrderService
		).patchOrderExternalReferenceCode(
			_ORDER_ID, "006TEST"
		);
	}

	@Test
	public void testCompleteSettledOrderCompletesPaidOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "DXP_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);
	}

	@Test
	public void testCompleteSettledOrderCompletesPaymentNotRequiredOrder()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "CLOUD_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	@Test
	public void testCompleteSettledOrderCompletesProcessingOrder()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PROCESSING, "DXP_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);
	}

	@Test
	public void testCompleteSettledOrderSkipsAIHubTokenOrderQuotaBlockTwice()
		throws Exception {

		Order order = _createAIHubTokenOrder();

		_setAIHubOrderFields(
			order,
			"{\"aiHubQuotaBlockSize\": 5000000, \"salesforceProjectId\": " +
				"\"a1tTEST\"}");

		_whenFetchCommerceOrder(order);

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_aiHubService, Mockito.never()
		).purchaseQuotaPrepaidBlock(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED
		);
	}

	@Test
	public void testCompleteSettledOrderSkipsAIHubTokenOrderWithoutApplication()
		throws Exception {

		_whenFetchCommerceOrder(_createAIHubTokenOrder());

		Mockito.doReturn(
			null
		).when(
			_aiHubService
		).getAIHubApplicationJSONObject(
			ArgumentMatchers.anyString()
		);

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_aiHubService, Mockito.never()
		).purchaseQuotaPrepaidBlock(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsAIHubTokenOrderWithoutTokens()
		throws Exception {

		Order order = _createAIHubTokenOrder();

		OrderItem orderItem = new OrderItem();

		orderItem.setOptions(
			"[{\"key\": \"ai-hub-license-usage-type\", \"value\": " +
				"[\"activate\"]}]");

		order.setOrderItems(new OrderItem[] {orderItem});

		_whenFetchCommerceOrder(order);

		Mockito.doReturn(
			new JSONObject(
			).put(
				"accountEntryId", 4321L
			)
		).when(
			_aiHubService
		).getAIHubApplicationJSONObject(
			ArgumentMatchers.anyString()
		);

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		Mockito.verify(
			_aiHubService, Mockito.never()
		).purchaseQuotaPrepaidBlock(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsCanceledOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_CANCELLED, "DXP_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsCompletedOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_COMPLETED, "DXP_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsMissingOrder() throws Exception {
		_whenFetchCommerceOrder(null);

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsOpenCart() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_OPEN, "CLOUD_APP",
				_PAYMENT_STATUS_PENDING));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsOrderWithoutOrderType()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, null,
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsPendingPayment() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "DXP_APP",
				_PAYMENT_STATUS_PENDING));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrderSkipsUnrelatedOrderType()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "AI_HUB",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		_commerceOrderService.completeSettledOrder(_ORDER_ID);

		_verifyNeverCompleted();
	}

	@Test
	public void testCompleteSettledOrdersSweepsEveryPendingSettledOrder()
		throws Exception {

		Order order1 = _createOrder(
			CommerceOrderConstants.ORDER_STATUS_PENDING, "DXP_APP",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED);

		order1.setId(_ORDER_ID);

		Order order2 = _createOrder(
			CommerceOrderConstants.ORDER_STATUS_PENDING, "CLOUD_APP",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);

		order2.setId(_ORDER_ID + 1);

		Mockito.doReturn(
			List.of(order1, order2)
		).when(
			_commerceOrderService
		).getOrders(
			ArgumentMatchers.anyString()
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).completeSettledOrder(
			ArgumentMatchers.anyLong()
		);

		_commerceOrderService.completeSettledOrders();

		Mockito.verify(
			_commerceOrderService
		).getOrders(
			"(orderStatus/any(x:x eq 1) or orderStatus/any(x:x eq 10)) and " +
				"((paymentStatus eq 0) or (paymentStatus eq 23))"
		);

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID
		);

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID + 1
		);
	}

	@Test
	public void testCompleteSettledOrdersSweepsPastFailingOrder()
		throws Exception {

		Order order1 = _createOrder(
			CommerceOrderConstants.ORDER_STATUS_PENDING, "DXP_APP",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED);

		order1.setId(_ORDER_ID);

		Order order2 = _createOrder(
			CommerceOrderConstants.ORDER_STATUS_PENDING, "CLOUD_APP",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);

		order2.setId(_ORDER_ID + 1);

		Mockito.doReturn(
			List.of(order1, order2)
		).when(
			_commerceOrderService
		).getOrders(
			ArgumentMatchers.anyString()
		);

		Mockito.doThrow(
			new Exception()
		).when(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID + 1
		);

		_commerceOrderService.completeSettledOrders();

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID + 1
		);
	}

	@Test
	public void testCreateAIHubOpportunitiesSweepsEveryPendingOrder()
		throws Exception {

		Order order1 = _createAIHubOrder(
			"{\"salesforceProjectId\": \"a1tTEST\"}",
			CommerceOrderConstants.ORDER_STATUS_PENDING);

		Order order2 = _createAIHubOrder(
			"{\"salesforceProjectId\": \"a1tTEST\"}",
			CommerceOrderConstants.ORDER_STATUS_PROCESSING);

		order2.setId(_ORDER_ID + 1);

		Mockito.doReturn(
			List.of(order1, order2)
		).when(
			_commerceOrderService
		).getOrders(
			ArgumentMatchers.anyString()
		);

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).createAIHubOpportunity(
			ArgumentMatchers.anyLong()
		);

		_commerceOrderService.createAIHubOpportunities();

		Mockito.verify(
			_commerceOrderService
		).getOrders(
			"orderTypeExternalReferenceCode eq 'AI_HUB' and " +
				"(orderStatus/any(x:x eq 1) or orderStatus/any(x:x eq 10))"
		);

		Mockito.verify(
			_commerceOrderService
		).createAIHubOpportunity(
			_ORDER_ID
		);

		Mockito.verify(
			_commerceOrderService
		).createAIHubOpportunity(
			_ORDER_ID + 1
		);
	}

	@Test
	public void testCreateAIHubOpportunityCreatesOpportunity()
		throws Exception {

		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"contractEntityId\": 123, \"salesforceContractId\": " +
					"\"800TEST\", \"salesforceProjectId\": \"a1tTEST\"}",
				CommerceOrderConstants.ORDER_STATUS_PENDING));

		Mockito.doReturn(
			new JSONObject("{\"data\": {\"opportunityId\": \"006TEST\"}}")
		).when(
			_salesforceService
		).postSalesforceOpportunity(
			ArgumentMatchers.any(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any(Order.class), ArgumentMatchers.any()
		);

		_commerceOrderService.createAIHubOpportunity(_ORDER_ID);

		ArgumentCaptor<Map<String, Object>> mapArgumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			mapArgumentCaptor.capture(), ArgumentMatchers.eq(_ORDER_ID),
			ArgumentMatchers.eq(CommerceOrderConstants.ORDER_STATUS_PROCESSING)
		);

		Map<String, Object> customFields = mapArgumentCaptor.getValue();

		Assertions.assertEquals(123L, customFields.get("contractId"));
		Assertions.assertEquals(
			"a1tTEST", customFields.get("salesforceProjectId"));

		ArgumentCaptor<Map<String, Object>> markerArgumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_commerceOrderService
		).patchOrderCustomFields(
			ArgumentMatchers.eq(_ORDER_ID), markerArgumentCaptor.capture()
		);

		Map<String, Object> markerCustomFields =
			markerArgumentCaptor.getValue();

		String orderMetadata = (String)markerCustomFields.get("order-metadata");

		Assertions.assertTrue(orderMetadata.contains("006TEST"));

		Mockito.verify(
			_commerceOrderService
		).patchOrderExternalReferenceCode(
			_ORDER_ID, "006TEST"
		);
	}

	@Test
	public void testCreateAIHubOpportunityRejectsUnsupportedOrderType()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "CLOUD_APP",
				_PAYMENT_STATUS_PENDING));

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _commerceOrderService.createAIHubOpportunity(_ORDER_ID));
	}

	@Test
	public void testCreateAIHubOpportunitySkipsOpenCart() throws Exception {
		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"salesforceProjectId\": \"a1tTEST\"}",
				CommerceOrderConstants.ORDER_STATUS_OPEN));

		_commerceOrderService.createAIHubOpportunity(_ORDER_ID);

		_verifyNeverPostedOpportunity();
	}

	@Test
	public void testCreateAIHubOpportunitySkipsOrderWithOpportunity()
		throws Exception {

		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"salesforceOpportunityId\": \"006TEST\"}",
				CommerceOrderConstants.ORDER_STATUS_PENDING));

		_commerceOrderService.createAIHubOpportunity(_ORDER_ID);

		_verifyNeverPostedOpportunity();
	}

	@Test
	public void testCreateAIHubOpportunitySkipsOrderWithoutProject()
		throws Exception {

		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"aiHubForm\": {\"aiHubAccountName\": \"Test\"}}",
				CommerceOrderConstants.ORDER_STATUS_PENDING));

		_commerceOrderService.createAIHubOpportunity(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			ArgumentMatchers.any(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyInt()
		);

		_verifyNeverPostedOpportunity();
	}

	@Test
	public void testDispatchOrderUpdateCompletesSettledOrder()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				CommerceOrderConstants.ORDER_STATUS_PENDING, "DXP_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).completeSettledOrder(
			ArgumentMatchers.anyLong()
		);

		_commerceOrderService.dispatchOrderUpdate(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrder(
			_ORDER_ID
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).createAIHubOpportunity(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testDispatchOrderUpdateCreatesAIHubOpportunity()
		throws Exception {

		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"salesforceProjectId\": \"a1tTEST\"}",
				CommerceOrderConstants.ORDER_STATUS_PENDING));

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).createAIHubOpportunity(
			ArgumentMatchers.anyLong()
		);

		_commerceOrderService.dispatchOrderUpdate(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).createAIHubOpportunity(
			_ORDER_ID
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).completeSettledOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testDispatchOrderUpdateSkipsMissingOrder() throws Exception {
		_whenFetchCommerceOrder(null);

		_commerceOrderService.dispatchOrderUpdate(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).completeSettledOrder(
			ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).createAIHubOpportunity(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testDispatchOrderUpdateSkipsProcessingAIHubOrder()
		throws Exception {

		_whenFetchCommerceOrder(
			_createAIHubOrder(
				"{\"salesforceProjectId\": \"a1tTEST\"}",
				CommerceOrderConstants.ORDER_STATUS_PROCESSING));

		_commerceOrderService.dispatchOrderUpdate(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).createAIHubOpportunity(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testOnApplicationReadyCompletesSettledOrders()
		throws Exception {

		Mockito.doThrow(
			new Exception()
		).when(
			_commerceOrderService
		).completeSettledOrders();

		Mockito.doNothing(
		).when(
			_commerceOrderService
		).createAIHubOpportunities();

		_commerceOrderService.onApplicationReady();

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrders();
	}

	@Test
	public void testOnApplicationReadyCreatesAIHubOpportunities()
		throws Exception {

		Mockito.doThrow(
			new Exception()
		).when(
			_commerceOrderService
		).completeSettledOrders();

		Mockito.doThrow(
			new Exception()
		).when(
			_commerceOrderService
		).createAIHubOpportunities();

		_commerceOrderService.onApplicationReady();

		Mockito.verify(
			_commerceOrderService
		).createAIHubOpportunities();
	}

	private Order _createAIHubOrder(String orderMetadata, int orderStatus) {
		Order order = _createOrder(
			orderStatus, "AI_HUB", _PAYMENT_STATUS_PENDING);

		_setAIHubOrderFields(order, orderMetadata);

		return order;
	}

	private Order _createAIHubTokenOrder() {
		Order order = _createOrder(
			CommerceOrderConstants.ORDER_STATUS_PENDING, "AI_HUB_TOKEN",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED);

		_setAIHubOrderFields(
			order,
			"{\"salesforceContractId\": \"800TEST\", " +
				"\"salesforceProjectId\": \"a1tTEST\"}");

		OrderItem orderItem = new OrderItem();

		orderItem.setOptions(
			"[{\"key\": \"ai-hub-license-usage-type\", \"value\": " +
				"[\"5000000-lr-tokens\"]}]");

		order.setOrderItems(new OrderItem[] {orderItem});

		return order;
	}

	private Order _createOrder(
		int orderStatus, String orderTypeExternalReferenceCode,
		int paymentStatus) {

		Order order = new Order();

		order.setId(_ORDER_ID);
		order.setOrderStatus(orderStatus);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);
		order.setPaymentStatus(paymentStatus);

		return order;
	}

	private void _setAIHubOrderFields(Order order, String orderMetadata) {
		order.setAccountExternalReferenceCode("ACCNT-TEST");

		BillingAddress billingAddress = new BillingAddress();

		billingAddress.setCountryISOCode("US");

		order.setBillingAddress(billingAddress);

		order.setCreatorEmailAddress("test@liferay.com");

		Map<String, String> customFields = HashMapBuilder.put(
			"order-metadata", orderMetadata
		).build();

		order.setCustomFields(() -> customFields);
	}

	private void _verifyNeverCompleted() throws Exception {
		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).completeOrder(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyInt()
		);
	}

	private void _verifyNeverPostedOpportunity() throws Exception {
		Mockito.verify(
			_salesforceService, Mockito.never()
		).postSalesforceOpportunity(
			ArgumentMatchers.any(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any(Order.class), ArgumentMatchers.any()
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			ArgumentMatchers.any(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyInt()
		);
	}

	private void _whenFetchCommerceOrder(Order order) throws Exception {
		Mockito.doReturn(
			order
		).when(
			_commerceOrderService
		).fetchCommerceOrder(
			_ORDER_ID
		);
	}

	private static final long _ORDER_ID = 1000L;

	private static final int _PAYMENT_STATUS_PENDING = 1;

	private AIHubService _aiHubService;
	private CommerceOrderService _commerceOrderService;
	private CountryService _countryService;
	private SalesforceService _salesforceService;
	private UserAccountService _userAccountService;

}