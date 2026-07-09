/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.UserAccountService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Jenny Chen
 */
@Component
public class BusinessEventPermission {

	public void check(
			String actionId, Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		UserAccount userAccount = _userAccountService.getMyUserAccount(jwt);

		for (RoleBrief roleBrief : userAccount.getRoleBriefs()) {
			String roleBriefName = roleBrief.getName();

			if (roleBriefName.equals(RoleConstants.NAME_ADMINISTRATOR) ||
				roleBriefName.equals(RoleConstants.NAME_LIFERAY_STAFF)) {

				return;
			}
		}

		_projectMembershipPermission.check(
			actionId, jwt, projectExternalReferenceCode);
	}

	@Autowired
	private ProjectMembershipPermission _projectMembershipPermission;

	@Autowired
	private UserAccountService _userAccountService;

}