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
import com.liferay.one.salesforce.model.OpportunityLineItem;
import com.liferay.one.util.OrderItemUtil;
import com.liferay.portal.kernel.util.Validator;

import java.math.BigDecimal;

import java.time.Duration;
import java.time.Instant;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class CommerceOrderItemService extends OneBaseService {

	public OrderItem fetchCommerceOrderItem(long commerceOrderItemId)
		throws Exception {

		OrderItemResource orderItemResource = _buildOrderItemResource();

		try {
			return orderItemResource.getOrderItem(commerceOrderItemId);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	public void patchOrderItem(Long orderItemId, OrderItem orderItem)
		throws Exception {

		OrderItemResource orderItemResource = _buildOrderItemResource();

		orderItemResource.patchOrderItem(orderItemId, orderItem);
	}

	public void patchOrderItemCustomFields(
			long commerceOrderItemId, Map<String, Object> customFieldValues)
		throws Exception {

		OrderItemResource orderItemResource = _buildOrderItemResource();

		OrderItem existingOrderItem = orderItemResource.getOrderItem(
			commerceOrderItemId);

		OrderItem orderItem = new OrderItem();

		CustomField[] customFields = _toCustomFields(customFieldValues);

		orderItem.setCustomFields(() -> customFields);

		orderItem.setExternalReferenceCode(
			existingOrderItem::getExternalReferenceCode);

		patchOrderItem(commerceOrderItemId, orderItem);
	}

	public OrderItem upsertOrderItem(
			Order order, OpportunityLineItem opportunityLineItem,
			String stageName)
		throws Exception {

		OrderItem orderItem = new OrderItem();

		orderItem.setExternalReferenceCode(opportunityLineItem::getId);
		orderItem.setSkuExternalReferenceCode(
			opportunityLineItem::getProduct2Id);

		if (Validator.isNotNull(opportunityLineItem.getProductName())) {
			Map<String, String> name = Map.of(
				"en_US", opportunityLineItem.getProductName());

			orderItem.setName(() -> name);
		}

		if (opportunityLineItem.getQuantity() != null) {
			BigDecimal quantity = BigDecimal.valueOf(
				opportunityLineItem.getQuantity());

			orderItem.setQuantity(() -> quantity);
		}

		if (opportunityLineItem.getUnitPrice() != null) {
			BigDecimal unitPrice = BigDecimal.valueOf(
				opportunityLineItem.getUnitPrice());

			orderItem.setUnitPrice(() -> unitPrice);
		}

		if (opportunityLineItem.getTotalPrice() != null) {
			BigDecimal finalPrice = BigDecimal.valueOf(
				opportunityLineItem.getTotalPrice());

			orderItem.setFinalPrice(() -> finalPrice);
		}

		Map<String, Object> customFieldValues = _getCustomFieldValues(
			opportunityLineItem, stageName);

		OrderItem existingOrderItem = _getExistingOrderItem(
			order, opportunityLineItem.getId());

		if (existingOrderItem != null) {
			if (OrderItemUtil.isCanceled(existingOrderItem)) {
				customFieldValues.remove("customStatus");
			}

			if (Objects.equals(
					OrderItemUtil.getEndDateInstant(existingOrderItem),
					opportunityLineItem.getEndDateInstant())) {

				customFieldValues.remove("effectiveEndDate");
			}
		}

		CustomField[] customFields = _toCustomFields(customFieldValues);

		orderItem.setCustomFields(() -> customFields);

		OrderItemResource orderItemResource = _buildOrderItemResource();

		if (existingOrderItem != null) {
			return orderItemResource.patchOrderItem(
				existingOrderItem.getId(), orderItem);
		}

		return orderItemResource.postOrderIdOrderItem(order.getId(), orderItem);
	}

	private OrderItemResource _buildOrderItemResource() {
		return OrderItemResource.builder(
		).endpoint(
			lxcDXPMainDomain, lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameters(
			"nestedFields", "customFields"
		).build();
	}

	private Map<String, Object> _getCustomFieldValues(
		OpportunityLineItem opportunityLineItem, String stageName) {

		Map<String, Object> customFieldValues = new HashMap<>();

		if (Validator.isNotNull(opportunityLineItem.getCloudRegion())) {
			customFieldValues.put(
				"cloudRegion", opportunityLineItem.getCloudRegion());
		}

		customFieldValues.put("customStatus", _getCustomStatus(stageName));

		Instant endDateInstant = opportunityLineItem.getEndDateInstant();

		if (endDateInstant != null) {
			Instant effectiveEndDateInstant = endDateInstant.plus(
				Duration.ofDays(30));

			customFieldValues.put(
				"effectiveEndDate", effectiveEndDateInstant.toString());

			customFieldValues.put("endDate", endDateInstant.toString());
		}

		if (Validator.isNotNull(opportunityLineItem.getMachineType())) {
			customFieldValues.put(
				"machineType", opportunityLineItem.getMachineType());
		}

		if (Validator.isNotNull(opportunityLineItem.getProductType())) {
			customFieldValues.put(
				"orderType", opportunityLineItem.getProductType());
		}

		if (opportunityLineItem.getNumberOfPods() != null) {
			customFieldValues.put(
				"sizing", opportunityLineItem.getNumberOfPods());
		}

		Instant serviceDateInstant =
			opportunityLineItem.getServiceDateInstant();

		if (serviceDateInstant != null) {
			customFieldValues.put("startDate", serviceDateInstant.toString());
		}

		return customFieldValues;
	}

	private String _getCustomStatus(String stageName) {
		String customStatus = _stageNameCustomStatuses.get(stageName);

		if (customStatus != null) {
			return customStatus;
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				"Unable to map stage name " + stageName +
					" to a custom status");
		}

		return "On Hold";
	}

	private OrderItem _getExistingOrderItem(
		Order order, String externalReferenceCode) {

		OrderItem[] orderItems = order.getOrderItems();

		if (orderItems == null) {
			return null;
		}

		for (OrderItem orderItem : orderItems) {
			if (Objects.equals(
					orderItem.getExternalReferenceCode(),
					externalReferenceCode)) {

				return orderItem;
			}
		}

		return null;
	}

	private CustomField[] _toCustomFields(Map<String, ?> customFieldValues) {
		CustomField[] customFields = new CustomField[customFieldValues.size()];

		int i = 0;

		for (Map.Entry<String, ?> entry : customFieldValues.entrySet()) {
			CustomField customField = new CustomField();

			customField.setName(entry::getKey);

			CustomValue customValue = new CustomValue();

			customValue.setData(entry::getValue);

			customField.setCustomValue(() -> customValue);

			customFields[i++] = customField;
		}

		return customFields;
	}

	private static final Log _log = LogFactory.getLog(
		CommerceOrderItemService.class);

	private static final Map<String, String> _stageNameCustomStatuses = Map.of(
		"Closed", "Canceled", "Closed Lost", "Canceled", "Closed Won",
		"Approved", "Disqualified", "Canceled", "Rejected", "Canceled");

}