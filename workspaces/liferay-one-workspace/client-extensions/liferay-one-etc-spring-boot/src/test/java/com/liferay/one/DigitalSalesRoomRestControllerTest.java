/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.model.Environment;
import com.liferay.one.permission.CommerceOrderPermission;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.AnalyticsCloudService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
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
			_digitalSalesRoomRestController, "_commerceOrderPermission",
			_commerceOrderPermission);
		ReflectionTestUtils.setField(
			_digitalSalesRoomRestController, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_digitalSalesRoomRestController, "_environmentService",
			_environmentService);
		ReflectionTestUtils.setField(
			_digitalSalesRoomRestController, "_projectPermission",
			_projectPermission);
	}

	@Test
	public void testGetEnvironmentsDataSourceToken() throws Exception {
		_whenFetchEnvironment("DSR", "42");

		Mockito.when(
			_analyticsCloudService.getDataSourceAccessToken(null, "42")
		).thenReturn(
			"token-1"
		);

		ResponseEntity<String> responseEntity =
			_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			"token-1", jsonObject.getString("dataSourceAccessToken"));

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals("no-store", httpHeaders.getCacheControl());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenRejectsCallerWithoutProjectPermission()
		throws Exception {

		_whenFetchEnvironment("DSR", "42");

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.VIEW, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt));

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).getDataSourceAccessToken(
			ArgumentMatchers.any(), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenWithoutDSREnvironment()
		throws Exception {

		_whenFetchEnvironment("AI Hub", "42");

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND,
			_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt
			).getStatusCode());

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).getDataSourceAccessToken(
			ArgumentMatchers.any(), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenWithoutEnvironment()
		throws Exception {

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND,
			_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt
			).getStatusCode());
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenWithoutNumericGroupId()
		throws Exception {

		_whenFetchEnvironment("DSR", "abc");

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND,
			_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt
			).getStatusCode());
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenWithoutProject()
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt)
		).thenReturn(
			new Environment(
				new JSONObject(
				).put(
					"externalEnvironmentId", "42"
				).put(
					"externalReferenceCode",
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE
				).put(
					"id", 7
				).put(
					"offering", "DSR"
				))
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt));

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).getDataSourceAccessToken(
			ArgumentMatchers.any(), ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testGetEnvironmentsDataSourceTokenWithoutToken()
		throws Exception {

		_whenFetchEnvironment("DSR", "42");

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND,
			_digitalSalesRoomRestController.getEnvironmentsDataSourceToken(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt
			).getStatusCode());
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
				_jwt, _ORDER_ID));

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
			_digitalSalesRoomRestController.postProvisioningOrder(
				_jwt, _ORDER_ID);

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

		_digitalSalesRoomRestController.postProvisioningOrder(_jwt, _ORDER_ID);

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
	public void testPostProvisioningOrderRejectsCallerWithoutOrderPermission()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_commerceOrderPermission
		).check(
			_ORDER_ID, _jwt
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_jwt, _ORDER_ID));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			Mockito.anyLong()
		);
	}

	@Test
	public void testPostProvisioningOrderSkipsUnpaidOrder() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder("DSR", _ORDER_PAYMENT_STATUS_PENDING, _DSR_SETTINGS));

		ResponseEntity<Void> responseEntity =
			_digitalSalesRoomRestController.postProvisioningOrder(
				_jwt, _ORDER_ID);

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_analyticsCloudService);
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
				_jwt, _ORDER_ID));
	}

	@Test
	public void testPostProvisioningOrderWithoutOrder() throws Exception {
		_whenFetchCommerceOrder(null);

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _digitalSalesRoomRestController.postProvisioningOrder(
				_jwt, _ORDER_ID));
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
				_jwt, _ORDER_ID));
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

	private void _whenFetchEnvironment(
			String offering, String externalEnvironmentId)
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _jwt)
		).thenReturn(
			new Environment(
				new JSONObject(
				).put(
					"externalEnvironmentId", externalEnvironmentId
				).put(
					"externalReferenceCode",
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE
				).put(
					"id", 7
				).put(
					"offering", offering
				).put(
					"r_projectToEnvironment_c_projectERC",
					_PROJECT_EXTERNAL_REFERENCE_CODE
				))
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

	private static final String _ENVIRONMENT_EXTERNAL_REFERENCE_CODE =
		"DSR-PRJCT-1";

	private static final long _ORDER_ID = 1L;

	private static final int _ORDER_PAYMENT_STATUS_PENDING = 1;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private AnalyticsCloudService _analyticsCloudService;
	private final CommerceOrderPermission _commerceOrderPermission =
		Mockito.mock(CommerceOrderPermission.class);
	private CommerceOrderService _commerceOrderService;
	private DigitalSalesRoomRestController _digitalSalesRoomRestController;
	private final EnvironmentService _environmentService = Mockito.mock(
		EnvironmentService.class);
	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);

}