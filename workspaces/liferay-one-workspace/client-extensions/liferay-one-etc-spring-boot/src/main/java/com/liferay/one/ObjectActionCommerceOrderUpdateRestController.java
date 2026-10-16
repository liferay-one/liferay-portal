/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Ricardo Mariz
 */
@RequestMapping("/object/action/commerce/order/update")
@RestController
public class ObjectActionCommerceOrderUpdateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		long orderId = jsonObject.getLong("classPK");

		try {
			_entitlementService.generateOrderEntitlements(orderId);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to generate entitlements for order " + orderId,
				exception);
		}

		_commerceOrderService.dispatchOrderUpdate(orderId);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionCommerceOrderUpdateRestController.class);

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

}