/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Phone;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccountContactInformation;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.util.MemoizedValue;
import com.liferay.portal.kernel.util.ListUtil;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Drew Brokke
 */
public class UserAccountSyncModel {

	public UserAccountSyncModel(
		ProjectMembershipService projectMembershipService,
		UserAccount userAccount) {

		_projectMembershipService = projectMembershipService;
		_userAccount = userAccount;

		_accountBriefs = ListUtil.fromArray(userAccount.getAccountBriefs());

		String externalReferenceCode = getExternalReferenceCode();

		_accountExternalReferenceCodes = new MemoizedValue<>(
			"accounts for user account " + externalReferenceCode, _log,
			this::_toAccountExternalReferenceCodes);

		_organizationBriefs = ListUtil.fromArray(
			userAccount.getOrganizationBriefs());
		_roleBriefs = _toRoleBriefs();
		_telephones = _toTelephones();
	}

	public List<AccountBrief> getAccountBriefs() {
		return _accountBriefs;
	}

	public List<String> getAccountExternalReferenceCodes() {
		return _accountExternalReferenceCodes.get();
	}

	public String getExternalReferenceCode() {
		return _userAccount.getExternalReferenceCode();
	}

	public List<OrganizationBrief> getOrganizationBriefs() {
		return _organizationBriefs;
	}

	public List<RoleBrief> getRoleBriefs() {
		return _roleBriefs;
	}

	public List<Phone> getTelephones() {
		return _telephones;
	}

	public UserAccount getUserAccount() {
		return _userAccount;
	}

	private List<String> _toAccountExternalReferenceCodes() throws Exception {
		List<String> accountExternalReferenceCodes = new ArrayList<>();

		for (AccountBrief accountBrief : _accountBriefs) {
			accountExternalReferenceCodes.add(
				accountBrief.getExternalReferenceCode());
		}

		List<ProjectMembership> projectMemberships =
			_projectMembershipService.getProjectMembershipsByUserId(
				_userAccount.getId());

		for (ProjectMembership projectMembership : projectMemberships) {
			accountExternalReferenceCodes.add(
				projectMembership.getProjectExternalReferenceCode());
		}

		return accountExternalReferenceCodes;
	}

	private List<RoleBrief> _toRoleBriefs() {
		List<RoleBrief> roleBriefs = new ArrayList<>();

		for (AccountBrief accountBrief : _accountBriefs) {
			RoleBrief[] accountRoleBriefs = accountBrief.getRoleBriefs();

			if (accountRoleBriefs == null) {
				continue;
			}

			Collections.addAll(roleBriefs, accountRoleBriefs);
		}

		for (OrganizationBrief organizationBrief : _organizationBriefs) {
			RoleBrief[] organizationRoleBriefs =
				organizationBrief.getRoleBriefs();

			if (organizationRoleBriefs == null) {
				continue;
			}

			Collections.addAll(roleBriefs, organizationRoleBriefs);
		}

		return roleBriefs;
	}

	private List<Phone> _toTelephones() {
		UserAccountContactInformation userAccountContactInformation =
			_userAccount.getUserAccountContactInformation();

		if (userAccountContactInformation == null) {
			return Collections.emptyList();
		}

		return ListUtil.fromArray(
			userAccountContactInformation.getTelephones());
	}

	private static final Log _log = LogFactory.getLog(
		UserAccountSyncModel.class);

	private final List<AccountBrief> _accountBriefs;
	private final MemoizedValue<List<String>> _accountExternalReferenceCodes;
	private final List<OrganizationBrief> _organizationBriefs;
	private final ProjectMembershipService _projectMembershipService;
	private final List<RoleBrief> _roleBriefs;
	private final List<Phone> _telephones;
	private final UserAccount _userAccount;

}