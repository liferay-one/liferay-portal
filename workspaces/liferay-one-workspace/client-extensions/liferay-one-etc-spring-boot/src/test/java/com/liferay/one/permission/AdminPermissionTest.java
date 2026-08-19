/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class AdminPermissionTest {

	@Test
	public void testCheckGrantsAdministrator() throws Exception {
		AdminPermission adminPermission = _createAdminPermission(
			RoleConstants.NAME_ADMINISTRATOR);

		adminPermission.check(null);
	}

	@Test
	public void testCheckGrantsProvisioningAdministrator() throws Exception {
		AdminPermission adminPermission = _createAdminPermission(
			RoleConstants.NAME_PROVISIONING_ADMINISTRATOR);

		adminPermission.check(null);
	}

	@Test
	public void testCheckThrowsForAccountAdministrator() throws Exception {
		AdminPermission adminPermission = _createAdminPermission(
			RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		Assertions.assertThrows(
			PrincipalException.class, () -> adminPermission.check(null));
	}

	@Test
	public void testCheckThrowsForUserWithoutRoles() throws Exception {
		AdminPermission adminPermission = _createAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class, () -> adminPermission.check(null));
	}

	private AdminPermission _createAdminPermission(String... roleNames)
		throws Exception {

		AdminPermission adminPermission = new AdminPermission();

		RoleBrief[] roleBriefs = new RoleBrief[roleNames.length];

		for (int i = 0; i < roleNames.length; i++) {
			RoleBrief roleBrief = Mockito.mock(RoleBrief.class);

			Mockito.when(
				roleBrief.getName()
			).thenReturn(
				roleNames[i]
			);

			roleBriefs[i] = roleBrief;
		}

		UserAccount userAccount = Mockito.mock(UserAccount.class);

		Mockito.when(
			userAccount.getRoleBriefs()
		).thenReturn(
			roleBriefs
		);

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
		);

		ReflectionTestUtils.setField(
			adminPermission, "_userAccountService", userAccountService);

		return adminPermission;
	}

}