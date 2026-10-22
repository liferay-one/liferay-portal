/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.PublisherAccountRequestService;
import com.liferay.portal.kernel.util.StringUtil;

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
@RequestMapping("/object/action/publisher/account/request/update")
@RestController
public class ObjectActionPublisherAccountRequestUpdateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject modelPublisherAccountRequestJSONObject =
			jsonObject.optJSONObject("modelPublisherAccountRequest");

		if (modelPublisherAccountRequestJSONObject == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to find the PublisherAccountRequest model " +
						"attributes for class PK " +
							jsonObject.optLong("classPK"));
			}

			return;
		}

		if (!StringUtil.equalsIgnoreCase(
				_getRequestStatus(modelPublisherAccountRequestJSONObject),
				"completed")) {

			return;
		}

		_publisherAccountRequestService.
			sendCongratulationsPublisherNotification(
				modelPublisherAccountRequestJSONObject);
	}

	private String _getRequestStatus(
		JSONObject modelPublisherAccountRequestJSONObject) {

		Object requestStatusObject = modelPublisherAccountRequestJSONObject.opt(
			"requestStatus");

		if (requestStatusObject instanceof JSONObject) {
			JSONObject requestStatusJSONObject =
				(JSONObject)requestStatusObject;

			return requestStatusJSONObject.optString("key");
		}
		else if (requestStatusObject instanceof String) {
			return (String)requestStatusObject;
		}

		return "";
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionPublisherAccountRequestUpdateRestController.class);

	@Autowired
	private PublisherAccountRequestService _publisherAccountRequestService;

}