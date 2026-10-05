/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.RoleResource;
import com.liferay.portal.kernel.model.role.RoleConstants;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-ROLESERVICE] RoleService")
public class RoleServiceTest {

	@BeforeEach
	public void setUp() {
		RoleResource.Builder builder = Mockito.mock(
			RoleResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_roleResource
		);

		_roleResourceMockedStatic = Mockito.mockStatic(RoleResource.class);

		_roleResourceMockedStatic.when(
			RoleResource::builder
		).thenReturn(
			builder
		);

		_builder = builder;
	}

	@AfterEach
	public void tearDown() {
		_roleResourceMockedStatic.close();
	}

	@Test
	public void testAddOrganizationUserAccountRole() throws Exception {
		_roleService.addOrganizationUserAccountRole(10L, 20L, 30L);

		Mockito.verify(
			_roleResource
		).postOrganizationRoleUserAccountAssociation(
			20L, 30L, 10L
		);

		Mockito.verify(
			_builder
		).header(
			HttpHeaders.AUTHORIZATION, _AUTHORIZATION
		);
	}

	@Test
	public void testGetAccountRolesFiltersByAccountRoleType() throws Exception {
		_whenGetRolesPage(1, _createPage(1, _createRole("Account Member")));

		List<Role> roles = _roleService.getAccountRoles();

		Assertions.assertEquals(1, roles.size());

		Mockito.verify(
			_roleResource
		).getRolesPage(
			ArgumentMatchers.isNull(),
			ArgumentMatchers.eq(new Integer[] {RoleConstants.TYPE_ACCOUNT}),
			ArgumentMatchers.isNull(), ArgumentMatchers.any(Pagination.class)
		);
	}

	@Test
	public void testGetOrganizationRolesWalksEveryPage() throws Exception {
		_whenGetRolesPage(
			1,
			_createPage(
				2, _createRole("Organization Administrator"),
				_createRole("Organization Owner")));
		_whenGetRolesPage(2, _createPage(2, _createRole("Organization User")));

		List<Role> roles = _roleService.getOrganizationRoles();

		Assertions.assertEquals(
			Arrays.asList(
				"Organization Administrator", "Organization Owner",
				"Organization User"),
			Arrays.asList(
				roles.get(
					0
				).getName(),
				roles.get(
					1
				).getName(),
				roles.get(
					2
				).getName()));

		ArgumentCaptor<Pagination> paginationArgumentCaptor =
			ArgumentCaptor.forClass(Pagination.class);

		Mockito.verify(
			_roleResource, Mockito.times(2)
		).getRolesPage(
			ArgumentMatchers.isNull(),
			ArgumentMatchers.eq(
				new Integer[] {RoleConstants.TYPE_ORGANIZATION}),
			ArgumentMatchers.isNull(), paginationArgumentCaptor.capture()
		);

		List<Pagination> paginations = paginationArgumentCaptor.getAllValues();

		Assertions.assertEquals(
			1,
			paginations.get(
				0
			).getPage());
		Assertions.assertEquals(
			2,
			paginations.get(
				1
			).getPage());
	}

	@Test
	public void testRemoveOrganizationUserAccountRole() throws Exception {
		_roleService.removeOrganizationUserAccountRole(10L, 20L, 30L);

		Mockito.verify(
			_roleResource
		).deleteOrganizationRoleUserAccountAssociation(
			20L, 30L, 10L
		);
	}

	private Page<Role> _createPage(long lastPage, Role... roles) {
		Page<Role> page = Mockito.mock(Page.class);

		Mockito.when(
			page.getItems()
		).thenReturn(
			Arrays.asList(roles)
		);

		Mockito.when(
			page.getLastPage()
		).thenReturn(
			lastPage
		);

		return page;
	}

	private Role _createRole(String name) {
		Role role = new Role();

		role.setName(name);

		return role;
	}

	private void _whenGetRolesPage(int pageNumber, Page<Role> page)
		throws Exception {

		Mockito.when(
			_roleResource.getRolesPage(
				ArgumentMatchers.isNull(), ArgumentMatchers.any(),
				ArgumentMatchers.isNull(),
				ArgumentMatchers.argThat(
					pagination ->
						(pagination != null) &&
						(pagination.getPage() == pageNumber)))
		).thenReturn(
			page
		);
	}

	private static final String _AUTHORIZATION = "Bearer test";

	private RoleResource.Builder _builder;
	private final RoleResource _roleResource = Mockito.mock(RoleResource.class);
	private MockedStatic<RoleResource> _roleResourceMockedStatic;

	private final RoleService _roleService = new RoleService() {

		@Override
		protected String getAuthorization() {
			return _AUTHORIZATION;
		}

		@Override
		protected String getDXPEndpointAddress() {
			return "localhost:8080";
		}

	};

}