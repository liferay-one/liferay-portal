/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.role.EmployeeRoles;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Drew Brokke
 */
public class ProjectSyncModel {

	public ProjectSyncModel(
		AccountSyncModel accountSyncModel,
		EntitlementService entitlementService, Project project,
		ProjectMembershipService projectMembershipService,
		UserAccountService userAccountService) {

		_accountSyncModel = accountSyncModel;
		_entitlementService = entitlementService;
		_project = project;
		_projectMembershipService = projectMembershipService;
		_userAccountService = userAccountService;
	}

	public AccountSyncModel getAccountSyncModel() {
		return _accountSyncModel;
	}

	public List<EntitlementDefinition> getActiveEntitlementDefinitions()
		throws Exception {

		if (_activeEntitlementDefinitions == null) {
			_activeEntitlementDefinitions =
				_entitlementService.getActiveEntitlementDefinitions(
					_project.getExternalReferenceCode());
		}

		return _activeEntitlementDefinitions;
	}

	public List<UserAccount> getCustomerUserAccounts() throws Exception {
		UserAccountBucket userAccountBucket = _getUserAccountBucket();

		return userAccountBucket.getCustomerUserAccounts();
	}

	public Project getProject() {
		return _project;
	}

	public List<ProjectMembership> getProjectMemberships() throws Exception {
		if (_projectMemberships == null) {
			_projectMemberships =
				_projectMembershipService.getProjectMemberships(
					_project.getExternalReferenceCode());
		}

		return _projectMemberships;
	}

	public List<UserAccount> getWorkerUserAccounts() throws Exception {
		UserAccountBucket userAccountBucket = _getUserAccountBucket();

		return userAccountBucket.getWorkerUserAccounts();
	}

	private UserAccountBucket _getUserAccountBucket() throws Exception {
		if (_userAccountBucket != null) {
			return _userAccountBucket;
		}

		Map<String, Role> accountRolesByExternalReferenceCode =
			_accountSyncModel.getAccountRolesByExternalReferenceCode();

		List<ProjectMembership> projectMemberships = getProjectMemberships();

		List<Long> userIds = new ArrayList<>();

		for (ProjectMembership projectMembership : projectMemberships) {
			userIds.add(projectMembership.getUserId());
		}

		Map<Long, UserAccount> userAccountsByUserId = new LinkedHashMap<>();

		for (UserAccount userAccount :
				_userAccountService.getUserAccounts(userIds)) {

			userAccountsByUserId.put(userAccount.getId(), userAccount);
		}

		_userAccountBucket = new UserAccountBucket();

		for (ProjectMembership projectMembership : projectMemberships) {
			UserAccount userAccount = userAccountsByUserId.get(
				projectMembership.getUserId());

			if (userAccount == null) {
				_log.error(
					"Unable to get user account for user " +
						projectMembership.getUserId());

				continue;
			}

			Role role = accountRolesByExternalReferenceCode.get(
				projectMembership.getRoleExternalReferenceCode());

			if ((role != null) && _employeeRoleNames.contains(role.getName())) {
				_userAccountBucket.addWorkerUserAccount(userAccount);
			}
			else {
				_userAccountBucket.addCustomerUserAccount(userAccount);
			}
		}

		return _userAccountBucket;
	}

	private static final Log _log = LogFactory.getLog(ProjectSyncModel.class);

	private final AccountSyncModel _accountSyncModel;
	private List<EntitlementDefinition> _activeEntitlementDefinitions;
	private final List<String> _employeeRoleNames = EmployeeRoles.getNames();
	private final EntitlementService _entitlementService;
	private final Project _project;
	private List<ProjectMembership> _projectMemberships;
	private final ProjectMembershipService _projectMembershipService;
	private UserAccountBucket _userAccountBucket;
	private final UserAccountService _userAccountService;

}