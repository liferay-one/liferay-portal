/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.salesforce.model.OpportunityLineItem;
import com.liferay.one.util.OrderItemUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;

import java.time.Instant;

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
			List<OpportunityLineItem> realignmentOpportunityLineItems,
			List<String> warningMessages)
		throws Exception {

		List<Order> orders = _commerceOrderService.getAccountOrders(accountId);

		for (OpportunityLineItem realignmentOpportunityLineItem :
				realignmentOpportunityLineItems) {

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
							realignmentOpportunityLineItem.getProduct2Id())) {

						continue;
					}

					matched = true;

					if (!OrderItemUtil.isApproved(parentOrderItem)) {
						continue;
					}

					Instant endDateInstant =
						realignmentOpportunityLineItem.getEndDateInstant();
					Instant startDateInstant =
						realignmentOpportunityLineItem.getServiceDateInstant();

					if (Objects.equals(
							OrderItemUtil.getEndDateInstant(parentOrderItem),
							endDateInstant) &&
						Objects.equals(
							OrderItemUtil.getStartDateInstant(parentOrderItem),
							startDateInstant)) {

						continue;
					}

					Instant effectiveEndDateInstant = endDateInstant;

					if (effectiveEndDateInstant == null) {
						effectiveEndDateInstant = startDateInstant;
					}

					if (effectiveEndDateInstant == null) {
						effectiveEndDateInstant = Instant.now();
					}

					Instant orderItemEffectiveEndDateInstant =
						OrderItemUtil.getEffectiveEndDateInstant(
							parentOrderItem);

					if ((orderItemEffectiveEndDateInstant == null) ||
						orderItemEffectiveEndDateInstant.isAfter(
							effectiveEndDateInstant)) {

						_commerceOrderItemService.patchOrderItemCustomFields(
							parentOrderItem.getId(),
							Map.of(
								"effectiveEndDate",
								effectiveEndDateInstant.toString()));

						if ((endDateInstant != null) &&
							!Objects.equals(
								OrderItemUtil.getEndDateInstant(
									parentOrderItem),
								endDateInstant)) {

							_addWarning(
								warningMessages,
								StringBundler.concat(
									"End date mismatch for order item ",
									parentOrderItem.getExternalReferenceCode(),
									". Amended date: ", endDateInstant,
									", original date: ",
									OrderItemUtil.getEndDateInstant(
										parentOrderItem)));
						}
					}

					_entitlementService.trimEntitlements(
						parentOrderItem.getId(),
						effectiveEndDateInstant.toString());
				}
			}

			if (!matched) {
				_addWarning(
					warningMessages,
					"Unable to find an order item for amended line " +
						realignmentOpportunityLineItem.getProductName());
			}
		}
	}

	public void trimRenewedOrderItems(
			long accountId, String opportunityId,
			List<OpportunityLineItem> opportunityLineItems,
			List<String> warningMessages)
		throws Exception {

		List<Order> orders = _commerceOrderService.getAccountOrders(accountId);

		for (Order order : orders) {
			if (Objects.equals(
					order.getExternalReferenceCode(), opportunityId) ||
				(order.getOrderItems() == null)) {

				continue;
			}

			for (OrderItem orderItem : order.getOrderItems()) {
				for (OpportunityLineItem opportunityLineItem :
						opportunityLineItems) {

					if (!Objects.equals(
							orderItem.getSkuExternalReferenceCode(),
							opportunityLineItem.getProduct2Id())) {

						continue;
					}

					Instant renewalStartDateInstant =
						opportunityLineItem.getServiceDateInstant();

					if (renewalStartDateInstant == null) {
						continue;
					}

					Instant endDateInstant = OrderItemUtil.getEndDateInstant(
						orderItem);

					if (!OrderItemUtil.isApproved(orderItem) ||
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
						OrderItemUtil.getEffectiveEndDateInstant(orderItem);

					if ((effectiveEndDateInstant != null) &&
						renewalStartDateInstant.isBefore(
							effectiveEndDateInstant)) {

						_commerceOrderItemService.patchOrderItemCustomFields(
							orderItem.getId(),
							Map.of(
								"effectiveEndDate",
								renewalStartDateInstant.toString()));
					}
				}
			}
		}
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage);
		}
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

	private static final Log _log = LogFactory.getLog(
		ProvisioningOrderService.class);

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

}