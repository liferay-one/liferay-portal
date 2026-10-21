/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
public class ProvisioningContactService {

	public List<Long> addProjectContacts(
		Account account,
		List<SalesforceProjectContactRole> salesforceProjectContactRoles,
		SalesforceProject salesforceProject, List<String> warningMessages) {

		List<Long> userIds = new ArrayList<>();

		boolean hasDesignatedAdministrator = _hasDesignatedAdministrator(
			salesforceProjectContactRoles);

		for (SalesforceProjectContactRole salesforceProjectContactRole :
				salesforceProjectContactRoles) {

			try {
				_addProjectContact(
					account, hasDesignatedAdministrator,
					salesforceProjectContactRole, salesforceProject, userIds,
					warningMessages);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to process project contact " +
						salesforceProjectContactRole.getEmailAddress(),
					exception);
			}
		}

		return userIds;
	}

	private void _addProjectContact(
			Account account, boolean hasDesignatedAdministrator,
			SalesforceProjectContactRole salesforceProjectContactRole,
			SalesforceProject salesforceProject, List<Long> userIds,
			List<String> warningMessages)
		throws Exception {

		String emailAddress = salesforceProjectContactRole.getEmailAddress();

		if (Validator.isNull(emailAddress) ||
			_emailAddressValidatorService.isLiferayDomain(emailAddress)) {

			return;
		}

		UserAccount userAccount =
			_userAccountService.fetchUserAccountByEmailAddress(emailAddress);

		if (userAccount == null) {
			userAccount = _userAccountService.addUserAccount(
				emailAddress, salesforceProjectContactRole.getLastName(),
				salesforceProjectContactRole.getFirstName());
		}

		String contactRoleExternalReferenceCode =
			_contactRoleExternalReferenceCodes.get(
				salesforceProjectContactRole.getContactRole());
		long userId = userAccount.getId();

		if (_userAccountService.hasAccountUserAccount(
				account.getId(), userId)) {

			if (contactRoleExternalReferenceCode != null) {
				_assignProjectRoles(
					contactRoleExternalReferenceCode, salesforceProject, userId,
					warningMessages);
			}

			return;
		}

		boolean hasUserAccounts = _userAccountService.hasUserAccounts(
			account.getId());

		_userAssignmentService.assignAccount(account, userId);

		if (contactRoleExternalReferenceCode == null) {
			AccountRole accountRole =
				_accountRoleService.fetchAccountRoleByName(
					salesforceProjectContactRole.getContactRole());

			if (accountRole != null) {
				_userAssignmentService.assignAccountRole(
					account, accountRole, userId);
			}
			else {
				_addWarning(
					warningMessages,
					"Unable to find account role " +
						salesforceProjectContactRole.getContactRole(),
					null);
			}
		}

		if (!hasUserAccounts && !hasDesignatedAdministrator) {
			AccountRole administratorAccountRole =
				_accountRoleService.fetchAccountRoleByName(
					RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

			if (administratorAccountRole != null) {
				_userAssignmentService.assignAccountRole(
					account, administratorAccountRole, userId);
			}
			else {
				_addWarning(
					warningMessages,
					"Unable to find account role " +
						RoleConstants.NAME_ACCOUNT_ADMINISTRATOR,
					null);
			}
		}

		_assignProjectRoles(
			contactRoleExternalReferenceCode, salesforceProject, userId,
			warningMessages);

		userIds.add(userId);
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage,
		Exception exception) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage, exception);
		}
	}

	private void _assignProjectRoles(
			String contactRoleExternalReferenceCode,
			SalesforceProject salesforceProject, long userId,
			List<String> warningMessages)
		throws Exception {

		Project project = null;

		if (salesforceProject != null) {
			project = _projectService.fetchProject(salesforceProject.getId());
		}

		if (project == null) {
			if (contactRoleExternalReferenceCode != null) {
				_addWarning(
					warningMessages,
					StringBundler.concat(
						"Unable to assign contact role ",
						contactRoleExternalReferenceCode, " to user ", userId,
						" without a project"),
					null);
			}

			return;
		}

		if (!_hasProjectRole(
				_projectMembershipService.getProjectMemberships(
					project.getExternalReferenceCode(), userId))) {

			_userAssignmentService.assignProjectRole(
				project, RoleConstants.ERC_PROJECT_USER, userId);
		}

		if (contactRoleExternalReferenceCode != null) {
			_userAssignmentService.assignProjectRole(
				project, contactRoleExternalReferenceCode, userId);
		}
	}

	private boolean _hasDesignatedAdministrator(
		List<SalesforceProjectContactRole> salesforceProjectContactRoles) {

		for (SalesforceProjectContactRole salesforceProjectContactRole :
				salesforceProjectContactRoles) {

			String emailAddress =
				salesforceProjectContactRole.getEmailAddress();

			if (Validator.isNull(emailAddress) ||
				_emailAddressValidatorService.isLiferayDomain(emailAddress)) {

				continue;
			}

			if (RoleConstants.NAME_ACCOUNT_ADMINISTRATOR.equals(
					salesforceProjectContactRole.getContactRole())) {

				return true;
			}
		}

		return false;
	}

	private boolean _hasProjectRole(
		List<ProjectMembership> projectMemberships) {

		for (ProjectMembership projectMembership : projectMemberships) {
			if (RoleConstants.ercsSupportProject.contains(
					projectMembership.getRoleExternalReferenceCode())) {

				return true;
			}
		}

		return false;
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningContactService.class);

	private static final Map<String, String>
		_contactRoleExternalReferenceCodes = Map.of(
			RoleConstants.NAME_SECURITY_INCIDENT_CONTACT,
			RoleConstants.ERC_SECURITY_INCIDENT_CONTACT);

	@Autowired
	private AccountRoleService _accountRoleService;

	@Autowired
	private EmailAddressValidatorService _emailAddressValidatorService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAssignmentService _userAssignmentService;

}