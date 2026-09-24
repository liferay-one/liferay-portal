/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountSynchronizer;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.model.Property;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.util.FindUtil;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class UserAssignmentService {

	public boolean assignAccount(Account account, long userId)
		throws Exception {

		if (_userAccountService.hasAccountUserAccount(
				account.getId(), userId)) {

			return false;
		}

		_oktaService.activateContact(userId);

		_accountService.addAccountUserAccount(account.getId(), userId);

		_syncAccountMembershipToJSM(account, userId);

		return true;
	}

	public void assignAccountRole(
			Account account, AccountRole accountRole, long userId)
		throws Exception {

		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		Set<String> accountRoleNames = UserAccountUtil.getAccountRoleNames(
			userAccount, account.getId());

		if (accountRoleNames.contains(accountRole.getName())) {
			return;
		}

		if (!UserAccountUtil.hasAccountMembership(
				userAccount, account.getId())) {

			_oktaService.activateContact(userId);

			_accountService.addAccountUserAccount(account.getId(), userId);
		}

		_accountService.addAccountUserAccountRole(
			account.getId(), accountRole.getId(), userId);

		_syncAccountMembershipToJSM(account, userId);

		_sendPartnerAccountRoleEmail(
			account, accountRole.getName(), true, userAccount);

		_syncCloudNativeOktaApplication(
			account, accountRole.getName(), true, userAccount);
	}

	public void assignOrganization(long organizationId, long userId)
		throws Exception {

		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		if (_hasOrganization(organizationId, userAccount)) {
			return;
		}

		_oktaService.activateContact(userId);

		_organizationService.addOrganizationUserAccountByEmailAddress(
			userAccount.getEmailAddress(), organizationId);

		_syncOrganizationUserAccountsToJSM(
			_organizationService.getOrganization(organizationId), userId);
	}

	public void assignOrganizationRole(
			long organizationId, long organizationRoleId, long userId)
		throws Exception {

		_roleService.addOrganizationUserAccountRole(
			organizationId, organizationRoleId, userId);

		_syncOrganizationRoleToJSM(
			true, organizationId, organizationRoleId, userId);
	}

	public void assignProjectRole(
			Project project, String projectRoleExternalReferenceCode,
			long userId)
		throws Exception {

		String projectExternalReferenceCode =
			project.getExternalReferenceCode();

		ProjectMembership projectMembership =
			_projectMembershipService.fetchProjectMembership(
				projectExternalReferenceCode, projectRoleExternalReferenceCode,
				userId);

		if (projectMembership != null) {
			return;
		}

		if (!_userAccountService.hasAccountUserAccount(
				project.getAccountId(), userId)) {

			_oktaService.activateContact(userId);

			_accountService.addAccountUserAccount(
				project.getAccountId(), userId);
		}

		_projectMembershipService.addProjectMembership(
			projectExternalReferenceCode, projectRoleExternalReferenceCode,
			userId);

		_syncProjectMembershipToJSM(
			true, project, projectRoleExternalReferenceCode, userId);
	}

	public void syncOktaGroupOrganizations(long userId) throws Exception {
		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		Set<String> groupIds = new HashSet<>(
			_oktaService.getContactGroupIds(userAccount.getEmailAddress()));

		Set<Long> groupOrganizationIds = new HashSet<>();
		Set<Long> linkedOrganizationIds = new HashSet<>();

		for (Property property :
				_propertyService.getProperties(
					com.liferay.portal.kernel.model.Organization.class.
						getName(),
					PropertyConstants.NAME_OKTA_GROUP)) {

			linkedOrganizationIds.add(property.getClassPK());

			if (groupIds.contains(property.getValue())) {
				groupOrganizationIds.add(property.getClassPK());
			}
		}

		for (long organizationId : groupOrganizationIds) {
			assignOrganization(organizationId, userId);
		}

		OrganizationBrief[] organizationBriefs =
			userAccount.getOrganizationBriefs();

		if (organizationBriefs == null) {
			return;
		}

		for (OrganizationBrief organizationBrief : organizationBriefs) {
			long organizationId = organizationBrief.getId();

			if (linkedOrganizationIds.contains(organizationId) &&
				!groupOrganizationIds.contains(organizationId)) {

				unassignOrganization(organizationId, userId);
			}
		}
	}

	public void unassignAccount(Account account, long userId) throws Exception {
		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		AccountBrief accountBrief = FindUtil.findFirst(
			userAccount.getAccountBriefs(),
			accountBrief1 -> Objects.equals(
				account.getId(), accountBrief1.getId()));

		if (accountBrief == null) {
			return;
		}

		for (ProjectMembership projectMembership :
				_projectMembershipService.getProjectMemberships(
					account.getId(), userId)) {

			Project project = _projectService.fetchProject(
				projectMembership.getProjectExternalReferenceCode());

			if (project != null) {
				unassignProjectRole(
					project, projectMembership.getRoleExternalReferenceCode(),
					userId);
			}
		}

		_accountService.removeAccountUserAccount(account.getId(), userId);

		RoleBrief[] roleBriefs = accountBrief.getRoleBriefs();

		if (roleBriefs != null) {
			for (RoleBrief roleBrief : roleBriefs) {
				_syncAccountRoleUnassignmentToJSM(
					account, roleBrief.getExternalReferenceCode(), userAccount);

				_sendPartnerAccountRoleEmail(
					account, roleBrief.getName(), false, userAccount);

				_syncCloudNativeOktaApplication(
					account, roleBrief.getName(), false, userAccount);
			}
		}

		_subscriptionEntryService.deleteAccountLicenseKeySubscriptionEntries(
			account.getId(), userId);

		_syncAccountMembershipToJSM(account, userId);
	}

	public void unassignAccountRole(
			Account account, AccountRole accountRole, long userId)
		throws Exception {

		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		Set<String> accountRoleNames = UserAccountUtil.getAccountRoleNames(
			userAccount, account.getId());

		if (!accountRoleNames.contains(accountRole.getName())) {
			return;
		}

		_accountService.removeAccountUserAccountRole(
			account.getId(), accountRole.getId(), userId);

		_syncAccountRoleUnassignmentToJSM(
			account, accountRole.getExternalReferenceCode(), userAccount);

		_syncAccountMembershipToJSM(account, userId);

		_sendPartnerAccountRoleEmail(
			account, accountRole.getName(), false, userAccount);

		_syncCloudNativeOktaApplication(
			account, accountRole.getName(), false, userAccount);
	}

	public void unassignOrganization(long organizationId, long userId)
		throws Exception {

		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		if (!_hasOrganization(organizationId, userAccount)) {
			return;
		}

		Organization organization = _organizationService.getOrganization(
			organizationId);

		_organizationService.removeOrganizationUserAccountByEmailAddress(
			userAccount.getEmailAddress(), organizationId);

		_syncOrganizationRolesUnassignmentToJSM(organization, userAccount);

		_syncOrganizationUserAccountsToJSM(organization, userId);
	}

	public void unassignOrganizationRole(
			long organizationId, long organizationRoleId, long userId)
		throws Exception {

		_roleService.removeOrganizationUserAccountRole(
			organizationId, organizationRoleId, userId);

		_syncOrganizationRoleToJSM(
			false, organizationId, organizationRoleId, userId);
	}

	public void unassignProjectRole(
			Project project, String projectRoleExternalReferenceCode,
			long userId)
		throws Exception {

		if (!_projectMembershipService.deleteProjectMembership(
				null, project.getExternalReferenceCode(),
				projectRoleExternalReferenceCode, userId)) {

			return;
		}

		_syncProjectMembershipToJSM(
			false, project, projectRoleExternalReferenceCode, userId);
	}

	private boolean _hasOrganization(
		long organizationId, UserAccount userAccount) {

		OrganizationBrief[] organizationBriefs =
			userAccount.getOrganizationBriefs();

		if (organizationBriefs == null) {
			return false;
		}

		for (OrganizationBrief organizationBrief : organizationBriefs) {
			if (Objects.equals(organizationBrief.getId(), organizationId)) {
				return true;
			}
		}

		return false;
	}

	private void _sendPartnerAccountRoleEmail(
		Account account, String accountRoleName, boolean assigned,
		UserAccount userAccount) {

		if (!ArrayUtil.contains(
				RoleConstants.NAMES_PARTNER_ACCOUNT_ROLES, accountRoleName)) {

			return;
		}

		String roleAction = _ROLE_ACTION_UNASSIGNED;

		if (assigned) {
			roleAction = _ROLE_ACTION_ASSIGNED;
		}

		try {
			_provisioningEmailService.sendPartnerUserUpdateEmail(
				account, userAccount, accountRoleName, roleAction);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to send partner user update email for account ",
					"role ", accountRoleName, " and user ",
					userAccount.getId()),
				exception);
		}
	}

	private void _syncAccountMembershipToJSM(Account account, long userId) {
		try {
			_accountUserAccountSynchronizer.syncAccountUserAccountMembership(
				account, _userAccountService.getUserAccount(userId));
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync membership for user " + userId + " to JSM",
				exception);
		}
	}

	private void _syncAccountRoleUnassignmentToJSM(
		Account account, String accountRoleExternalReferenceCode,
		UserAccount userAccount) {

		try {
			_accountUserAccountRoleSynchronizer.syncUnassignRole(
				accountRoleExternalReferenceCode,
				userAccount.getExternalReferenceCode(),
				account.getExternalReferenceCode());
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync contact role unassignment ",
					accountRoleExternalReferenceCode, " for user ",
					userAccount.getId(), " to JSM"),
				exception);
		}
	}

	private void _syncCloudNativeOktaApplication(
		Account account, String accountRoleName, boolean assigned,
		UserAccount userAccount) {

		if (!Objects.equals(
				accountRoleName, RoleConstants.NAME_CLOUD_NATIVE_CONTACT)) {

			return;
		}

		try {
			String oktaApplicationId = _propertyService.getPropertyValue(
				account.getId(), PropertyConstants.NAME_OKTA_APPLICATION);

			if (Validator.isNull(oktaApplicationId)) {
				return;
			}

			if (assigned) {
				_oktaService.assignUserToApplication(
					oktaApplicationId, userAccount.getEmailAddress());
			}
			else {
				_oktaService.unassignUserFromApplication(
					oktaApplicationId, userAccount.getEmailAddress());
			}
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync Cloud Native Okta application for user ",
					userAccount.getId(), " and account ", account.getId()),
				exception);
		}
	}

	private void _syncOrganizationRolesUnassignmentToJSM(
		Organization organization, UserAccount userAccount) {

		OrganizationBrief organizationBrief = FindUtil.findFirst(
			userAccount.getOrganizationBriefs(),
			organizationBrief1 -> Objects.equals(
				organization.getExternalReferenceCode(),
				organizationBrief1.getExternalReferenceCode()));

		if (organizationBrief == null) {
			return;
		}

		RoleBrief[] roleBriefs = organizationBrief.getRoleBriefs();

		if (roleBriefs == null) {
			return;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			try {
				_organizationUserAccountRoleSynchronizer.syncUnassignRole(
					roleBrief.getExternalReferenceCode(),
					userAccount.getExternalReferenceCode(),
					organization.getExternalReferenceCode());
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to sync organization contact role ",
						"unassignment for role ",
						roleBrief.getExternalReferenceCode(), " to JSM"),
					exception);
			}
		}
	}

	private void _syncOrganizationRoleToJSM(
		boolean assigned, long organizationId, long organizationRoleId,
		long userId) {

		try {
			Organization organization = _organizationService.getOrganization(
				organizationId);
			Role role = _roleService.getRole(organizationRoleId);
			UserAccount userAccount = _userAccountService.getUserAccount(
				userId);

			if (assigned) {
				_organizationUserAccountRoleSynchronizer.syncAssignRole(
					role.getExternalReferenceCode(),
					userAccount.getExternalReferenceCode(),
					organization.getExternalReferenceCode());
			}
			else {
				_organizationUserAccountRoleSynchronizer.syncUnassignRole(
					role.getExternalReferenceCode(),
					userAccount.getExternalReferenceCode(),
					organization.getExternalReferenceCode());
			}

			_organizationUserAccountSynchronizer.
				syncOrganizationUserAccountMembership(
					organization, userAccount);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync organization role ", organizationRoleId,
					" for user ", userId, " to JSM"),
				exception);
		}
	}

	private void _syncOrganizationUserAccountsToJSM(
		Organization organization, long userId) {

		try {
			UserAccount userAccount = _userAccountService.getUserAccount(
				userId);

			_userAccountSynchronizer.syncUserAccountOrganizations(userAccount);
			_userAccountSynchronizer.syncUserAccountRoles(userAccount);

			_organizationSynchronizer.syncOrganizationUserAccounts(
				organization);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync organization membership for user ", userId,
					" and organization ",
					organization.getExternalReferenceCode(), " to JSM"),
				exception);
		}
	}

	private void _syncProjectMembershipToJSM(
		boolean assigned, Project project,
		String projectRoleExternalReferenceCode, long userId) {

		try {
			_accountSynchronizer.syncProjectUserAccounts(project);

			_accountSynchronizer.syncAccountUserAccounts(
				_accountService.getAccount(
					project.getAccountExternalReferenceCode()));

			UserAccount userAccount = _userAccountService.getUserAccount(
				userId);

			_userAccountSynchronizer.syncUserAccountAccounts(userAccount);
			_userAccountSynchronizer.syncUserAccountRoles(userAccount);

			if (assigned) {
				_accountUserAccountRoleSynchronizer.syncAssignRole(
					projectRoleExternalReferenceCode,
					userAccount.getExternalReferenceCode(),
					project.getExternalReferenceCode());
			}
			else {
				_accountUserAccountRoleSynchronizer.syncUnassignRole(
					projectRoleExternalReferenceCode,
					userAccount.getExternalReferenceCode(),
					project.getExternalReferenceCode());
			}
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync project membership for user ", userId,
					" and project ", project.getExternalReferenceCode(),
					" to JSM"),
				exception);
		}
	}

	private static final String _ROLE_ACTION_ASSIGNED = "Assigned";

	private static final String _ROLE_ACTION_UNASSIGNED = "Unassigned";

	private static final Log _log = LogFactory.getLog(
		UserAssignmentService.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private AccountSynchronizer _accountSynchronizer;

	@Autowired
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;

	@Autowired
	private AccountUserAccountSynchronizer _accountUserAccountSynchronizer;

	@Autowired
	private OktaService _oktaService;

	@Autowired
	private OrganizationService _organizationService;

	@Autowired
	private OrganizationSynchronizer _organizationSynchronizer;

	@Autowired
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;

	@Autowired
	private OrganizationUserAccountSynchronizer
		_organizationUserAccountSynchronizer;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private ProvisioningEmailService _provisioningEmailService;

	@Autowired
	private RoleService _roleService;

	@Autowired
	private SubscriptionEntryService _subscriptionEntryService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}