/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.model.SubscriptionUpgrade;
import com.liferay.one.permission.AccountPermission;
import com.liferay.one.subscription.upgrade.SubscriptionUpgradeChecker;
import com.liferay.petra.string.StringBundler;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Veloso
 */
@Component
public class SubscriptionUpgradeService {

	public List<SubscriptionUpgrade> getSubscriptionUpgrades(
			String projectExternalReferenceCode, UserAccount userAccount)
		throws Exception {

		if (!_hasSubscriptionUpgradeRole(
				projectExternalReferenceCode, userAccount)) {

			return Collections.emptyList();
		}

		List<Entitlement> unexpiredEntitlements =
			_entitlementService.getUnexpiredEntitlements(
				projectExternalReferenceCode);

		List<SubscriptionUpgrade> subscriptionUpgrades = new ArrayList<>();

		for (SubscriptionUpgradeChecker subscriptionUpgradeChecker :
				_subscriptionUpgradeCheckers) {

			try {
				SubscriptionUpgrade subscriptionUpgrade =
					subscriptionUpgradeChecker.check(unexpiredEntitlements);

				if (subscriptionUpgrade != null) {
					subscriptionUpgrades.add(subscriptionUpgrade);
				}
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to check upgrade ",
						subscriptionUpgradeChecker.getKey(), " for project ",
						projectExternalReferenceCode),
					exception);
			}
		}

		return subscriptionUpgrades;
	}

	private boolean _hasSubscriptionUpgradeRole(
			String projectExternalReferenceCode, UserAccount userAccount)
		throws Exception {

		Project project = _projectService.getProject(
			projectExternalReferenceCode);

		for (String roleName : _roleNames) {
			if (_accountPermission.containsAccountRole(
					project.getAccountExternalReferenceCode(), roleName,
					userAccount)) {

				return true;
			}
		}

		ProjectMembership projectMembership =
			_projectMembershipService.fetchProjectMembership(
				projectExternalReferenceCode, RoleConstants.ERC_PROJECT_ADMIN,
				userAccount.getId());

		if (projectMembership != null) {
			return true;
		}

		return false;
	}

	private static final Log _log = LogFactory.getLog(
		SubscriptionUpgradeService.class);

	private static final List<String> _roleNames = List.of(
		RoleConstants.NAME_ACCOUNT_ADMINISTRATOR,
		RoleConstants.NAME_ACCOUNT_BUYER);

	@Autowired
	private AccountPermission _accountPermission;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private List<SubscriptionUpgradeChecker> _subscriptionUpgradeCheckers;

}