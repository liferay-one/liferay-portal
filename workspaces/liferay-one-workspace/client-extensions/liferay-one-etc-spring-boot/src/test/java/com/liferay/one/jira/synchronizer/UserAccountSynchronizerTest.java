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
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.PropertyService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Assertions;
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
	public void testDeleteUserAccountWaitsForInFlightSyncUserAccount()
		throws Exception {

		List<String> events = Collections.synchronizedList(new ArrayList<>());
		CountDownLatch releaseSyncLatch = new CountDownLatch(1);
		CountDownLatch syncEnteredLatch = new CountDownLatch(1);

		Mockito.doAnswer(
			invocation -> {
				syncEnteredLatch.countDown();

				releaseSyncLatch.await(10, TimeUnit.SECONDS);

				events.add("upsert");

				return null;
			}
		).when(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any()
		);

		Mockito.doAnswer(
			invocation -> {
				events.add("delete");

				return null;
			}
		).when(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.any()
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		userAccount.setId(1L);

		Thread syncThread = new Thread(
			() -> {
				try {
					_userAccountSynchronizer.syncUserAccount(userAccount);
				}
				catch (Exception exception) {
					Assertions.fail(exception);
				}
			});

		syncThread.start();

		Assertions.assertTrue(syncEnteredLatch.await(10, TimeUnit.SECONDS));

		Thread deleteThread = new Thread(
			() -> _userAccountSynchronizer.deleteUserAccount(
				_EXTERNAL_REFERENCE_CODE));

		deleteThread.start();

		deleteThread.join(200);

		Assertions.assertEquals(Collections.emptyList(), events);

		releaseSyncLatch.countDown();

		syncThread.join(10000);
		deleteThread.join(10000);

		Assertions.assertEquals(Arrays.asList("upsert", "delete"), events);
	}

	private static final String _EXTERNAL_REFERENCE_CODE =
		"test-external-reference-code";

	private ContactConverter _contactConverter;
	private JiraAssetService _jiraAssetService;
	private UserAccountSynchronizer _userAccountSynchronizer;

}