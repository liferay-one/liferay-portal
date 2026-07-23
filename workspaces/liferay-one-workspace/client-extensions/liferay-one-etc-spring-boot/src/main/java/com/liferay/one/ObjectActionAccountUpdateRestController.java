/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.service.AccountService;

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
@RequestMapping("/object/action/account/update")
@RestController
public class ObjectActionAccountUpdateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		long classPK = jsonObject.getLong("classPK");

		if (_log.isInfoEnabled()) {
			_log.info(
				"Account " + classPK +
					" was updated, triggering a sync to JSM");
		}

		Account account = _accountService.fetchAccount(classPK);

		if (account == null) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to find account " + classPK);
			}

			return;
		}

		_accountSynchronizer.syncAccount(account);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionAccountUpdateRestController.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private AccountSynchronizer _accountSynchronizer;

}