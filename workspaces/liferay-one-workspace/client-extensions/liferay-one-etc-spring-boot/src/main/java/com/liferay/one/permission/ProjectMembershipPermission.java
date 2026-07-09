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
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class ProjectMembershipPermission {

	public void check(
			String actionId, Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		if (!_contains(actionId, jwt, projectExternalReferenceCode)) {
			throw new PrincipalException();
		}
	}

	private boolean _belongsToAccountOrganization(
			Jwt jwt, String projectExternalReferenceCode,
			UserAccount userAccount)
		throws Exception {

		String accountExternalReferenceCode =
			_projectService.fetchAccountExternalReferenceCode(
				projectExternalReferenceCode);

		if (Validator.isNull(accountExternalReferenceCode)) {
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

	private boolean _contains(
			String actionId, Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		UserAccount userAccount = _userAccountService.getMyUserAccount(jwt);

		if (_isAccountAdministrator(
				projectExternalReferenceCode, userAccount)) {

			return true;
		}

		String membershipRoleExternalReferenceCode =
			_projectMembershipService.getMembershipRole(
				projectExternalReferenceCode, userAccount.getId());

		if (Validator.isNotNull(membershipRoleExternalReferenceCode)) {
			if (ArrayUtil.contains(
					RoleConstants.ERCS_SUPPORT_PROJECT,
					membershipRoleExternalReferenceCode) &&
				actionId.equals(ActionKeys.VIEW)) {

				return true;
			}

			if (ArrayUtil.contains(
					RoleConstants.ERCS_SUPPORT_PROJECT_TICKET,
					membershipRoleExternalReferenceCode) &&
				actionId.equals(ActionKeys.UPDATE)) {

				return true;
			}
		}

		return _belongsToAccountOrganization(
			jwt, projectExternalReferenceCode, userAccount);
	}

	private boolean _isAccountAdministrator(
			String projectExternalReferenceCode, UserAccount userAccount)
		throws Exception {

		String accountExternalReferenceCode =
			_projectService.fetchAccountExternalReferenceCode(
				projectExternalReferenceCode);

		if (Validator.isNull(accountExternalReferenceCode)) {
			return false;
		}

		for (AccountBrief accountBrief : userAccount.getAccountBriefs()) {
			if (!Objects.equals(
					accountExternalReferenceCode,
					accountBrief.getExternalReferenceCode())) {

				continue;
			}

			for (RoleBrief roleBrief : accountBrief.getRoleBriefs()) {
				if (Objects.equals(
						RoleConstants.NAME_ACCOUNT_ADMINISTRATOR,
						roleBrief.getName())) {

					return true;
				}
			}
		}

		return false;
	}

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

}