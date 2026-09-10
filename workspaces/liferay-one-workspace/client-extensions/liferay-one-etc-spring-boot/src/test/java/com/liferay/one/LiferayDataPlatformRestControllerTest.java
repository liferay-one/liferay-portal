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
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ricardo Mariz
 */
public class LiferayDataPlatformRestControllerTest {

	@BeforeEach
	public void setUp() {
		_liferayDataPlatformRestController =
			new LiferayDataPlatformRestController();

		ReflectionTestUtils.setField(
			_liferayDataPlatformRestController, "_analyticsCloudService",
			_analyticsCloudService);
		ReflectionTestUtils.setField(
			_liferayDataPlatformRestController, "_commerceOrderService",
			_commerceOrderService);
	}

	@Test
	public void testPostProvisioningOrderCancelsOrderWhenProvisioningFails()
		throws Exception {

		_setUpOrder(_createOrder(null));

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				Mockito.anyString(), Mockito.any(JSONObject.class),
				Mockito.anyString())
		).thenThrow(
			new IllegalStateException("Analytics Cloud is unavailable")
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _liferayDataPlatformRestController.postProvisioningOrder(
				_ORDER_ID));

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			Mockito.anyMap(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_CANCELLED)
		);
	}

	@Test
	public void testPostProvisioningOrderNormalizesFriendlyURL()
		throws Exception {

		_setUpOrder(_createOrder("  //acme  "));

		_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq("internal"), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		Assertions.assertEquals(
			"/acme", analyticsCloudProjectJSONObject.getString("friendlyURL"));
	}

	@Test
	public void testPostProvisioningOrderProvisionsWorkspace()
		throws Exception {

		_setUpOrder(_createOrder(null));

		ResponseEntity<Void> responseEntity =
			_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq("internal"), Mockito.any(JSONObject.class),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			Mockito.anyMap(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_COMPLETED),
			Mockito.eq(CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED)
		);
	}

	@Test
	public void testPostProvisioningOrderReusesExistingWorkspace()
		throws Exception {

		_setUpOrder(_createOrder(null));

		Mockito.when(
			_analyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"internal", _ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 1234
			)
		);

		ResponseEntity<Void> responseEntity =
			_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).provisionAnalyticsCloudProject(
			Mockito.anyString(), Mockito.any(JSONObject.class),
			Mockito.anyString()
		);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			Mockito.anyMap(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_COMPLETED),
			Mockito.eq(CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED)
		);
	}

	@Test
	public void testPostProvisioningOrderSkipsUnpaidOrder() throws Exception {
		Order order = _createOrder(null);

		order.setPaymentStatus(() -> 1);

		_setUpOrder(order);

		ResponseEntity<Void> responseEntity =
			_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testPostProvisioningOrderThrowsForUnsupportedOrderType()
		throws Exception {

		Order order = _createOrder(null);

		order.setOrderTypeExternalReferenceCode(() -> "DXP");

		_setUpOrder(order);

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _liferayDataPlatformRestController.postProvisioningOrder(
				_ORDER_ID));
	}

	private Map<String, String> _createCustomFields(
		String friendlyWorkspaceURL) {

		return HashMapBuilder.put(
			"ldpSettings", _createLDPSettings(friendlyWorkspaceURL)
		).build();
	}

	private String _createLDPSettings(String friendlyWorkspaceURL) {
		JSONObject ldpSettingsJSONObject = new JSONObject(
		).put(
			"dataCenterLocation", "INTERNAL"
		).put(
			"workspaceName", _WORKSPACE_NAME
		).put(
			"workspaceOwnerEmail", "owner@liferay.com"
		);

		if (friendlyWorkspaceURL != null) {
			ldpSettingsJSONObject.put(
				"friendlyWorkspaceURL", friendlyWorkspaceURL);
		}

		return ldpSettingsJSONObject.toString();
	}

	private Order _createOrder(String friendlyWorkspaceURL) {
		Order order = new Order();

		order.setAccountExternalReferenceCode(
			() -> _ACCOUNT_EXTERNAL_REFERENCE_CODE);
		order.setCustomFields(() -> _createCustomFields(friendlyWorkspaceURL));
		order.setId(() -> _ORDER_ID);
		order.setOrderStatus(() -> CommerceOrderConstants.ORDER_STATUS_PENDING);
		order.setOrderTypeExternalReferenceCode(() -> "LDP");
		order.setPaymentStatus(
			() -> CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED);

		return order;
	}

	private void _setUpOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				Mockito.anyString(), Mockito.any(JSONObject.class),
				Mockito.anyString())
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 5678
			)
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACME";

	private static final long _ORDER_ID = 1000L;

	private static final String _WORKSPACE_NAME = "Acme Workspace";

	private final AnalyticsCloudService _analyticsCloudService = Mockito.mock(
		AnalyticsCloudService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private LiferayDataPlatformRestController
		_liferayDataPlatformRestController;

}