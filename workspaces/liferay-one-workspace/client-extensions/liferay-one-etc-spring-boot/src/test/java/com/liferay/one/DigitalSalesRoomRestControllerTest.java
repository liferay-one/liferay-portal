/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.service.AnalyticsCloudService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class DigitalSalesRoomRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_digitalSalesRoomRestController = new DigitalSalesRoomRestController();

		_analyticsCloudService = Mockito.mock(AnalyticsCloudService.class);
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 42
			)
		);

		ReflectionTestUtils.setField(
			_digitalSalesRoomRestController, "_analyticsCloudService",
			_analyticsCloudService);
		ReflectionTestUtils.setField(
			_digitalSalesRoomRestController, "_commerceOrderService",
			_commerceOrderService);
	}

	@Test
	public void testPostProvisioningOrderCancelsOrderWhenProvisioningFails()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				"DSR", CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED,
				_DSR_SETTINGS));

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenThrow(
			new IllegalStateException("Analytics Cloud is unavailable")
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_ORDER_ID));

		Map<String, ?> customFields = _captureCancelledCustomFields();

		Assertions.assertEquals(
			"Analytics Cloud is unavailable", customFields.get("dsrError"));
		Assertions.assertNotNull(customFields.get("dsrErrorDate"));
	}

	@Test
	public void testPostProvisioningOrderCompletesOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				"DSR", CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED,
				_DSR_SETTINGS));

		ResponseEntity<Void> responseEntity =
			_digitalSalesRoomRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq(""), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		Assertions.assertEquals(
			"Acme Sales Room",
			analyticsCloudProjectJSONObject.getString("corpProjectName"));
		Assertions.assertEquals(
			"europe-west2-ac2-c1",
			analyticsCloudProjectJSONObject.getString("serverLocation"));
		Assertions.assertEquals(
			"owner@acme.com",
			analyticsCloudProjectJSONObject.getString("ownerEmailAddress"));

		Map<String, ?> customFields = _captureCompletedCustomFields();

		Assertions.assertEquals(
			"Acme Sales Room", customFields.get("dsrWorkspaceName"));
		Assertions.assertNotNull(customFields.get("dsrAnalyticsCloudProject"));
	}

	@Test
	public void testPostProvisioningOrderFallsBackToOrderCreatorEmailAddress()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				"DSR", CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED,
				"{\"workspaceName\": \"Acme Sales Room\"}"));

		_digitalSalesRoomRestController.postProvisioningOrder(_ORDER_ID);

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq(""), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		Assertions.assertEquals(
			"creator@acme.com",
			analyticsCloudProjectJSONObject.getString("ownerEmailAddress"));
		Assertions.assertEquals(
			"INTERNAL",
			analyticsCloudProjectJSONObject.getString("serverLocation"));
	}

	@Test
	public void testPostProvisioningOrderSkipsUnpaidOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder("DSR", _ORDER_PAYMENT_STATUS_PENDING, _DSR_SETTINGS));

		ResponseEntity<Void> responseEntity =
			_digitalSalesRoomRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testPostProvisioningOrderWithoutOrder() throws Exception {
		_whenFetchCommerceOrder(null);

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_ORDER_ID));
	}

	@Test
	public void testPostProvisioningOrderWithoutWorkspaceName()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				"DSR", CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED,
				"{}"));

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_ORDER_ID));
	}

	@Test
	public void testPostProvisioningOrderWithUnsupportedOrderType()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				"LDP", CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED,
				_DSR_SETTINGS));

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_ORDER_ID));
	}

	private Map<String, ?> _captureCancelledCustomFields() throws Exception {
		ArgumentCaptor<Map<String, ?>> argumentCaptor = ArgumentCaptor.forClass(
			Map.class);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			argumentCaptor.capture(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_CANCELLED)
		);

		return argumentCaptor.getValue();
	}

	private Map<String, ?> _captureCompletedCustomFields() throws Exception {
		ArgumentCaptor<Map<String, ?>> argumentCaptor = ArgumentCaptor.forClass(
			Map.class);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			argumentCaptor.capture(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_COMPLETED),
			ArgumentMatchers.anyInt()
		);

		return argumentCaptor.getValue();
	}

	private Order _createOrder(
		String orderTypeExternalReferenceCode, int paymentStatus,
		String dsrSettings) {

		Order order = new Order();

		order.setAccountExternalReferenceCode(_ACCOUNT_EXTERNAL_REFERENCE_CODE);
		order.setCreatorEmailAddress("creator@acme.com");
		order.setCustomFields(
			() -> HashMapBuilder.put(
				"dsrSettings", dsrSettings
			).build());
		order.setOrderStatus(CommerceOrderConstants.ORDER_STATUS_PENDING);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);
		order.setPaymentStatus(paymentStatus);

		return order;
	}

	private void _whenFetchCommerceOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCT-1";

	private static final String _DSR_SETTINGS = new JSONObject(
	).put(
		"dataCenterLocation", "europe-west2-ac2-c1"
	).put(
		"workspaceName", "Acme Sales Room"
	).put(
		"workspaceOwnerEmail", "owner@acme.com"
	).toString();

	private static final long _ORDER_ID = 1L;

	private static final int _ORDER_PAYMENT_STATUS_PENDING = 1;

	private AnalyticsCloudService _analyticsCloudService;
	private CommerceOrderService _commerceOrderService;
	private DigitalSalesRoomRestController _digitalSalesRoomRestController;

}