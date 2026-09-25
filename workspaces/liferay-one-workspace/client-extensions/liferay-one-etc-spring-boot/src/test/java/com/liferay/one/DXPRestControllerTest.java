/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.permission.CommerceOrderPermission;
import com.liferay.one.service.CloudAppService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.ConsoleService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Ricardo Mariz
 */
public class DXPRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_dxpRestController = new DXPRestController();

		_cloudAppService = Mockito.mock(CloudAppService.class);
		_commerceOrderPermission = Mockito.mock(CommerceOrderPermission.class);
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_consoleService = Mockito.mock(ConsoleService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(_EMAIL_ADDRESS);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			userAccount
		);

		Mockito.when(
			_consoleService.getProjectUsage(_EMAIL_ADDRESS, _PROJECT_ID)
		).thenReturn(
			_createProjectUsageJSONObject()
		);

		ReflectionTestUtils.setField(
			_dxpRestController, "_cloudAppService", _cloudAppService);
		ReflectionTestUtils.setField(
			_dxpRestController, "_commerceOrderPermission",
			_commerceOrderPermission);
		ReflectionTestUtils.setField(
			_dxpRestController, "_commerceOrderService", _commerceOrderService);
		ReflectionTestUtils.setField(
			_dxpRestController, "_consoleService", _consoleService);
		ReflectionTestUtils.setField(
			_dxpRestController, "_userAccountService", _userAccountService);
	}

	@Test
	public void testGetProjectUsage() throws Exception {
		ResponseEntity<String> responseEntity =
			_dxpRestController.getProjectUsage(null, _PROJECT_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals(
			_createProjectUsageJSONObject().toString(),
			responseEntity.getBody());
	}

	@Test
	public void testGetProjectUsageRejectsForeignProject() throws Exception {
		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _dxpRestController.getProjectUsage(
					null, "someone-else-prd"));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());
	}

	@Test
	public void testPostProvisioningCompletesSettledOrderBeforeDeploying()
		throws Exception {

		Order order = _createOrder(
			"CLOUDAPP",
			CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);

		_whenFetchCommerceOrder(order);

		ResponseEntity<Void> responseEntity =
			_dxpRestController.postProvisioning(
				null, _ORDER_ID, _createProvisioningJSON(_PROJECT_ID));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_commerceOrderService
		).completeSettledOrder(
			order
		);

		Mockito.verify(
			_cloudAppService
		).deployCloudApp(
			_ORDER_ID, _ORDER_ITEM_ID, _PROJECT_ID
		);
	}

	@Test
	public void testPostProvisioningDeploysCloudAppOrderType()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder(
				"CLOUD_APP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED));

		ResponseEntity<Void> responseEntity =
			_dxpRestController.postProvisioning(
				null, _ORDER_ID, _createProvisioningJSON(_PROJECT_ID));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_cloudAppService
		).deployCloudApp(
			_ORDER_ID, _ORDER_ITEM_ID, _PROJECT_ID
		);
	}

	@Test
	public void testPostProvisioningRejectsForeignProject() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				"CLOUDAPP",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _dxpRestController.postProvisioning(
				null, _ORDER_ID, _createProvisioningJSON("someone-else-prd")));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).completeSettledOrder(
			ArgumentMatchers.any(Order.class)
		);

		_verifyNeverDeployed();
	}

	@Test
	public void testPostProvisioningRejectsOtherOrderType() throws Exception {
		_whenFetchCommerceOrder(
			_createOrder(
				"LOW_CODE_CONFIGURATION",
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED));

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _dxpRestController.postProvisioning(
				null, _ORDER_ID, _createProvisioningJSON(_PROJECT_ID)));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).completeSettledOrder(
			ArgumentMatchers.any(Order.class)
		);

		_verifyNeverDeployed();
	}

	@Test
	public void testPostProvisioningReturnsConflictForPendingPayment()
		throws Exception {

		_whenFetchCommerceOrder(
			_createOrder("CLOUDAPP", _PAYMENT_STATUS_PENDING));

		ResponseEntity<Void> responseEntity =
			_dxpRestController.postProvisioning(
				null, _ORDER_ID, _createProvisioningJSON(_PROJECT_ID));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());

		_verifyNeverDeployed();
	}

	private Order _createOrder(
		String orderTypeExternalReferenceCode, int paymentStatus) {

		Order order = new Order();

		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);
		order.setPaymentStatus(paymentStatus);

		return order;
	}

	private JSONObject _createProjectUsageJSONObject() {
		return new JSONObject(
		).put(
			"rootProjectId", "omnitest"
		);
	}

	private String _createProvisioningJSON(String projectId) {
		return new JSONObject(
		).put(
			"orderItemId", _ORDER_ITEM_ID
		).put(
			"projectId", projectId
		).toString();
	}

	private void _verifyNeverDeployed() throws Exception {
		Mockito.verify(
			_cloudAppService, Mockito.never()
		).deployCloudApp(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyString()
		);
	}

	private void _whenFetchCommerceOrder(Order order) throws Exception {
		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final String _EMAIL_ADDRESS = "buyer@example.com";

	private static final long _ORDER_ID = 1000L;

	private static final long _ORDER_ITEM_ID = 2000L;

	private static final int _PAYMENT_STATUS_PENDING = 1;

	private static final String _PROJECT_ID = "omnitest-prd";

	private CloudAppService _cloudAppService;
	private CommerceOrderPermission _commerceOrderPermission;
	private CommerceOrderService _commerceOrderService;
	private ConsoleService _consoleService;
	private DXPRestController _dxpRestController;
	private UserAccountService _userAccountService;

}