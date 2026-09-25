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
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.ArrayUtil;

import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Keven Leone
 * @author Ricardo Mariz
 */
@CrossOrigin("*")
@RequestMapping("/dxp")
@RestController
public class DXPRestController extends OneBaseRestController {

	@GetMapping("project-usage")
	public ResponseEntity<String> getProjectUsage(
			@AuthenticationPrincipal Jwt jwt, @RequestParam String projectId)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		JSONObject projectUsageJSONObject = _consoleService.getProjectUsage(
			userAccount.getEmailAddress(), projectId);

		if (projectUsageJSONObject == null) {
			throw new ResponseStatusException(
				HttpStatus.NOT_FOUND,
				"No cloud project exists with ID " + projectId);
		}

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			projectUsageJSONObject.toString()
		);
	}

	@PostMapping("provisioning/{orderId}")
	public ResponseEntity<Void> postProvisioning(
			@AuthenticationPrincipal Jwt jwt, @PathVariable long orderId,
			@RequestBody String json)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info("Provisioning order " + orderId + " from a DXP");
		}

		UserAccount userAccount = getMyUserAccount(jwt);

		_commerceOrderPermission.check(orderId, userAccount);

		JSONObject jsonObject = new JSONObject(json);

		String projectId = jsonObject.getString("projectId");

		JSONObject projectUsageJSONObject = _consoleService.getProjectUsage(
			userAccount.getEmailAddress(), projectId);

		if (projectUsageJSONObject == null) {
			throw new PrincipalException();
		}

		Order order = _getCloudAppOrder(orderId);

		_commerceOrderService.completeSettledOrder(order);

		order = _getCloudAppOrder(orderId);

		Integer paymentStatus = order.getPaymentStatus();

		if (!Objects.equals(
				paymentStatus,
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_COMPLETED) &&
			!Objects.equals(
				paymentStatus,
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED)) {

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Skipping provisioning for order ", orderId,
						" with payment status ", paymentStatus));
			}

			return ResponseEntity.status(
				HttpStatus.CONFLICT
			).build();
		}

		_cloudAppService.deployCloudApp(
			orderId, jsonObject.getLong("orderItemId"), projectId);

		return ResponseEntity.ok(
		).build();
	}

	private Order _getCloudAppOrder(long orderId) throws Exception {
		Order order = _commerceOrderService.fetchCommerceOrder(orderId);

		if (order == null) {
			throw new IllegalArgumentException(
				"No order exists with ID " + orderId);
		}

		if (!ArrayUtil.contains(
				CommerceOrderConstants.
					CLOUD_APP_ORDER_TYPE_EXTERNAL_REFERENCE_CODES,
				order.getOrderTypeExternalReferenceCode())) {

			throw new IllegalArgumentException(
				"Unsupported order type " +
					order.getOrderTypeExternalReferenceCode());
		}

		return order;
	}

	private static final Log _log = LogFactory.getLog(DXPRestController.class);

	@Autowired
	private CloudAppService _cloudAppService;

	@Autowired
	private CommerceOrderPermission _commerceOrderPermission;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private ConsoleService _consoleService;

}