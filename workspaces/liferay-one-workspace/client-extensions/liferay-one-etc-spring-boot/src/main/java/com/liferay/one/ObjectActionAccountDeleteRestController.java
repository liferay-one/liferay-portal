/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.AccountSynchronizer;

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
@RequestMapping("/object/action/account/delete")
@RestController
public class ObjectActionAccountDeleteRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject modelJSONObject = jsonObject.getJSONObject(
			"modelAccountEntry");

		String externalReferenceCode = modelJSONObject.getString(
			"externalReferenceCode");

		if (_log.isInfoEnabled()) {
			_log.info(
				"Account " + externalReferenceCode +
					" was deleted, triggering a delete from JSM");
		}

		_accountSynchronizer.deleteAccount(externalReferenceCode);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionAccountDeleteRestController.class);

	@Autowired
	private AccountSynchronizer _accountSynchronizer;

}