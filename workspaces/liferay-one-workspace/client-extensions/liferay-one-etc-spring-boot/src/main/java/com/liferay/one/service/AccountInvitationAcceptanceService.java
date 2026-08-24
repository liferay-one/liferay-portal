/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.AccountInvitation;
import com.liferay.portal.kernel.util.Validator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class AccountInvitationAcceptanceService {

	public void provisionAccountInvitation(AccountInvitation accountInvitation)
		throws Exception {

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

		_accountService.addAccountUserAccountByEmailAddress(
			account.getId(), emailAddress, null);

		for (String roleExternalReferenceCode :
				accountInvitation.getRoleExternalReferenceCodes()) {

			_accountService.addAccountUserAccountRoleByExternalReferenceCode(
				account.getExternalReferenceCode(), roleExternalReferenceCode,
				userAccount.getEmailAddress());
		}

		if (Validator.isNotNull(
				accountInvitation.getProjectExternalReferenceCode())) {

			_projectMembershipService.addProjectMembership(
				accountInvitation.getProjectExternalReferenceCode(),
				accountInvitation.getProjectRoleExternalReferenceCode(),
				userAccount.getId());
		}
	}

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private UserAccountService _userAccountService;

}