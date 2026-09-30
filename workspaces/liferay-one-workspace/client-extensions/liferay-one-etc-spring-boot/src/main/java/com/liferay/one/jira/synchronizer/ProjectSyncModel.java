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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

	public List<EntitlementDefinition> getActiveEntitlementDefinitions() {
		if (_activeEntitlementDefinitions == null) {
			try {
				_activeEntitlementDefinitions =
					_entitlementService.getActiveEntitlementDefinitions(
						_project.getExternalReferenceCode());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get entitlements for project " +
						_project.getExternalReferenceCode(),
					exception);
			}
		}

		return _activeEntitlementDefinitions;
	}

	public List<UserAccount> getCustomerUserAccounts() {
		UserAccountBucket userAccountBucket = _getUserAccountBucket();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getCustomerUserAccounts();
	}

	public Project getProject() {
		return _project;
	}

	public List<ProjectMember> getProjectMembers() {
		if (_projectMembers == null) {
			List<ProjectMembership> projectMemberships =
				getProjectMemberships();

			if (projectMemberships == null) {
				return null;
			}

			try {
				List<Long> userIds = new ArrayList<>();

				for (ProjectMembership projectMembership : projectMemberships) {
					userIds.add(projectMembership.getUserId());
				}

				Map<Long, UserAccount> userAccountsByUserId =
					new LinkedHashMap<>();

				for (UserAccount userAccount :
						_userAccountService.getUserAccounts(userIds)) {

					userAccountsByUserId.put(userAccount.getId(), userAccount);
				}

				List<ProjectMember> projectMembers = new ArrayList<>();

				for (ProjectMembership projectMembership : projectMemberships) {
					UserAccount userAccount = userAccountsByUserId.get(
						projectMembership.getUserId());

					if (userAccount == null) {
						_log.error(
							"Unable to get user account for user " +
								projectMembership.getUserId());

						continue;
					}

					projectMembers.add(
						new ProjectMember(projectMembership, userAccount));
				}

				_projectMembers = projectMembers;
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get project members for project " +
						_project.getExternalReferenceCode(),
					exception);
			}
		}

		return _projectMembers;
	}

	public List<ProjectMembership> getProjectMemberships() {
		if (_projectMemberships == null) {
			try {
				_projectMemberships =
					_projectMembershipService.getProjectMemberships(
						_project.getExternalReferenceCode());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get project memberships for project " +
						_project.getExternalReferenceCode(),
					exception);
			}
		}

		return _projectMemberships;
	}

	public Map<String, Set<String>>
		getRoleExternalKeysByUserAccountExternalKey() {

		if (_roleExternalKeysByUserAccountExternalKey == null) {
			List<ProjectMember> projectMembers = getProjectMembers();

			if (projectMembers == null) {
				return null;
			}

			Map<String, Set<String>> roleExternalKeysByUserAccountExternalKey =
				new LinkedHashMap<>();

			for (ProjectMember projectMember : projectMembers) {
				ProjectMembership projectMembership =
					projectMember.getProjectMembership();

				UserAccount userAccount = projectMember.getUserAccount();

				Set<String> roleExternalKeys =
					roleExternalKeysByUserAccountExternalKey.computeIfAbsent(
						userAccount.getExternalReferenceCode(),
						userAccountExternalKey -> new LinkedHashSet<>());

				roleExternalKeys.add(
					projectMembership.getRoleExternalReferenceCode());
			}

			_roleExternalKeysByUserAccountExternalKey =
				roleExternalKeysByUserAccountExternalKey;
		}

		return _roleExternalKeysByUserAccountExternalKey;
	}

	public List<UserAccount> getWorkerUserAccounts() {
		UserAccountBucket userAccountBucket = _getUserAccountBucket();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getWorkerUserAccounts();
	}

	private UserAccountBucket _getUserAccountBucket() {
		if (_userAccountBucket == null) {
			Map<String, Role> accountRolesByExternalReferenceCode =
				_accountSyncModel.getAccountRolesByExternalReferenceCode();
			List<ProjectMember> projectMembers = getProjectMembers();

			if ((accountRolesByExternalReferenceCode == null) ||
				(projectMembers == null)) {

				return null;
			}

			UserAccountBucket userAccountBucket = new UserAccountBucket();

			for (ProjectMember projectMember : projectMembers) {
				ProjectMembership projectMembership =
					projectMember.getProjectMembership();
				UserAccount userAccount = projectMember.getUserAccount();

				Role role = accountRolesByExternalReferenceCode.get(
					projectMembership.getRoleExternalReferenceCode());

				if ((role != null) &&
					_employeeRoleNames.contains(role.getName())) {

					userAccountBucket.addWorkerUserAccount(userAccount);
				}
				else {
					userAccountBucket.addCustomerUserAccount(userAccount);
				}
			}

			_userAccountBucket = userAccountBucket;
		}

		return _userAccountBucket;
	}

	private static final Log _log = LogFactory.getLog(ProjectSyncModel.class);

	private final AccountSyncModel _accountSyncModel;
	private List<EntitlementDefinition> _activeEntitlementDefinitions;
	private final List<String> _employeeRoleNames = EmployeeRoles.getNames();
	private final EntitlementService _entitlementService;
	private final Project _project;
	private List<ProjectMember> _projectMembers;
	private List<ProjectMembership> _projectMemberships;
	private final ProjectMembershipService _projectMembershipService;
	private Map<String, Set<String>> _roleExternalKeysByUserAccountExternalKey;
	private UserAccountBucket _userAccountBucket;
	private final UserAccountService _userAccountService;

}