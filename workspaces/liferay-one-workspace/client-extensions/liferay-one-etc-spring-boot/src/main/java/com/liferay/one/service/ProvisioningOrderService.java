/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.one.util.CommerceOrderItemUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.math.BigDecimal;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class ProvisioningOrderService {

	public void trimRealignedOrderItems(
			long accountId, String opportunityId, String parentOpportunityId,
			List<SalesforceOpportunityLineItem>
				realignmentSalesforceOpportunityLineItems,
			List<String> warningMessages)
		throws Exception {

		List<Order> orders = _commerceOrderService.getAccountOrders(accountId);

		Map<Long, Map<String, Object>> customFieldValuesMap = new HashMap<>();

		for (SalesforceOpportunityLineItem
				realignmentSalesforceOpportunityLineItem :
					realignmentSalesforceOpportunityLineItems) {

			boolean matched = false;

			for (Order order : orders) {
				if (Objects.equals(
						order.getExternalReferenceCode(), opportunityId) ||
					(order.getOrderItems() == null) ||
					!_isFamilyOrder(order, parentOpportunityId)) {

					continue;
				}

				for (OrderItem parentOrderItem : order.getOrderItems()) {
					if (!Objects.equals(
							parentOrderItem.getSkuExternalReferenceCode(),
							realignmentSalesforceOpportunityLineItem.
								getProduct2Id())) {

						continue;
					}

					matched = true;

					if (!CommerceOrderItemUtil.isApproved(parentOrderItem)) {
						continue;
					}

					Instant endDateInstant =
						realignmentSalesforceOpportunityLineItem.
							getEndDateInstant();
					Instant startDateInstant =
						realignmentSalesforceOpportunityLineItem.
							getServiceDateInstant();

					if (Objects.equals(
							CommerceOrderItemUtil.getEndDateInstant(
								parentOrderItem),
							endDateInstant) &&
						Objects.equals(
							CommerceOrderItemUtil.getStartDateInstant(
								parentOrderItem),
							startDateInstant)) {

						continue;
					}

					Instant effectiveEndDateInstant = endDateInstant;

					if (effectiveEndDateInstant == null) {
						effectiveEndDateInstant = startDateInstant;
					}

					if (effectiveEndDateInstant == null) {
						effectiveEndDateInstant = Instant.now(
						).truncatedTo(
							ChronoUnit.SECONDS
						);
					}

					Instant orderItemEffectiveEndDateInstant =
						CommerceOrderItemUtil.getEffectiveEndDateInstant(
							parentOrderItem);

					if ((orderItemEffectiveEndDateInstant != null) &&
						!orderItemEffectiveEndDateInstant.isAfter(
							effectiveEndDateInstant)) {

						continue;
					}

					customFieldValuesMap.put(
						parentOrderItem.getId(),
						Map.of(
							"effectiveEndDate",
							effectiveEndDateInstant.toString()));

					if ((endDateInstant == null) ||
						Objects.equals(
							CommerceOrderItemUtil.getEndDateInstant(
								parentOrderItem),
							endDateInstant)) {

						continue;
					}

					_addWarning(
						warningMessages,
						StringBundler.concat(
							"End date mismatch for order item ",
							parentOrderItem.getExternalReferenceCode(),
							". Amended date: ", endDateInstant,
							", original date: ",
							CommerceOrderItemUtil.getEndDateInstant(
								parentOrderItem)));
				}
			}

			if (matched) {
				continue;
			}

			String productName =
				realignmentSalesforceOpportunityLineItem.getProductName();

			_addWarning(
				warningMessages,
				"Unable to find an order item for amended line " + productName);
		}

		for (Order order : orders) {
			if (order.getOrderItems() == null) {
				continue;
			}

			_commerceOrderItemService.patchOrderItemCustomFields(
				customFieldValuesMap, order);
		}
	}

	public void trimRemovedOrderItems(
			String opportunityId,
			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems,
			List<String> warningMessages)
		throws Exception {

		Order order = _commerceOrderService.fetchOrderByExternalReferenceCode(
			opportunityId);

		if ((order == null) || ArrayUtil.isEmpty(order.getOrderItems())) {
			return;
		}

		Instant effectiveEndDateInstant = Instant.now(
		).truncatedTo(
			ChronoUnit.SECONDS
		);

		if (salesforceOpportunityLineItems.isEmpty()) {
			for (OrderItem orderItem : order.getOrderItems()) {
				if (!CommerceOrderItemUtil.isCanceled(orderItem) &&
					_isActive(effectiveEndDateInstant, orderItem)) {

					_addWarning(
						warningMessages,
						StringBundler.concat(
							"Opportunity ", order.getExternalReferenceCode(),
							" has no line items, but its order has active ",
							"order items. The system did not end them."));

					return;
				}
			}

			return;
		}

		Map<String, SalesforceOpportunityLineItem>
			salesforceOpportunityLineItemsMap = new HashMap<>();

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			salesforceOpportunityLineItemsMap.put(
				salesforceOpportunityLineItem.getId(),
				salesforceOpportunityLineItem);
		}

		List<OrderItem> removedOrderItems = new ArrayList<>();
		Map<Long, Map<String, Object>> customFieldValuesMap = new HashMap<>();
		Map<Long, Double> newOrderItemQuantities = new HashMap<>();

		for (OrderItem orderItem : order.getOrderItems()) {
			if (!_isActive(effectiveEndDateInstant, orderItem)) {
				continue;
			}

			SalesforceOpportunityLineItem salesforceOpportunityLineItem =
				salesforceOpportunityLineItemsMap.get(
					orderItem.getExternalReferenceCode());

			if (salesforceOpportunityLineItem != null) {
				Double newQuantity =
					salesforceOpportunityLineItem.getQuantity();
				BigDecimal orderItemQuantity = orderItem.getQuantity();

				if ((newQuantity != null) && (orderItemQuantity != null) &&
					(newQuantity < orderItemQuantity.doubleValue())) {

					newOrderItemQuantities.put(orderItem.getId(), newQuantity);
				}

				continue;
			}

			removedOrderItems.add(orderItem);

			customFieldValuesMap.put(
				orderItem.getId(),
				Map.of("effectiveEndDate", effectiveEndDateInstant.toString()));

			newOrderItemQuantities.put(orderItem.getId(), 0.0);
		}

		if (newOrderItemQuantities.isEmpty()) {
			return;
		}

		try {
			_addLicenseKeyWarnings(
				order, newOrderItemQuantities, warningMessages);
		}
		catch (Exception exception) {
			_addWarning(
				warningMessages,
				"Unable to count the license keys of opportunity " +
					order.getExternalReferenceCode(),
				exception);
		}

		if (customFieldValuesMap.isEmpty()) {
			return;
		}

		_commerceOrderItemService.patchOrderItemCustomFields(
			customFieldValuesMap, order);

		if (_log.isInfoEnabled()) {
			for (OrderItem removedOrderItem : removedOrderItems) {
				_log.info(
					StringBundler.concat(
						"Ended order item ",
						removedOrderItem.getExternalReferenceCode(),
						" for SKU ",
						removedOrderItem.getSkuExternalReferenceCode(),
						" of opportunity ", order.getExternalReferenceCode(),
						" because the message no longer has its line item"));
			}
		}
	}

	public void trimRenewedOrderItems(
			long accountId, String orderExternalReferenceCode,
			String projectExternalReferenceCode,
			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems,
			List<String> warningMessages)
		throws Exception {

		List<Order> orders = _commerceOrderService.getAccountOrders(accountId);

		for (Order order : orders) {
			if (Objects.equals(
					order.getExternalReferenceCode(),
					orderExternalReferenceCode) ||
				(order.getOrderItems() == null) ||
				!_isProjectOrder(order, projectExternalReferenceCode)) {

				continue;
			}

			Map<Long, Map<String, Object>> customFieldValuesMap =
				new HashMap<>();

			for (OrderItem orderItem : order.getOrderItems()) {
				for (SalesforceOpportunityLineItem
						salesforceOpportunityLineItem :
							salesforceOpportunityLineItems) {

					if (!Objects.equals(
							orderItem.getSkuExternalReferenceCode(),
							salesforceOpportunityLineItem.getProduct2Id())) {

						continue;
					}

					Instant renewalStartDateInstant =
						salesforceOpportunityLineItem.getServiceDateInstant();

					if (renewalStartDateInstant == null) {
						continue;
					}

					Instant endDateInstant =
						CommerceOrderItemUtil.getEndDateInstant(orderItem);

					if (!CommerceOrderItemUtil.isApproved(orderItem) ||
						(endDateInstant == null)) {

						continue;
					}

					if (renewalStartDateInstant.isBefore(endDateInstant)) {
						_addWarning(
							warningMessages,
							StringBundler.concat(
								"The renewal start date ",
								renewalStartDateInstant,
								" is before the end date of order item ",
								orderItem.getExternalReferenceCode()));

						continue;
					}

					Instant effectiveEndDateInstant =
						CommerceOrderItemUtil.getEffectiveEndDateInstant(
							orderItem);

					if ((effectiveEndDateInstant == null) ||
						!renewalStartDateInstant.isBefore(
							effectiveEndDateInstant)) {

						continue;
					}

					customFieldValuesMap.put(
						orderItem.getId(),
						Map.of(
							"effectiveEndDate",
							renewalStartDateInstant.toString()));
				}
			}

			_commerceOrderItemService.patchOrderItemCustomFields(
				customFieldValuesMap, order);
		}
	}

	private void _addLicenseKeyWarnings(
			Order order, Map<Long, Double> newOrderItemQuantities,
			List<String> warningMessages)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getOrderItemEntitlements(
				new ArrayList<>(newOrderItemQuantities.keySet()));

		if (entitlements.isEmpty()) {
			return;
		}

		String projectExternalReferenceCode = null;

		Map<String, Object> customFields =
			(Map<String, Object>)order.getCustomFields();

		if (customFields != null) {
			projectExternalReferenceCode = GetterUtil.getString(
				customFields.get("salesforceProjectId"));
		}

		Map<Long, Integer> licenseKeyCounts = null;

		if (Validator.isNull(projectExternalReferenceCode)) {
			licenseKeyCounts =
				_licenseKeyService.getActiveUnassignedLicenseKeyCounts(
					order.getAccountId(), Collections.emptyList());
		}
		else {
			licenseKeyCounts = _licenseKeyService.getActiveLicenseKeyCounts(
				_entitlementService.getActiveEntitlements(
					projectExternalReferenceCode),
				Collections.emptyList(), projectExternalReferenceCode);
		}

		for (Entitlement entitlement : entitlements) {
			int licenseKeyCount = licenseKeyCounts.getOrDefault(
				entitlement.getEntitlementId(), 0);

			if (licenseKeyCount == 0) {
				continue;
			}

			double newQuantity = newOrderItemQuantities.get(
				entitlement.getCommerceOrderItemId());
			int maxQuantity = 0;

			if (newQuantity > 0) {
				EntitlementDefinition entitlementDefinition =
					entitlement.getEntitlementDefinition();

				if ((entitlementDefinition == null) ||
					(entitlementDefinition.getMaxQuantity() == null)) {

					continue;
				}

				maxQuantity =
					(int)(newQuantity * entitlementDefinition.getMaxQuantity());
			}

			if (licenseKeyCount <= maxQuantity) {
				continue;
			}

			_addWarning(
				warningMessages,
				StringBundler.concat(
					"Entitlement ", entitlement.getName(), " for SKU ",
					entitlement.getSkuExternalReferenceCode(),
					" of opportunity ", order.getExternalReferenceCode(),
					" uses ", licenseKeyCount,
					" activations, but its new quantity allows ", maxQuantity,
					". Support must contact the customer."));
		}
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage);
		}
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage,
		Exception exception) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage, exception);
		}
	}

	private boolean _isActive(Instant nowInstant, OrderItem orderItem) {
		Instant entitlementEffectiveEndDateInstant =
			CommerceOrderItemUtil.getEntitlementEffectiveEndDateInstant(
				orderItem);

		if ((entitlementEffectiveEndDateInstant == null) ||
			entitlementEffectiveEndDateInstant.isAfter(nowInstant)) {

			return true;
		}

		return false;
	}

	private boolean _isFamilyOrder(Order order, String parentOpportunityId) {
		if (Objects.equals(
				order.getExternalReferenceCode(), parentOpportunityId)) {

			return true;
		}

		Map<String, Object> customFields =
			(Map<String, Object>)order.getCustomFields();

		if (customFields == null) {
			return false;
		}

		return Objects.equals(
			GetterUtil.getString(customFields.get("parentOpportunityId")),
			parentOpportunityId);
	}

	private boolean _isProjectOrder(
		Order order, String projectExternalReferenceCode) {

		Map<String, Object> customFields =
			(Map<String, Object>)order.getCustomFields();

		if (customFields == null) {
			return false;
		}

		return Objects.equals(
			GetterUtil.getString(customFields.get("salesforceProjectId")),
			projectExternalReferenceCode);
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningOrderService.class);

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private LicenseKeyService _licenseKeyService;

}