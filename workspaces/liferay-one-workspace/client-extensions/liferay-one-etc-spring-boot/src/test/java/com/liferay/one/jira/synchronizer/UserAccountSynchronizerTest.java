/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.EntitlementConverter;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.converter.PhoneConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.util.JiraSyncLock;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.PropertyService;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class UserAccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_userAccountSynchronizer = new UserAccountSynchronizer();

		_contactConverter = Mockito.mock(ContactConverter.class);
		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		PropertyService propertyService = Mockito.mock(PropertyService.class);

		Mockito.when(
			propertyService.getUserAccountProperties(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_contactConverter.toAssetObject(Mockito.any(UserAccount.class))
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_accountConverter",
			Mockito.mock(AccountConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_accountUserAccountRoleSynchronizer",
			Mockito.mock(AccountUserAccountRoleSynchronizer.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_contactConverter", _contactConverter);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_contactRoleConverter",
			Mockito.mock(ContactRoleConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_entitlementConverter",
			Mockito.mock(EntitlementConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_entitlementService",
			Mockito.mock(EntitlementService.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_externalLinkConverter",
			Mockito.mock(ExternalLinkConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_jiraAssetService", _jiraAssetService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_jiraSyncLock", new JiraSyncLock());
		ReflectionTestUtils.setField(
			_userAccountSynchronizer,
			"_organizationUserAccountRoleSynchronizer",
			Mockito.mock(OrganizationUserAccountRoleSynchronizer.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_phoneConverter",
			Mockito.mock(PhoneConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_propertyService", propertyService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
	}

	@Test
	public void testDeleteUserAccountWaitsForSyncUserAccount()
		throws Exception {

		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		Mockito.doAnswer(
			lockSerializationTestHelper.block("upsert")
		).when(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any()
		);

		Mockito.doAnswer(
			lockSerializationTestHelper.record("delete")
		).when(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.any()
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		userAccount.setId(1L);

		lockSerializationTestHelper.assertSerialized(
			() -> _userAccountSynchronizer.syncUserAccount(userAccount),
			() -> _userAccountSynchronizer.deleteUserAccount(
				_EXTERNAL_REFERENCE_CODE),
			"upsert", "delete");
	}

	private static final String _EXTERNAL_REFERENCE_CODE =
		"test-external-reference-code";

	private ContactConverter _contactConverter;
	private JiraAssetService _jiraAssetService;
	private UserAccountSynchronizer _userAccountSynchronizer;

}