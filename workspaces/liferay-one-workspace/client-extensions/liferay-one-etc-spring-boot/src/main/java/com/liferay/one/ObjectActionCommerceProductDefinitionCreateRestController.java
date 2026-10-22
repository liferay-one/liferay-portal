/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.CommerceProductService;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Beatriz Costa
 */
@RequestMapping("/object/action/commerce/product/definition/create")
@RestController
public class ObjectActionCommerceProductDefinitionCreateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject modelCPDefinitionJSONObject = jsonObject.optJSONObject(
			"modelCPDefinition");

		if (modelCPDefinitionJSONObject == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to find the CPDefinition model attributes for " +
						"class PK " + jsonObject.optLong("classPK"));
			}

			return;
		}

		_commerceProductService.sendNewAppSubmittedNotification(
			modelCPDefinitionJSONObject.getLong("CProductId"));
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionCommerceProductDefinitionCreateRestController.class);

	@Autowired
	private CommerceProductService _commerceProductService;

}