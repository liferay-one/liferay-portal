/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.service.UserAccountService;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Drew Brokke
 */
@RequestMapping("/object/action/user/create")
@RestController
public class ObjectActionUserCreateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		long classPK = jsonObject.getLong("classPK");

		if (_log.isInfoEnabled()) {
			_log.info(
				"User " + classPK + " was created, triggering a sync to JSM");
		}

		_userAccountSynchronizer.syncUserAccount(
			_userAccountService.getUserAccount(classPK));
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionUserCreateRestController.class);

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}