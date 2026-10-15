/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

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
@RequestMapping("/object/action/project/membership/user/group/add")
@RestController
public class ObjectActionProjectMembershipUserGroupAddRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject objectEntryJSONObject = jsonObject.getJSONObject(
			"objectEntry");

		JSONObject valuesJSONObject = objectEntryJSONObject.getJSONObject(
			"values");

		long userId = valuesJSONObject.getLong(
			"r_userToProjectMembership_userId");

		if (_log.isInfoEnabled()) {
			_log.info(
				"Project membership of user " + userId +
					" was created, triggering a user group sync");
		}

		_userGroupService.syncUserAccountUserGroups(userId);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionProjectMembershipUserGroupAddRestController.class);

	@Autowired
	private UserGroupService _userGroupService;

}