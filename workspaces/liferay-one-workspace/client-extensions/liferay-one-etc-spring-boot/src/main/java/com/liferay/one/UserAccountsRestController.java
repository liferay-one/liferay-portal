/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.service.AccountService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProvisioningEmailService;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Felipe Veloso
 */
@RequestMapping("/user-accounts")
@RestController
public class UserAccountsRestController extends OneBaseRestController {

	@PostMapping("/assignments")
	public void postAssignments(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		if (jsonObject.isNull("accountId") || jsonObject.isNull("userId")) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"\"accountId\" and \"userId\" are required");
		}

		long accountId = jsonObject.getLong("accountId");
		long userId = jsonObject.getLong("userId");

		Long accountRoleId = null;

		if (!jsonObject.isNull("accountRoleId")) {
			accountRoleId = jsonObject.getLong("accountRoleId");
		}

		_accountService.addAccountUserAccount(accountId, userId, accountRoleId);

		JSONArray projectsJSONArray = jsonObject.optJSONArray("projects");

		if (projectsJSONArray != null) {
			for (int i = 0; i < projectsJSONArray.length(); i++) {
				JSONObject projectJSONObject = projectsJSONArray.getJSONObject(
					i);

				_projectMembershipService.addProjectMembership(
					accountId, userId,
					projectJSONObject.getString("projectExternalReferenceCode"),
					projectJSONObject.getString("roleExternalReferenceCode"));
			}
		}

		_provisioningEmailService.sendAssignedWelcomeEmail(
			userId, _accountService.fetchAccount(accountId));
	}

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProvisioningEmailService _provisioningEmailService;

}