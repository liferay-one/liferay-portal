/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.ArrayUtil;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Jenny Chen
 */
@Component
public class AccountPermission {

	public void check(
			String accountExternalReferenceCode, String actionId, Jwt jwt)
		throws Exception {

		if (!contains(
				accountExternalReferenceCode, actionId, jwt,
				_userAccountService.getMyUserAccount(jwt))) {

			throw new PrincipalException();
		}
	}

	public boolean contains(
			String accountExternalReferenceCode, String actionId, Jwt jwt,
			UserAccount userAccount)
		throws Exception {

		for (RoleBrief roleBrief : userAccount.getRoleBriefs()) {
			String roleBriefName = roleBrief.getName();

			if (roleBriefName.equals(RoleConstants.NAME_ADMINISTRATOR) ||
				roleBriefName.equals(RoleConstants.NAME_LIFERAY_STAFF)) {

				return true;
			}
		}

		for (AccountBrief accountBrief : userAccount.getAccountBriefs()) {
			if (!Objects.equals(
					accountExternalReferenceCode,
					accountBrief.getExternalReferenceCode())) {

				continue;
			}

			for (RoleBrief roleBrief : accountBrief.getRoleBriefs()) {
				if (ArrayUtil.contains(
						RoleConstants.NAMES_ACCOUNT_MANAGER,
						roleBrief.getName()) &&
					actionId.equals(ActionKeys.ASSIGN_MEMBERS)) {

					return true;
				}

				if (ArrayUtil.contains(
						RoleConstants.NAMES_SUPPORT_ACCOUNT,
						roleBrief.getName()) &&
					actionId.equals(ActionKeys.VIEW)) {

					return true;
				}

				if (ArrayUtil.contains(
						RoleConstants.NAMES_SUPPORT_ACCOUNT_TICKET,
						roleBrief.getName()) &&
					actionId.equals(ActionKeys.UPDATE)) {

					return true;
				}
			}
		}

		if (actionId.equals(ActionKeys.ASSIGN_MEMBERS)) {
			return false;
		}

		Account account = _accountService.getAccount(
			accountExternalReferenceCode, jwt);

		for (OrganizationBrief organizationBrief :
				userAccount.getOrganizationBriefs()) {

			if (ArrayUtil.contains(
					account.getOrganizationIds(), organizationBrief.getId())) {

				return true;
			}
		}

		return false;
	}

	@Autowired
	private AccountService _accountService;

	@Autowired
	private UserAccountService _userAccountService;

}