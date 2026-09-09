/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.service.AnalyticsCloudService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Map;

import org.json.JSONArray;
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
 * @author Ryan Schuhler
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
		ReflectionTestUtils.setField(
			_liferayDataPlatformRestController, "_environmentService",
			_environmentService);
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

		Mockito.verifyNoInteractions(_environmentService);
	}

	@Test
	public void testPostProvisioningOrderCompletesWhenTheEnvironmentFails()
		throws Exception {

		_setUpOrder(_createOrder(null));

		Mockito.when(
			_environmentService.upsertLiferayDataPlatformEnvironment(
				Mockito.anyLong(), Mockito.any(JSONObject.class))
		).thenThrow(
			new IllegalStateException("Unable to reach the environment")
		);

		ResponseEntity<Void> responseEntity =
			_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			Mockito.anyMap(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_COMPLETED),
			Mockito.eq(CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED)
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
			_createAnalyticsCloudProjectJSONObject(1234)
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
		Mockito.verifyNoInteractions(_environmentService);
	}

	@Test
	public void testPostProvisioningOrderStoresTheWorkspace() throws Exception {
		_setUpOrder(_createOrder(null));

		_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		JSONObject jsonObject = _captureEnvironmentFieldsJSONObject();

		Assertions.assertEquals(
			"enterprise.example.com, partner.example.com",
			jsonObject.getString("allowedEmailDomains"));
		Assertions.assertEquals(
			_DATA_SOURCE_ACCESS_TOKEN,
			jsonObject.getString("dataSourceAccessToken"));
		Assertions.assertEquals(
			"/enterprise-ldp", jsonObject.getString("friendlyURL"));
		Assertions.assertEquals(
			"owner@enterprise.example.com",
			jsonObject.getString("ownerEmailAddress"));
		Assertions.assertEquals("us-east1", jsonObject.getString("region"));
		Assertions.assertEquals("UTC-05:00", jsonObject.getString("timeZone"));
		Assertions.assertEquals(
			_WORKSPACE_NAME, jsonObject.getString("workspaceName"));
	}

	@Test
	public void testPostProvisioningOrderStoresTheWorkspaceOnReuse()
		throws Exception {

		_setUpOrder(_createOrder(null));

		Mockito.when(
			_analyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"internal", _ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createAnalyticsCloudProjectJSONObject(1234)
		);

		_liferayDataPlatformRestController.postProvisioningOrder(_ORDER_ID);

		JSONObject jsonObject = _captureEnvironmentFieldsJSONObject();

		Assertions.assertEquals(
			_DATA_SOURCE_ACCESS_TOKEN,
			jsonObject.getString("dataSourceAccessToken"));
		Assertions.assertEquals(
			_WORKSPACE_NAME, jsonObject.getString("workspaceName"));
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

	private JSONObject _captureEnvironmentFieldsJSONObject() throws Exception {
		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_environmentService
		).upsertLiferayDataPlatformEnvironment(
			Mockito.eq(_ACCOUNT_ID), argumentCaptor.capture()
		);

		return argumentCaptor.getValue();
	}

	private JSONObject _createAnalyticsCloudProjectJSONObject(int groupId) {
		return new JSONObject(
		).put(
			"allowedEmailDomains",
			new JSONArray(
			).put(
				"enterprise.example.com"
			).put(
				"partner.example.com"
			)
		).put(
			"corpProjectName", _WORKSPACE_NAME
		).put(
			"dataSourceAccessToken", _DATA_SOURCE_ACCESS_TOKEN
		).put(
			"friendlyURL", "/enterprise-ldp"
		).put(
			"groupId", groupId
		).put(
			"ownerEmailAddress", "owner@enterprise.example.com"
		).put(
			"serverLocation", "us-east1"
		).put(
			"timeZone",
			new JSONObject(
			).put(
				"displayTimeZone", "UTC-05:00"
			)
		);
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
		order.setAccountId(() -> _ACCOUNT_ID);
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
			_createAnalyticsCloudProjectJSONObject(5678)
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACME";

	private static final long _ACCOUNT_ID = 40028L;

	private static final String _DATA_SOURCE_ACCESS_TOKEN =
		"eyJkYXRhIjoibGRwLWVudGVycHJpc2UtdG9rZW4tZm9yLWRlbW8ifQ==";

	private static final long _ORDER_ID = 1000L;

	private static final String _WORKSPACE_NAME = "Acme Workspace";

	private final AnalyticsCloudService _analyticsCloudService = Mockito.mock(
		AnalyticsCloudService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EnvironmentService _environmentService = Mockito.mock(
		EnvironmentService.class);
	private LiferayDataPlatformRestController
		_liferayDataPlatformRestController;

}