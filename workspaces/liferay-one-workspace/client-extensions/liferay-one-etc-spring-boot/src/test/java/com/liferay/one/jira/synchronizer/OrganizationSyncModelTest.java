/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UserAccountService;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SYNC-ORGANIZATIONSYNCMODEL] OrganizationSyncModel")
public class OrganizationSyncModelTest {

	@BeforeEach
	public void setUp() {
		_propertyService = Mockito.mock(PropertyService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		Organization organization = new Organization();

		organization.setExternalReferenceCode("test-external-reference-code");
		organization.setId("1");

		_organizationSyncModel = new OrganizationSyncModel(
			Mockito.mock(ExternalLinkConverter.class), organization,
			_propertyService, _userAccountService);
	}

	@Test
	public void testGetExternalLinkPropertiesWhenPropertyFails()
		throws Exception {

		Mockito.when(
			_propertyService.getOrganizationProperties(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_organizationSyncModel.getExternalLinkProperties());
	}

	@Test
	public void testGetOrganizationUserAccountsWhenUserAccountFails()
		throws Exception {

		Mockito.when(
			_userAccountService.getOrganizationUserAccounts(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_organizationSyncModel.getOrganizationUserAccounts());
	}

	private OrganizationSyncModel _organizationSyncModel;
	private PropertyService _propertyService;
	private UserAccountService _userAccountService;

}