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

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeyPermissionTest {

	@Test
	public void testCheckGrantsAccountWithMatchingEntitlement()
		throws Exception {

		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(new String[0], _ACCOUNT_ID),
				"C_ENT_DEF_ENTERPRISE_SEARCH");

		commonLicenseKeyPermission.check(
			CommonLicenseKeyConstants.PRODUCT_FAMILY_ENTERPRISE_SEARCH, null);
	}

	@Test
	public void testCheckGrantsAdministrator() throws Exception {
		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_ADMINISTRATOR}));

		commonLicenseKeyPermission.check(
			CommonLicenseKeyConstants.PRODUCT_FAMILY_ENTERPRISE_SEARCH, null);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getActiveEntitlementDefinitions(
			Mockito.<Collection<Long>>any()
		);
	}

	@Test
	public void testCheckGrantsProvisioningAdministrator() throws Exception {
		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(
					new String[] {
						RoleConstants.NAME_PROVISIONING_ADMINISTRATOR
					}));

		commonLicenseKeyPermission.check(
			CommonLicenseKeyConstants.PRODUCT_FAMILY_COMMERCE, null);
	}

	@Test
	public void testCheckThrowsForLiferayStaff() throws Exception {
		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_LIFERAY_STAFF},
					_ACCOUNT_ID));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> commonLicenseKeyPermission.check(
				CommonLicenseKeyConstants.PRODUCT_FAMILY_ENTERPRISE_SEARCH,
				null));
	}

	@Test
	public void testCheckThrowsForMismatchedProductFamily() throws Exception {
		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(new String[0], _ACCOUNT_ID),
				"C_ENT_DEF_COMMERCE");

		Assertions.assertThrows(
			PrincipalException.class,
			() -> commonLicenseKeyPermission.check(
				CommonLicenseKeyConstants.PRODUCT_FAMILY_ENTERPRISE_SEARCH,
				null));
	}

	@Test
	public void testCheckThrowsForUnknownProductFamily() throws Exception {
		CommonLicenseKeyPermission commonLicenseKeyPermission =
			_createPermission(
				_createUserAccount(new String[0], _ACCOUNT_ID),
				"C_ENT_DEF_ENTERPRISE_SEARCH");

		Assertions.assertThrows(
			PrincipalException.class,
			() -> commonLicenseKeyPermission.check("bogus", null));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getActiveEntitlementDefinitions(
			Mockito.<Collection<Long>>any()
		);
	}

	private CommonLicenseKeyPermission _createPermission(
			UserAccount userAccount,
			String... activeEntitlementDefinitionExternalReferenceCodes)
		throws Exception {

		CommonLicenseKeyPermission commonLicenseKeyPermission =
			new CommonLicenseKeyPermission();

		List<EntitlementDefinition> entitlementDefinitions = new ArrayList<>();

		for (String externalReferenceCode :
				activeEntitlementDefinitionExternalReferenceCodes) {

			EntitlementDefinition entitlementDefinition = Mockito.mock(
				EntitlementDefinition.class);

			Mockito.when(
				entitlementDefinition.getExternalReferenceCode()
			).thenReturn(
				externalReferenceCode
			);

			entitlementDefinitions.add(entitlementDefinition);
		}

		Mockito.when(
			_entitlementService.getActiveEntitlementDefinitions(
				Mockito.<Collection<Long>>any())
		).thenReturn(
			entitlementDefinitions
		);

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
		);

		ReflectionTestUtils.setField(
			commonLicenseKeyPermission, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			commonLicenseKeyPermission, "_userAccountService",
			userAccountService);

		return commonLicenseKeyPermission;
	}

	private UserAccount _createUserAccount(
		String[] roleNames, long... accountIds) {

		UserAccount userAccount = Mockito.mock(UserAccount.class);

		AccountBrief[] accountBriefs = new AccountBrief[accountIds.length];

		for (int i = 0; i < accountIds.length; i++) {
			AccountBrief accountBrief = Mockito.mock(AccountBrief.class);

			Mockito.when(
				accountBrief.getId()
			).thenReturn(
				accountIds[i]
			);

			accountBriefs[i] = accountBrief;
		}

		Mockito.when(
			userAccount.getAccountBriefs()
		).thenReturn(
			accountBriefs
		);

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

		Mockito.when(
			userAccount.getRoleBriefs()
		).thenReturn(
			roleBriefs
		);

		return userAccount;
	}

	private static final long _ACCOUNT_ID = 555L;

	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);

}