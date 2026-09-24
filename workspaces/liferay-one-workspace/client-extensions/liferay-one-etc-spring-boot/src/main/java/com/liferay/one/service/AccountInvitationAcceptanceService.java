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
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class AccountInvitationAcceptanceService {

	public void provisionAccountInvitation(AccountInvitation accountInvitation)
		throws Exception {

		List<AccountRole> accountRoles = new ArrayList<>();

		for (String roleExternalReferenceCode :
				accountInvitation.getRoleExternalReferenceCodes()) {

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

		String projectExternalReferenceCode =
			accountInvitation.getProjectExternalReferenceCode();

		if (Validator.isNull(projectExternalReferenceCode)) {
			return;
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project != null) {
			_userAssignmentService.assignProjectRole(
				project,
				accountInvitation.getProjectRoleExternalReferenceCode(),
				userId);
		}
	}

	@Autowired
	private AccountRoleService _accountRoleService;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAssignmentService _userAssignmentService;

}