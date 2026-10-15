/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserGroupService;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Felipe Franca
 */
@RequestMapping("/object/action/project/membership/user/group/remove")
@RestController
public class ObjectActionProjectMembershipUserGroupRemoveRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject objectEntryJSONObject = jsonObject.getJSONObject(
			"objectEntry");

		JSONObject valuesJSONObject = objectEntryJSONObject.getJSONObject(
			"values");

		String userExternalReferenceCode = valuesJSONObject.getString(
			"r_userToProjectMembership_userERC");

		UserAccount userAccount =
			_userAccountService.fetchUserAccountByExternalReferenceCode(
				userExternalReferenceCode);

		if (userAccount == null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping the user group sync because user " +
						userExternalReferenceCode + " no longer exists");
			}

			return;
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				"Project membership of user " + userAccount.getId() +
					" was deleted, triggering a user group sync");
		}

		_userGroupService.syncUserAccountUserGroups(userAccount.getId());
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionProjectMembershipUserGroupRemoveRestController.class);

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserGroupService _userGroupService;

}