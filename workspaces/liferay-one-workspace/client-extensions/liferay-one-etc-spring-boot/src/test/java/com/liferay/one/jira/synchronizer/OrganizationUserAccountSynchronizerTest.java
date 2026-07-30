/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class OrganizationUserAccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_organizationUserAccountSynchronizer =
			new OrganizationUserAccountSynchronizer();

		_organizationSynchronizer = Mockito.mock(
			OrganizationSynchronizer.class);
		_userAccountSynchronizer = Mockito.mock(UserAccountSynchronizer.class);

		ReflectionTestUtils.setField(
			_organizationUserAccountSynchronizer, "_organizationSynchronizer",
			_organizationSynchronizer);
		ReflectionTestUtils.setField(
			_organizationUserAccountSynchronizer, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testSyncOrganizationUserAccountMembershipSyncsBothSides()
		throws Exception {

		Organization organization = new Organization();
		UserAccount userAccount = new UserAccount();

		_organizationUserAccountSynchronizer.
			syncOrganizationUserAccountMembership(organization, userAccount);

		Mockito.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			organization
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			userAccount
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			userAccount
		);
	}

	@Test
	public void testSyncOrganizationUserAccountMembershipSyncsPastFailures()
		throws Exception {

		Mockito.doThrow(
			new RuntimeException("expected")
		).when(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			Mockito.any()
		);

		UserAccount userAccount = new UserAccount();

		_organizationUserAccountSynchronizer.
			syncOrganizationUserAccountMembership(
				new Organization(), userAccount);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			userAccount
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			userAccount
		);
	}

	private OrganizationSynchronizer _organizationSynchronizer;
	private OrganizationUserAccountSynchronizer
		_organizationUserAccountSynchronizer;
	private UserAccountSynchronizer _userAccountSynchronizer;

}