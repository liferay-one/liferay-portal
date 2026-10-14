/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Project;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class AccountInvitationAcceptanceService {

	public void provisionAccountInvitation(AccountInvitation accountInvitation)
		throws Exception {

		String projectExternalReferenceCode =
			accountInvitation.getProjectExternalReferenceCode();

		List<String> projectContactRoleExternalReferenceCodes =
			Collections.emptyList();

		if (Validator.isNotNull(projectExternalReferenceCode)) {
			projectContactRoleExternalReferenceCodes =
				_projectContactRoleService.getContactRoleExternalReferenceCodes(
					projectExternalReferenceCode);
		}

		List<AccountRole> accountRoles = new ArrayList<>();
		List<String> contactRoleExternalReferenceCodes = new ArrayList<>();

		for (String roleExternalReferenceCode :
				accountInvitation.getRoleExternalReferenceCodes()) {

			if (projectContactRoleExternalReferenceCodes.contains(
					roleExternalReferenceCode)) {

				contactRoleExternalReferenceCodes.add(
					roleExternalReferenceCode);

				continue;
			}

			AccountRole accountRole =
				_accountRoleService.fetchAccountRoleByExternalReferenceCode(
					roleExternalReferenceCode);

			if (accountRole == null) {
				throw new IllegalArgumentException(
					"Unable to find account role " + roleExternalReferenceCode);
			}

			accountRoles.add(accountRole);
		}

		Account account = _accountService.getAccount(
			accountInvitation.getAccountExternalReferenceCode());

		String emailAddress = accountInvitation.getEmailAddress();

		UserAccount userAccount =
			_userAccountService.fetchUserAccountByEmailAddress(emailAddress);

		if (userAccount == null) {
			userAccount = _userAccountService.addUserAccount(
				emailAddress, accountInvitation.getFamilyName(),
				accountInvitation.getGivenName());
		}

		long userId = userAccount.getId();

		_userAssignmentService.assignAccount(account, userId);

		for (AccountRole accountRole : accountRoles) {
			_userAssignmentService.assignAccountRole(
				account, accountRole, userId);
		}

		if (Validator.isNull(projectExternalReferenceCode)) {
			return;
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to find project ", projectExternalReferenceCode,
						" for account invitation ",
						accountInvitation.getAccountInvitationId()));
			}

			return;
		}

		_userAssignmentService.assignProjectRole(
			project, accountInvitation.getProjectRoleExternalReferenceCode(),
			userId);

		for (String contactRoleExternalReferenceCode :
				contactRoleExternalReferenceCodes) {

			_userAssignmentService.assignProjectRole(
				project, contactRoleExternalReferenceCode, userId);
		}
	}

	private static final Log _log = LogFactory.getLog(
		AccountInvitationAcceptanceService.class);

	@Autowired
	private AccountRoleService _accountRoleService;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ProjectContactRoleService _projectContactRoleService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAssignmentService _userAssignmentService;

}