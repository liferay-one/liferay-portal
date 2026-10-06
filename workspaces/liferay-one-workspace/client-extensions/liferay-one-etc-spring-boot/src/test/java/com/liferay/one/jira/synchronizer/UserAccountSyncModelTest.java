/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.PropertyService;

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
		_projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);
		_propertyService = Mockito.mock(PropertyService.class);

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(
			"test-account-external-reference-code");
		accountBrief.setId(1L);

		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
		userAccount.setExternalReferenceCode("test-external-reference-code");
		userAccount.setId(1L);

		_userAccountSyncModel = new UserAccountSyncModel(
			Mockito.mock(ExternalLinkConverter.class),
			_projectMembershipService, _propertyService, userAccount);
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
	public void testGetExternalLinkPropertiesWhenPropertyFails()
		throws Exception {

		Mockito.when(
			_propertyService.getUserAccountProperties(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_userAccountSyncModel.getExternalLinkProperties());
	}

	private ProjectMembershipService _projectMembershipService;
	private PropertyService _propertyService;
	private UserAccountSyncModel _userAccountSyncModel;

}