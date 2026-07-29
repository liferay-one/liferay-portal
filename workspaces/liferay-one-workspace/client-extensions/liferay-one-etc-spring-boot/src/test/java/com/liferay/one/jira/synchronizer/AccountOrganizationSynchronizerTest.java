/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.util.JiraSyncLock;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class AccountOrganizationSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountOrganizationSynchronizer =
			new AccountOrganizationSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		AccountTeamRoleAssignmentConverter accountTeamRoleAssignmentConverter =
			Mockito.mock(AccountTeamRoleAssignmentConverter.class);

		Mockito.when(
			accountTeamRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_accountConverter",
			Mockito.mock(AccountConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer,
			"_accountTeamRoleAssignmentConverter",
			accountTeamRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_jiraSyncLock",
			new JiraSyncLock());
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamRoleSynchronizer",
			Mockito.mock(TeamRoleSynchronizer.class));
	}

	@Test
	public void testSyncAssignOrganizationSerializesPerAccount()
		throws Exception {

		List<String> events = Collections.synchronizedList(new ArrayList<>());
		CountDownLatch firstUpsertEnteredLatch = new CountDownLatch(1);
		AtomicInteger invocationCount = new AtomicInteger();
		CountDownLatch releaseFirstUpsertLatch = new CountDownLatch(1);

		Mockito.doAnswer(
			invocation -> {
				if (invocationCount.incrementAndGet() == 1) {
					firstUpsertEnteredLatch.countDown();

					releaseFirstUpsertLatch.await(10, TimeUnit.SECONDS);
				}

				events.add("upsert");

				return null;
			}
		).when(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any()
		);

		Thread firstThread = new Thread(
			() -> {
				try {
					_accountOrganizationSynchronizer.syncAssignOrganization(
						"organization-erc", "account-erc");
				}
				catch (Exception exception) {
					Assertions.fail(exception);
				}
			});

		firstThread.start();

		Assertions.assertTrue(
			firstUpsertEnteredLatch.await(10, TimeUnit.SECONDS));

		Thread secondThread = new Thread(
			() -> {
				try {
					_accountOrganizationSynchronizer.syncAssignOrganization(
						"organization-erc", "account-erc");
				}
				catch (Exception exception) {
					Assertions.fail(exception);
				}
			});

		secondThread.start();

		secondThread.join(200);

		Assertions.assertEquals(Collections.emptyList(), events);

		releaseFirstUpsertLatch.countDown();

		firstThread.join(10000);
		secondThread.join(10000);

		Assertions.assertEquals(Arrays.asList("upsert", "upsert"), events);
	}

	private AccountOrganizationSynchronizer _accountOrganizationSynchronizer;
	private JiraAssetService _jiraAssetService;

}