/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.OrganizationResource;

import java.util.Arrays;
import java.util.List;

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
@DisplayName("[SVC-ORGANIZATIONSERVICE] OrganizationService")
public class OrganizationServiceTest {

	@BeforeEach
	public void setUp() {
		OrganizationResource.Builder builder = Mockito.mock(
			OrganizationResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_organizationResource
		);

		_organizationResourceMockedStatic = Mockito.mockStatic(
			OrganizationResource.class);

		_organizationResourceMockedStatic.when(
			OrganizationResource::builder
		).thenReturn(
			builder
		);

		_builder = builder;
	}

	@AfterEach
	public void tearDown() {
		_organizationResourceMockedStatic.close();
	}

	@Test
	public void testAddOrganizationUserAccountByEmailAddress()
		throws Exception {

		_organizationService.addOrganizationUserAccountByEmailAddress(
			"test@liferay.com", 10L);

		Mockito.verify(
			_organizationResource
		).postUserAccountByEmailAddress(
			"10", "test@liferay.com"
		);
	}

	@Test
	public void testGetAccountOrganizationsStopsOnSinglePage()
		throws Exception {

		_whenGetAccountOrganizationsPage(1, _createPage(0));

		Assertions.assertTrue(
			_organizationService.getAccountOrganizations(
				5L
			).isEmpty());

		Mockito.verify(
			_organizationResource, Mockito.times(1)
		).getAccountOrganizationsPage(
			ArgumentMatchers.eq(5L), ArgumentMatchers.isNull(),
			ArgumentMatchers.isNull(), ArgumentMatchers.any(Pagination.class),
			ArgumentMatchers.isNull()
		);
	}

	@Test
	public void testGetAccountOrganizationsWalksEveryPage() throws Exception {
		_whenGetAccountOrganizationsPage(
			1,
			_createPage(2, _createOrganization("A"), _createOrganization("B")));
		_whenGetAccountOrganizationsPage(
			2, _createPage(2, _createOrganization("C")));

		List<Organization> organizations =
			_organizationService.getAccountOrganizations(5L);

		Assertions.assertEquals(3, organizations.size());
		Assertions.assertEquals(
			"C",
			organizations.get(
				2
			).getName());

		Mockito.verify(
			_organizationResource, Mockito.times(2)
		).getAccountOrganizationsPage(
			ArgumentMatchers.eq(5L), ArgumentMatchers.isNull(),
			ArgumentMatchers.isNull(), ArgumentMatchers.any(Pagination.class),
			ArgumentMatchers.isNull()
		);
	}

	@Test
	public void testGetOrganizationRequestsAccountBriefs() throws Exception {
		Organization organization = _createOrganization("A");

		Mockito.when(
			_organizationResource.getOrganization("10")
		).thenReturn(
			organization
		);

		Assertions.assertSame(
			organization, _organizationService.getOrganization(10L));

		Mockito.verify(
			_builder
		).parameters(
			"nestedFields", "accountBriefs"
		);
	}

	@Test
	public void testRemoveOrganizationUserAccountByEmailAddress()
		throws Exception {

		_organizationService.removeOrganizationUserAccountByEmailAddress(
			"test@liferay.com", 10L);

		Mockito.verify(
			_organizationResource
		).deleteUserAccountByEmailAddress(
			"10", "test@liferay.com"
		);
	}

	private Organization _createOrganization(String name) {
		Organization organization = new Organization();

		organization.setName(name);

		return organization;
	}

	private Page<Organization> _createPage(
		long lastPage, Organization... organizations) {

		Page<Organization> page = Mockito.mock(Page.class);

		Mockito.when(
			page.getItems()
		).thenReturn(
			Arrays.asList(organizations)
		);

		Mockito.when(
			page.getLastPage()
		).thenReturn(
			lastPage
		);

		return page;
	}

	private void _whenGetAccountOrganizationsPage(
			int pageNumber, Page<Organization> page)
		throws Exception {

		Mockito.when(
			_organizationResource.getAccountOrganizationsPage(
				ArgumentMatchers.anyLong(), ArgumentMatchers.isNull(),
				ArgumentMatchers.isNull(),
				ArgumentMatchers.argThat(
					pagination ->
						(pagination != null) &&
						(pagination.getPage() == pageNumber)),
				ArgumentMatchers.isNull())
		).thenReturn(
			page
		);
	}

	private OrganizationResource.Builder _builder;
	private final OrganizationResource _organizationResource = Mockito.mock(
		OrganizationResource.class);
	private MockedStatic<OrganizationResource>
		_organizationResourceMockedStatic;

	private final OrganizationService _organizationService =
		new OrganizationService() {

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