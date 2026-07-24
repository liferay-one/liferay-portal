/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.service.SubscriptionEntryService;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Amos Fong
 * @author Drew Brokke
 */
@RequestMapping("/object/action/user/delete")
@RestController
public class ObjectActionUserRestController extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		_subscriptionEntryService.deleteSubscriptionEntries(
			jsonObject.getLong("classPK"));

		JSONObject modelJSONObject = jsonObject.getJSONObject("modelUser");

		String externalReferenceCode = modelJSONObject.getString(
			"externalReferenceCode");

		if (_log.isInfoEnabled()) {
			_log.info(
				"User " + externalReferenceCode +
					" was deleted, triggering a delete from JSM");
		}

		_userAccountSynchronizer.deleteUserAccount(externalReferenceCode);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionUserRestController.class);

	@Autowired
	private SubscriptionEntryService _subscriptionEntryService;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}