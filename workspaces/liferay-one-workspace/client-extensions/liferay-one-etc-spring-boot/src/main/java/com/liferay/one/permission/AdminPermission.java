/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class AdminPermission {

	public void check(Jwt jwt) throws Exception {
		if (!contains(jwt)) {
			throw new PrincipalException();
		}
	}

	public boolean contains(Jwt jwt) throws Exception {
		return contains(_userAccountService.getMyUserAccount(jwt));
	}

	public boolean contains(UserAccount userAccount) {
		return UserAccountUtil.hasRole(
			userAccount, RoleConstants.NAME_ADMINISTRATOR,
			RoleConstants.NAME_PROVISIONING_ADMINISTRATOR);
	}

	@Autowired
	private UserAccountService _userAccountService;

}