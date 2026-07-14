/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderItemConstants;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.service.CommerceOrderItemService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.util.OrderItemUtil;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.LocalDate;
import java.time.ZoneOffset;

import java.util.Map;
import java.util.Objects;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Felipe Veloso
 */
@RequestMapping("/object/action/commerce/order/item/update")
@RestController
public class ObjectActionCommerceOrderItemUpdateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		OrderItem orderItem = _commerceOrderItemService.fetchCommerceOrderItem(
			jsonObject.getLong("classPK"));

		if (orderItem == null) {
			return;
		}

		Map<String, String> nameMap = orderItem.getName();

		String name = null;

		if (nameMap != null) {
			name = nameMap.get("en_US");
		}

		if (!Objects.equals(
				OrderItemUtil.getStatus(orderItem),
				CommerceOrderItemConstants.STATUS_CANCELED) ||
			!Objects.equals(
				name, CommerceProductConstants.NAME_PAAS_EXPERIENCE)) {

			return;
		}

		Order order = _commerceOrderService.getCommerceOrder(
			GetterUtil.getLong(orderItem.getOrderId()));

		if (_hasOtherActivePaasExperience(
				order.getAccountId(), GetterUtil.getLong(orderItem.getId()))) {

			return;
		}

		String oktaApplicationId = _propertyService.getPropertyValue(
			order.getAccountId(), PropertyConstants.NAME_OKTA_APPLICATION);

		if (Validator.isNotNull(oktaApplicationId)) {
			_oktaService.deleteApplication(oktaApplicationId);
		}
	}

	private boolean _hasOtherActivePaasExperience(
			long accountId, long commerceOrderItemId)
		throws Exception {

		String todayString = LocalDate.now(
			ZoneOffset.UTC
		).toString();

		for (Order order : _commerceOrderService.getAccountOrders(accountId)) {
			OrderItem[] orderItems = order.getOrderItems();

			if (orderItems == null) {
				continue;
			}

			for (OrderItem orderItem : orderItems) {
				if (Objects.equals(orderItem.getId(), commerceOrderItemId)) {
					continue;
				}

				Map<String, String> nameMap = orderItem.getName();

				String name = null;

				if (nameMap != null) {
					name = nameMap.get("en_US");
				}

				if (Objects.equals(
						name, CommerceProductConstants.NAME_PAAS_EXPERIENCE) &&
					_isActiveOrderItem(
						GetterUtil.getLong(orderItem.getId()), todayString)) {

					return true;
				}
			}
		}

		return false;
	}

	private boolean _isActiveOrderItem(
			long commerceOrderItemId, String todayString)
		throws Exception {

		OrderItem orderItem = _commerceOrderItemService.fetchCommerceOrderItem(
			commerceOrderItemId);

		if ((orderItem == null) ||
			!Objects.equals(
				OrderItemUtil.getStatus(orderItem),
				CommerceOrderItemConstants.STATUS_APPROVED)) {

			return false;
		}

		String endDate = OrderItemUtil.getEffectiveEndDate(orderItem);

		if (Validator.isNull(endDate)) {
			endDate = OrderItemUtil.getEndDate(orderItem);
		}

		if (Validator.isNull(endDate) ||
			(endDate.compareTo(todayString) >= 0)) {

			return true;
		}

		return false;
	}

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private OktaService _oktaService;

	@Autowired
	private PropertyService _propertyService;

}