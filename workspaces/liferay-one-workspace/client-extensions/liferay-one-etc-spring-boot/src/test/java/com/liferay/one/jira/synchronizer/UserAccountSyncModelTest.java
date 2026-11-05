/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectMembershipService;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SYNC-USERACCOUNTSYNCMODEL] UserAccountSyncModel")
public class UserAccountSyncModelTest {

	@BeforeEach
	public void setUp() {
		_organizationService = Mockito.mock(OrganizationService.class);
		_projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(
			"test-account-external-reference-code");
		accountBrief.setId(1L);

		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
		userAccount.setExternalReferenceCode("test-external-reference-code");
		userAccount.setId(1L);
		userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {
				_createOrganizationBrief(_OKTA_GROUP_ORGANIZATION_ID),
				_createOrganizationBrief(_ORGANIZATION_ID)
			});

		_userAccountSyncModel = new UserAccountSyncModel(
			_organizationService, _projectMembershipService, userAccount);
	}

	@Test
	public void testGetAccountExternalReferenceCodesWhenProjectMembershipFails()
		throws Exception {

		Mockito.when(
			_projectMembershipService.getProjectMembershipsByUserId(
				Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_userAccountSyncModel.getAccountExternalReferenceCodes());
	}

	@Test
	public void testGetJSMOrganizationBriefsExcludesOktaGroupOrganizations()
		throws Exception {

		Mockito.when(
			_organizationService.getOktaGroupIds()
		).thenReturn(
			Collections.singletonMap(
				_OKTA_GROUP_ORGANIZATION_ID, "test-okta-group-id")
		);

		List<OrganizationBrief> organizationBriefs =
			_userAccountSyncModel.getJSMOrganizationBriefs();

		Assertions.assertEquals(1, organizationBriefs.size());

		OrganizationBrief organizationBrief = organizationBriefs.get(0);

		Assertions.assertEquals(
			Long.valueOf(_ORGANIZATION_ID), organizationBrief.getId());
	}

	@Test
	public void testGetJSMOrganizationBriefsWhenOktaGroupIdsFail()
		throws Exception {

		Mockito.when(
			_organizationService.getOktaGroupIds()
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_userAccountSyncModel.getJSMOrganizationBriefs());
	}

	private OrganizationBrief _createOrganizationBrief(long id) {
		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setExternalReferenceCode(
			"test-organization-external-reference-code-" + id);
		organizationBrief.setId(id);

		return organizationBrief;
	}

	private static final long _OKTA_GROUP_ORGANIZATION_ID = 1;

	private static final long _ORGANIZATION_ID = 2;

	private OrganizationService _organizationService;
	private ProjectMembershipService _projectMembershipService;
	private UserAccountSyncModel _userAccountSyncModel;

}