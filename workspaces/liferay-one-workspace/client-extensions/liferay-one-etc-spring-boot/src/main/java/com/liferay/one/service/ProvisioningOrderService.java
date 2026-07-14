/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.one.salesforce.model.OpportunityLineItem;
import com.liferay.one.util.OrderItemUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.LocalDate;
import java.time.ZoneOffset;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

					OrderItem orderItem =
						_commerceOrderItemService.fetchCommerceOrderItem(
							parentOrderItem.getId());

					if ((orderItem == null) ||
						!Objects.equals(
							OrderItemUtil.getStatus(orderItem),
							CommerceOrderItemConstants.STATUS_APPROVED)) {

						continue;
					}

					String endDate = _toDateTime(
						realignmentOpportunityLineItem.getEndDate());
					String startDate = _toDateTime(
						realignmentOpportunityLineItem.getServiceDate());

					if (Objects.equals(
							OrderItemUtil.getEndDate(orderItem), endDate) &&
						Objects.equals(
							OrderItemUtil.getStartDate(orderItem), startDate)) {

						continue;
					}

					String effectiveEndDate = endDate;

					if (Validator.isNull(effectiveEndDate)) {
						effectiveEndDate = startDate;
					}

					if (Validator.isNull(effectiveEndDate)) {
						effectiveEndDate = _toDateTime(
							LocalDate.now(
								ZoneOffset.UTC
							).toString());
					}

					String orderItemEffectiveEndDate =
						OrderItemUtil.getEffectiveEndDate(orderItem);

					if (Validator.isNull(orderItemEffectiveEndDate) ||
						(orderItemEffectiveEndDate.compareTo(effectiveEndDate) >
							0)) {

						_commerceOrderItemService.patchOrderItemCustomFields(
							GetterUtil.getLong(orderItem.getId()),
							Map.of("effectiveEndDate", effectiveEndDate));

						if (Validator.isNotNull(endDate) &&
							!Objects.equals(
								OrderItemUtil.getEndDate(orderItem), endDate)) {

							_addWarning(
								warningMessages,
								StringBundler.concat(
									"End date mismatch for order item ",
									parentOrderItem.getExternalReferenceCode(),
									". Amended date: ", endDate,
									", original date: ",
									OrderItemUtil.getEndDate(orderItem)));
						}
					}

					_entitlementService.trimEntitlements(
						GetterUtil.getLong(orderItem.getId()),
						effectiveEndDate);
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

					String renewalStartDate = _toDateTime(
						opportunityLineItem.getServiceDate());

					if (Validator.isNull(renewalStartDate)) {
						continue;
					}

					OrderItem curOrderItem =
						_commerceOrderItemService.fetchCommerceOrderItem(
							orderItem.getId());

					if (curOrderItem == null) {
						continue;
					}

					String endDate = OrderItemUtil.getEndDate(curOrderItem);

					if (!Objects.equals(
							OrderItemUtil.getStatus(curOrderItem),
							CommerceOrderItemConstants.STATUS_APPROVED) ||
						Validator.isNull(endDate)) {

						continue;
					}

					if (renewalStartDate.compareTo(endDate) < 0) {
						_addWarning(
							warningMessages,
							StringBundler.concat(
								"The renewal start date ", renewalStartDate,
								" is before the end date of order item ",
								orderItem.getExternalReferenceCode()));

						continue;
					}

					String effectiveEndDate = OrderItemUtil.getEffectiveEndDate(
						curOrderItem);

					if (Validator.isNotNull(effectiveEndDate) &&
						(renewalStartDate.compareTo(effectiveEndDate) < 0)) {

						_commerceOrderItemService.patchOrderItemCustomFields(
							GetterUtil.getLong(curOrderItem.getId()),
							Map.of("effectiveEndDate", renewalStartDate));
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
			Objects.toString(customFields.get("parentOpportunityId"), null),
			parentOpportunityId);
	}

	private String _toDateTime(String value) {
		if (Validator.isNull(value)) {
			return null;
		}

		Matcher matcher = _datePattern.matcher(value);

		if (matcher.matches()) {
			return value + "T00:00:00Z";
		}

		return value;
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningOrderService.class);

	private static final Pattern _datePattern = Pattern.compile(
		"\\d{4}-\\d{2}-\\d{2}");

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

}