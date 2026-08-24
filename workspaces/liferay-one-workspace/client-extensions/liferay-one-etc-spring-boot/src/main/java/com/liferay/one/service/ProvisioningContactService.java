/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

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
						salesforceProjectContactRole.getEmailAddress());

				_log.error(
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

			try {
				_oktaService.createContact(
					emailAddress, salesforceProjectContactRole.getFirstName(),
					null, salesforceProjectContactRole.getLastName());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to create Okta contact " + emailAddress, exception);
			}
		}

		if (_userAccountService.hasAccountUserAccount(
				account.getId(), userAccount.getId())) {

			return;
		}

		boolean hasUserAccounts = _userAccountService.hasUserAccounts(
			account.getId());

		AccountRole accountRole = _accountRoleService.fetchAccountRoleByName(
			salesforceProjectContactRole.getContactRole());

		if (accountRole == null) {
			_addWarning(
				warningMessages,
				"Unable to find account role " +
					salesforceProjectContactRole.getContactRole());

			_accountService.addAccountUserAccount(
				account.getId(), userAccount.getId());
		}
		else {
			_accountService.addAccountUserAccount(
				account.getId(), accountRole.getId(), userAccount.getId());
		}

		if (!hasUserAccounts && !hasDesignatedAdministrator) {
			AccountRole administratorAccountRole =
				_accountRoleService.fetchAccountRoleByName(
					RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

			if (administratorAccountRole != null) {
				_accountService.addAccountUserAccountRole(
					account.getId(), administratorAccountRole.getId(),
					userAccount.getId());
			}
			else {
				_addWarning(
					warningMessages,
					"Unable to find account role " +
						RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);
			}
		}

		if (accountRole != null) {
			try {
				_provisioningAssignmentService.assignAccountRole(
					account, userAccount.getId(),
					salesforceProjectContactRole.getContactRole());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to assign provisioning side effects for " +
						emailAddress,
					exception);
			}
		}

		if (salesforceProject != null) {
			_projectMembershipService.addProjectMembership(
				salesforceProject.getId(), userAccount.getId());
		}

		userIds.add(userAccount.getId());
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage);
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

	private static final Log _log = LogFactory.getLog(
		ProvisioningContactService.class);

	@Autowired
	private AccountRoleService _accountRoleService;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private EmailAddressValidatorService _emailAddressValidatorService;

	@Autowired
	private OktaService _oktaService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProvisioningAssignmentService _provisioningAssignmentService;

	@Autowired
	private UserAccountService _userAccountService;

}