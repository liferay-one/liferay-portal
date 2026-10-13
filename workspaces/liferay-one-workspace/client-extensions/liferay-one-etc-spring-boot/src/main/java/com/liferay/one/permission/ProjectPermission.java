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
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class ProjectPermission {

	public void check(
			String actionId, Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		if (!contains(
				actionId, jwt, projectExternalReferenceCode,
				_userAccountService.getMyUserAccount(jwt))) {

			throw new PrincipalException();
		}
	}

	public boolean contains(
			String actionId, Jwt jwt, String projectExternalReferenceCode,
			UserAccount userAccount)
		throws Exception {

		for (RoleBrief roleBrief : userAccount.getRoleBriefs()) {
			String roleBriefName = roleBrief.getName();

			if (roleBriefName.equals(RoleConstants.NAME_ADMINISTRATOR) ||
				roleBriefName.equals(RoleConstants.NAME_LIFERAY_STAFF) ||
				roleBriefName.equals(
					RoleConstants.NAME_PROVISIONING_ADMINISTRATOR)) {

				return true;
			}
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if ((project == null) ||
			Validator.isNull(project.getAccountExternalReferenceCode())) {

			return false;
		}

		if (_hasAccountRole(
				project.getAccountExternalReferenceCode(),
				List.of(RoleConstants.NAME_ACCOUNT_ADMINISTRATOR),
				userAccount) ||
			(actionId.equals(ActionKeys.ASSIGN_MEMBERS) &&
			 _accountPermission.contains(
				 project.getAccountExternalReferenceCode(),
				 ActionKeys.ASSIGN_MEMBERS, jwt, userAccount)) ||
			(actionId.equals(ActionKeys.VIEW) &&
			 _hasAccountRole(
				 project.getAccountExternalReferenceCode(),
				 List.of(RoleConstants.NAME_ACCOUNT_MEMBER), userAccount))) {

			return true;
		}

		if ((((actionId.equals(ActionKeys.UPDATE) ||
			   actionId.equals(ActionKeys.VIEW)) &&
			  _hasAccountRole(
				  project.getAccountExternalReferenceCode(),
				  RoleConstants.namesPartnerAccountManager, userAccount)) ||
			 (actionId.equals(ActionKeys.VIEW) &&
			  _hasAccountRole(
				  project.getAccountExternalReferenceCode(),
				  RoleConstants.namesPartnerAccountRoles, userAccount))) &&
			_entitlementService.hasEntitlement(
				project.getAccountId(), EntitlementConstants.NAME_PARTNER)) {

			return true;
		}

		for (ProjectMembership projectMembership :
				_projectMembershipService.getProjectMemberships(
					projectExternalReferenceCode, userAccount.getId())) {

			if (Objects.equals(
					projectMembership.getRoleExternalReferenceCode(),
					RoleConstants.ERC_PROJECT_ADMIN) &&
				actionId.equals(ActionKeys.ASSIGN_MEMBERS)) {

				return true;
			}

			if (RoleConstants.ercsSupportProject.contains(
					projectMembership.getRoleExternalReferenceCode()) &&
				actionId.equals(ActionKeys.VIEW)) {

				return true;
			}

			if (RoleConstants.ercsSupportProjectTicket.contains(
					projectMembership.getRoleExternalReferenceCode()) &&
				actionId.equals(ActionKeys.UPDATE)) {

				return true;
			}
		}

		if (actionId.equals(ActionKeys.ASSIGN_MEMBERS)) {
			return false;
		}

		Account account = _accountService.getAccount(
			project.getAccountExternalReferenceCode(), jwt);

		for (OrganizationBrief organizationBrief :
				userAccount.getOrganizationBriefs()) {

			if (ArrayUtil.contains(
					account.getOrganizationIds(), organizationBrief.getId())) {

				return true;
			}
		}

		return false;
	}

	private boolean _hasAccountRole(
			String accountExternalReferenceCode, List<String> roleNames,
			UserAccount userAccount)
		throws Exception {

		for (AccountBrief accountBrief : userAccount.getAccountBriefs()) {
			if (!Objects.equals(
					accountExternalReferenceCode,
					accountBrief.getExternalReferenceCode())) {

				continue;
			}

			for (RoleBrief roleBrief : accountBrief.getRoleBriefs()) {
				if (roleNames.contains(roleBrief.getName())) {
					return true;
				}
			}
		}

		return false;
	}

	@Autowired
	private AccountPermission _accountPermission;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

}