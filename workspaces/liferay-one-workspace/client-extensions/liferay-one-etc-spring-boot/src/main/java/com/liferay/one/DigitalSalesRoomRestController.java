/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.service.AnalyticsCloudService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@RequestMapping("/digital-sales-room")
@RestController
public class DigitalSalesRoomRestController extends BaseRestController {

	@PostMapping("provisioning/{orderId}")
	public ResponseEntity<Void> postProvisioningOrder(
			@PathVariable long orderId)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info("Provisioning order " + orderId);
		}

		Order order = _commerceOrderService.fetchCommerceOrder(orderId);

		if (order == null) {
			throw new IllegalArgumentException(
				"No order exists with ID " + orderId);
		}

		if (!Objects.equals(order.getOrderTypeExternalReferenceCode(), "DSR")) {
			throw new IllegalArgumentException(
				"Unsupported order type: " +
					order.getOrderTypeExternalReferenceCode());
		}

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

		JSONObject dsrSettingsJSONObject = _getDSRSettingsJSONObject(order);

		String workspaceName = dsrSettingsJSONObject.optString("workspaceName");

		if (Validator.isNull(workspaceName)) {
			throw new IllegalStateException(
				StringBundler.concat(
					"Order ", orderId,
					" has no workspace name in the \"dsrSettings\" custom ",
					"field"));
		}

		if (order.getOrderStatus() ==
				CommerceOrderConstants.ORDER_STATUS_OPEN) {

			_commerceOrderService.updateOrder(
				null, orderId, CommerceOrderConstants.ORDER_STATUS_PENDING);
		}

		_commerceOrderService.updateOrder(
			null, orderId, CommerceOrderConstants.ORDER_STATUS_PROCESSING);

		try {
			JSONObject analyticsCloudProjectJSONObject =
				_analyticsCloudService.provisionAnalyticsCloudProject(
					dsrSettingsJSONObject.optString(
						"analyticsCloudEnvironment"),
					_getAnalyticsCloudProjectJSONObject(
						dsrSettingsJSONObject, order),
					order.getAccountExternalReferenceCode());

			_commerceOrderService.updateOrder(
				HashMapBuilder.put(
					"dsrAnalyticsCloudProject",
					analyticsCloudProjectJSONObject.toString()
				).put(
					"dsrWorkspaceName", workspaceName
				).build(),
				orderId, CommerceOrderConstants.ORDER_STATUS_COMPLETED,
				paymentStatus);

			return ResponseEntity.ok(
			).build();
		}
		catch (WebClientResponseException webClientResponseException) {
			_cancelOrder(
				webClientResponseException.getResponseBodyAsString(), orderId);

			throw webClientResponseException;
		}
		catch (Exception exception) {
			_cancelOrder(exception.getMessage(), orderId);

			throw exception;
		}
	}

	private void _cancelOrder(String errorMessage, long orderId)
		throws Exception {

		_log.error(
			StringBundler.concat(
				"Unable to provision Digital Sales Room workspace for order ",
				orderId, ": \n", errorMessage));

		_commerceOrderService.updateOrder(
			HashMapBuilder.put(
				"dsrError", errorMessage
			).put(
				"dsrErrorDate",
				ZonedDateTime.now(
				).format(
					DateTimeFormatter.ISO_INSTANT
				)
			).build(),
			orderId, CommerceOrderConstants.ORDER_STATUS_CANCELLED);
	}

	private JSONObject _getAnalyticsCloudProjectJSONObject(
		JSONObject dsrSettingsJSONObject, Order order) {

		String ownerEmailAddress = dsrSettingsJSONObject.optString(
			"workspaceOwnerEmail");

		if (Validator.isNull(ownerEmailAddress)) {
			ownerEmailAddress = order.getCreatorEmailAddress();
		}

		return new JSONObject(
		).put(
			"corpProjectName", dsrSettingsJSONObject.getString("workspaceName")
		).put(
			"incidentReportEmailAddresses",
			dsrSettingsJSONObject.optJSONArray(
				"incidentReportEmailAddresses",
				new JSONArray(
				).put(
					ownerEmailAddress
				))
		).put(
			"name", dsrSettingsJSONObject.getString("workspaceName")
		).put(
			"ownerEmailAddress", ownerEmailAddress
		).put(
			"serverLocation",
			dsrSettingsJSONObject.optString("dataCenterLocation", "INTERNAL")
		);
	}

	private JSONObject _getDSRSettingsJSONObject(Order order) {
		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		if (customFields == null) {
			return new JSONObject();
		}

		return new JSONObject(customFields.getOrDefault("dsrSettings", "{}"));
	}

	private static final Log _log = LogFactory.getLog(
		DigitalSalesRoomRestController.class);

	@Autowired
	private AnalyticsCloudService _analyticsCloudService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

}