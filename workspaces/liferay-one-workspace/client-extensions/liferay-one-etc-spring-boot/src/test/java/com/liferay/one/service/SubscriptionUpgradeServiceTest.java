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

import java.time.Instant;

import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName("[SVC-SUBSCRIPTIONUPGRADESERVICE] SubscriptionUpgradeService")
public class SubscriptionUpgradeServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_subscriptionUpgradeService, "_accountPermission",
			_accountPermission);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeService, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeService, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_subscriptionUpgradeService, "_subscriptionUpgradeCheckers",
			List.of(
				_subscriptionUpgradeChecker1, _subscriptionUpgradeChecker2));

		_userAccount.setId(_USER_ID);

		Mockito.when(
			_projectService.getProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
				).put(
					"r_accountEntryToProject_accountEntryERC",
					_ACCOUNT_EXTERNAL_REFERENCE_CODE
				))
		);

		Mockito.when(
			_entitlementService.getUnexpiredEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_entitlements
		);

		Mockito.when(
			_subscriptionUpgradeChecker1.check(_entitlements)
		).thenReturn(
			_subscriptionUpgrade1
		);

		Mockito.when(
			_subscriptionUpgradeChecker2.check(_entitlements)
		).thenReturn(
			_subscriptionUpgrade2
		);
	}

	@Test
	public void testGetSubscriptionUpgrades() throws Exception {
		_setUpAccountRole(RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		Assertions.assertEquals(
			List.of(_subscriptionUpgrade1, _subscriptionUpgrade2),
			_getSubscriptionUpgrades());
	}

	@Test
	public void testGetSubscriptionUpgradesWithAccountBuyer() throws Exception {
		_setUpAccountRole(RoleConstants.NAME_ACCOUNT_BUYER);

		Assertions.assertEquals(2, _getSubscriptionUpgrades().size());
	}

	@Test
	public void testGetSubscriptionUpgradesWithCheckerException()
		throws Exception {

		_setUpAccountRole(RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		Mockito.when(
			_subscriptionUpgradeChecker1.check(_entitlements)
		).thenThrow(
			new Exception()
		);

		Assertions.assertEquals(
			List.of(_subscriptionUpgrade2), _getSubscriptionUpgrades());
	}

	@Test
	public void testGetSubscriptionUpgradesWithProjectAdmin() throws Exception {
		Mockito.when(
			_projectMembershipService.fetchProjectMembership(
				_PROJECT_EXTERNAL_REFERENCE_CODE,
				RoleConstants.ERC_PROJECT_ADMIN, _USER_ID)
		).thenReturn(
			new ProjectMembership(
				new JSONObject(
				).put(
					"roleExternalReferenceCode", RoleConstants.ERC_PROJECT_ADMIN
				))
		);

		Assertions.assertEquals(2, _getSubscriptionUpgrades().size());
	}

	@Test
	public void testGetSubscriptionUpgradesWithoutRole() throws Exception {
		Mockito.when(
			_accountPermission.containsAccountRole(
				ArgumentMatchers.eq("OTHER_ACCOUNT"),
				ArgumentMatchers.eq(RoleConstants.NAME_ACCOUNT_ADMINISTRATOR),
				ArgumentMatchers.same(_userAccount))
		).thenReturn(
			true
		);

		_setUpAccountRole(RoleConstants.NAME_ACCOUNT_MEMBER);

		Assertions.assertEquals(
			Collections.emptyList(), _getSubscriptionUpgrades());

		Mockito.verifyNoInteractions(_entitlementService);
	}

	private List<SubscriptionUpgrade> _getSubscriptionUpgrades()
		throws Exception {

		return _subscriptionUpgradeService.getSubscriptionUpgrades(
			_PROJECT_EXTERNAL_REFERENCE_CODE, _userAccount);
	}

	private void _setUpAccountRole(String roleName) {
		Mockito.when(
			_accountPermission.containsAccountRole(
				ArgumentMatchers.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE),
				ArgumentMatchers.eq(roleName),
				ArgumentMatchers.same(_userAccount))
		).thenReturn(
			true
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCOUNT";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PROJECT";

	private static final long _USER_ID = 300;

	private final AccountPermission _accountPermission = Mockito.mock(
		AccountPermission.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final List<Entitlement> _entitlements = List.of();
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final SubscriptionUpgrade _subscriptionUpgrade1 =
		new SubscriptionUpgrade(
			Instant.now(), "SKU_ACTIVATE", "ai-hub-studio", "AI Hub Studio",
			"SKU_STUDIO", "ai-hub");
	private final SubscriptionUpgrade _subscriptionUpgrade2 =
		new SubscriptionUpgrade(
			Instant.now(), "SKU_LIFERAY_PLATFORM", "liferay-platform-cmp",
			"CMP", "SKU_CMP", "cmp");
	private final SubscriptionUpgradeChecker _subscriptionUpgradeChecker1 =
		Mockito.mock(SubscriptionUpgradeChecker.class);
	private final SubscriptionUpgradeChecker _subscriptionUpgradeChecker2 =
		Mockito.mock(SubscriptionUpgradeChecker.class);
	private final SubscriptionUpgradeService _subscriptionUpgradeService =
		new SubscriptionUpgradeService();
	private final UserAccount _userAccount = new UserAccount();

}