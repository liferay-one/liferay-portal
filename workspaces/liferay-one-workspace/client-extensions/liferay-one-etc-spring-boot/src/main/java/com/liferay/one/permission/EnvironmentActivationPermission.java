/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.FindUtil;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.Validator;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class EnvironmentActivationPermission {

	public Project check(Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		return _check(false, jwt, projectExternalReferenceCode);
	}

	public Account checkAccountLicenseKeyActivation(
			String accountExternalReferenceCode, Jwt jwt)
		throws Exception {

		Account account = null;

		if (Validator.isNotNull(accountExternalReferenceCode)) {
			account = _accountService.fetchAccountByExternalReferenceCode(
				accountExternalReferenceCode);
		}

		UserAccount userAccount = _userAccountService.getMyUserAccount(jwt);

		if (_hasGlobalRole(userAccount)) {
			return account;
		}

		if ((account != null) &&
			(_isAccountAdministrator(
				accountExternalReferenceCode, userAccount) ||
			 _isPartnerManager(accountExternalReferenceCode, userAccount) ||
			 _licenseKeyPermission.contains(
				 userAccount, account.getId(), ActionKeys.UPDATE))) {

			return account;
		}

		throw new PrincipalException();
	}

	public Project checkLicenseKeyActivation(
			Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		return _check(true, jwt, projectExternalReferenceCode);
	}

	private Project _check(
			boolean allowPartnerManager, Jwt jwt,
			String projectExternalReferenceCode)
		throws Exception {

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (!_contains(
				allowPartnerManager, jwt, project,
				projectExternalReferenceCode)) {

			throw new PrincipalException();
		}

		return project;
	}

	private boolean _contains(
			boolean allowPartnerManager, Jwt jwt, Project project,
			String projectExternalReferenceCode)
		throws Exception {

		UserAccount userAccount = _userAccountService.getMyUserAccount(jwt);

		if (_hasGlobalRole(userAccount)) {
			return true;
		}

		if (project == null) {
			return false;
		}

		String accountExternalReferenceCode =
			project.getAccountExternalReferenceCode();

		if (Validator.isNotNull(accountExternalReferenceCode) &&
			_isAccountAdministrator(
				accountExternalReferenceCode, userAccount)) {

			return true;
		}

		if (allowPartnerManager &&
			Validator.isNotNull(accountExternalReferenceCode) &&
			_isPartnerManager(accountExternalReferenceCode, userAccount)) {

			return true;
		}

		ProjectMembership projectMembership =
			_projectMembershipService.fetchProjectMembership(
				projectExternalReferenceCode, RoleConstants.ERC_PROJECT_ADMIN,
				userAccount.getId());

		if (projectMembership != null) {
			return true;
		}

		return false;
	}

	private RoleBrief[] _getAccountRoleBriefs(
		String accountExternalReferenceCode, UserAccount userAccount) {

		AccountBrief accountBrief = FindUtil.findFirst(
			userAccount.getAccountBriefs(),
			accountBrief1 -> Objects.equals(
				accountExternalReferenceCode,
				accountBrief1.getExternalReferenceCode()));

		if (accountBrief == null) {
			return null;
		}

		return accountBrief.getRoleBriefs();
	}

	private boolean _hasGlobalRole(UserAccount userAccount) {
		RoleBrief[] roleBriefs = userAccount.getRoleBriefs();

		if (roleBriefs == null) {
			return false;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			String roleBriefName = roleBrief.getName();

			if (Objects.equals(
					RoleConstants.NAME_ADMINISTRATOR, roleBriefName) ||
				Objects.equals(
					RoleConstants.NAME_LIFERAY_STAFF, roleBriefName) ||
				Objects.equals(
					RoleConstants.NAME_PROVISIONING_ADMINISTRATOR,
					roleBriefName)) {

				return true;
			}
		}

		return false;
	}

	private boolean _isAccountAdministrator(
		String accountExternalReferenceCode, UserAccount userAccount) {

		RoleBrief[] roleBriefs = _getAccountRoleBriefs(
			accountExternalReferenceCode, userAccount);

		if (roleBriefs == null) {
			return false;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			if (Objects.equals(
					RoleConstants.NAME_ACCOUNT_ADMINISTRATOR,
					roleBrief.getName())) {

				return true;
			}
		}

		return false;
	}

	private boolean _isPartnerManager(
		String accountExternalReferenceCode, UserAccount userAccount) {

		RoleBrief[] roleBriefs = _getAccountRoleBriefs(
			accountExternalReferenceCode, userAccount);

		if (roleBriefs == null) {
			return false;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			if (Objects.equals(
					RoleConstants.NAME_PARTNER_MANAGER, roleBrief.getName())) {

				return true;
			}
		}

		return false;
	}

	@Autowired
	private AccountService _accountService;

	@Autowired
	private LicenseKeyPermission _licenseKeyPermission;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

}