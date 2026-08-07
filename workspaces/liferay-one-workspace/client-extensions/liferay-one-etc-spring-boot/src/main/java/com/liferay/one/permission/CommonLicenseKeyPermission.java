/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.CommonLicenseKeyConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class CommonLicenseKeyPermission {

	public void check(String productFamily, Jwt jwt) throws Exception {
		if (!_contains(productFamily, jwt)) {
			throw new PrincipalException();
		}
	}

	private boolean _contains(String productFamily, Jwt jwt) throws Exception {
		UserAccount userAccount = _userAccountService.getMyUserAccount(jwt);

		if (_hasGlobalRole(userAccount)) {
			return true;
		}

		Set<String> entitlementDefinitionExternalReferenceCodes =
			CommonLicenseKeyConstants.
				getEntitlementDefinitionExternalReferenceCodes(productFamily);

		if (entitlementDefinitionExternalReferenceCodes.isEmpty()) {
			return false;
		}

		Set<Long> accountEntryIds = _getAccountEntryIds(userAccount);

		if (accountEntryIds.isEmpty()) {
			return false;
		}

		List<EntitlementDefinition> entitlementDefinitions =
			_entitlementService.getActiveEntitlementDefinitions(
				accountEntryIds);

		for (EntitlementDefinition entitlementDefinition :
				entitlementDefinitions) {

			if (entitlementDefinitionExternalReferenceCodes.contains(
					entitlementDefinition.getExternalReferenceCode())) {

				return true;
			}
		}

		return false;
	}

	private Set<Long> _getAccountEntryIds(UserAccount userAccount) {
		Set<Long> accountEntryIds = new HashSet<>();

		AccountBrief[] accountBriefs = userAccount.getAccountBriefs();

		if (accountBriefs == null) {
			return accountEntryIds;
		}

		for (AccountBrief accountBrief : accountBriefs) {
			accountEntryIds.add(accountBrief.getId());
		}

		return accountEntryIds;
	}

	private boolean _hasGlobalRole(UserAccount userAccount) {
		RoleBrief[] roleBriefs = userAccount.getRoleBriefs();

		if (roleBriefs == null) {
			return false;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			String name = roleBrief.getName();

			if (StringUtil.equals(name, RoleConstants.NAME_ADMINISTRATOR) ||
				StringUtil.equals(
					name, RoleConstants.NAME_PROVISIONING_ADMINISTRATOR)) {

				return true;
			}
		}

		return false;
	}

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private UserAccountService _userAccountService;

}