/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.AccountRoleResource;

import java.util.Arrays;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-ACCOUNTROLESERVICE] AccountRoleService")
public class AccountRoleServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		AccountRoleResource.Builder builder = Mockito.mock(
			AccountRoleResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_accountRoleResource
		);

		_accountRoleResourceMockedStatic = Mockito.mockStatic(
			AccountRoleResource.class);

		_accountRoleResourceMockedStatic.when(
			AccountRoleResource::builder
		).thenReturn(
			builder
		);

		Page<AccountRole> page = Mockito.mock(Page.class);

		Mockito.when(
			page.getItems()
		).thenReturn(
			Arrays.asList(
				_createAccountRole("ROLE_ADMIN", 1L, "Account Administrator"),
				_createAccountRole("ROLE_MEMBER", 2L, "Account Member"))
		);

		Mockito.when(
			_accountRoleResource.getAccountAccountRolesPage(
				ArgumentMatchers.eq(0L), ArgumentMatchers.isNull(),
				ArgumentMatchers.isNull(),
				ArgumentMatchers.any(Pagination.class),
				ArgumentMatchers.isNull())
		).thenReturn(
			page
		);
	}

	@AfterEach
	public void tearDown() {
		_accountRoleResourceMockedStatic.close();
	}

	@Test
	public void testFetchAccountRole() throws Exception {
		AccountRole accountRole = _accountRoleService.fetchAccountRole(2L);

		Assertions.assertEquals("Account Member", accountRole.getName());

		Assertions.assertNull(_accountRoleService.fetchAccountRole(3L));
	}

	@Test
	public void testFetchAccountRoleByExternalReferenceCode() throws Exception {
		AccountRole accountRole =
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"ROLE_ADMIN");

		Assertions.assertEquals(Long.valueOf(1L), accountRole.getId());

		Assertions.assertNull(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"ROLE_UNKNOWN"));
	}

	@Test
	public void testFetchAccountRoleByName() throws Exception {
		AccountRole accountRole = _accountRoleService.fetchAccountRoleByName(
			"Account Member");

		Assertions.assertEquals(
			"ROLE_MEMBER", accountRole.getExternalReferenceCode());

		Assertions.assertNull(
			_accountRoleService.fetchAccountRoleByName("Account Owner"));
	}

	@Test
	public void testGetAccountRolesReturnsAMutableCopy() throws Exception {
		Assertions.assertEquals(
			2,
			_accountRoleService.getAccountRoles(
			).size());

		_accountRoleService.getAccountRoles(
		).clear();

		Assertions.assertEquals(
			2,
			_accountRoleService.getAccountRoles(
			).size());
	}

	private AccountRole _createAccountRole(
		String externalReferenceCode, long id, String name) {

		AccountRole accountRole = new AccountRole();

		accountRole.setExternalReferenceCode(externalReferenceCode);
		accountRole.setId(id);
		accountRole.setName(name);

		return accountRole;
	}

	private final AccountRoleResource _accountRoleResource = Mockito.mock(
		AccountRoleResource.class);
	private MockedStatic<AccountRoleResource> _accountRoleResourceMockedStatic;

	private final AccountRoleService _accountRoleService =
		new AccountRoleService() {

			@Override
			protected String getAuthorization() {
				return "Bearer test";
			}

			@Override
			protected String getDXPEndpointAddress() {
				return "localhost:8080";
			}

		};

}