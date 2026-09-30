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
import com.liferay.one.util.MemoizedValue;
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
		_project = project;
		_userAccountService = userAccountService;

		String externalReferenceCode = project.getExternalReferenceCode();

		_activeEntitlementDefinitions = new MemoizedValue<>(
			"entitlements for project " + externalReferenceCode, _log,
			() -> entitlementService.getActiveEntitlementDefinitions(
				externalReferenceCode));
		_projectMembers = new MemoizedValue<>(
			"project members for project " + externalReferenceCode, _log,
			this::_toProjectMembers);
		_projectMemberships = new MemoizedValue<>(
			"project memberships for project " + externalReferenceCode, _log,
			() -> projectMembershipService.getProjectMemberships(
				externalReferenceCode));
		_roleExternalKeysByUserAccountExternalKey = new MemoizedValue<>(
			"role external keys for project " + externalReferenceCode, _log,
			this::_toRoleExternalKeysByUserAccountExternalKey);
		_userAccountBucket = new MemoizedValue<>(
			"user account bucket for project " + externalReferenceCode, _log,
			this::_toUserAccountBucket);
	}

	public AccountSyncModel getAccountSyncModel() {
		return _accountSyncModel;
	}

	public List<EntitlementDefinition> getActiveEntitlementDefinitions() {
		return _activeEntitlementDefinitions.get();
	}

	public List<UserAccount> getCustomerUserAccounts() {
		UserAccountBucket userAccountBucket = _userAccountBucket.get();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getCustomerUserAccounts();
	}

	public Project getProject() {
		return _project;
	}

	public List<ProjectMember> getProjectMembers() {
		return _projectMembers.get();
	}

	public List<ProjectMembership> getProjectMemberships() {
		return _projectMemberships.get();
	}

	public Map<String, Set<String>>
		getRoleExternalKeysByUserAccountExternalKey() {

		return _roleExternalKeysByUserAccountExternalKey.get();
	}

	public List<UserAccount> getWorkerUserAccounts() {
		UserAccountBucket userAccountBucket = _userAccountBucket.get();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getWorkerUserAccounts();
	}

	private List<ProjectMember> _toProjectMembers() throws Exception {
		List<ProjectMembership> projectMemberships = _projectMemberships.get();

		if (projectMemberships == null) {
			return null;
		}

		List<Long> userIds = new ArrayList<>();

		for (ProjectMembership projectMembership : projectMemberships) {
			userIds.add(projectMembership.getUserId());
		}

		Map<Long, UserAccount> userAccountsByUserId = new LinkedHashMap<>();

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

		return projectMembers;
	}

	private Map<String, Set<String>>
		_toRoleExternalKeysByUserAccountExternalKey() {

		List<ProjectMember> projectMembers = _projectMembers.get();

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

		return roleExternalKeysByUserAccountExternalKey;
	}

	private UserAccountBucket _toUserAccountBucket() {
		Map<String, Role> accountRolesByExternalReferenceCode =
			_accountSyncModel.getAccountRolesByExternalReferenceCode();
		List<ProjectMember> projectMembers = _projectMembers.get();

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

			if ((role != null) && _employeeRoleNames.contains(role.getName())) {
				userAccountBucket.addWorkerUserAccount(userAccount);
			}
			else {
				userAccountBucket.addCustomerUserAccount(userAccount);
			}
		}

		return userAccountBucket;
	}

	private static final Log _log = LogFactory.getLog(ProjectSyncModel.class);

	private final AccountSyncModel _accountSyncModel;
	private final MemoizedValue<List<EntitlementDefinition>>
		_activeEntitlementDefinitions;
	private final List<String> _employeeRoleNames = EmployeeRoles.getNames();
	private final Project _project;
	private final MemoizedValue<List<ProjectMember>> _projectMembers;
	private final MemoizedValue<List<ProjectMembership>> _projectMemberships;
	private final MemoizedValue<Map<String, Set<String>>>
		_roleExternalKeysByUserAccountExternalKey;
	private final MemoizedValue<UserAccountBucket> _userAccountBucket;
	private final UserAccountService _userAccountService;

}