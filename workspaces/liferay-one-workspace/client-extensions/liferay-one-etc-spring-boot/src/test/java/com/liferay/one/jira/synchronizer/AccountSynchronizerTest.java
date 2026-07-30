/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.jira.constants.AccountConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.EntitlementConverter;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.converter.PostalAddressConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.jira.util.JiraSyncLock;
import com.liferay.one.model.AccountSupportInfo;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UserAccountService;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class AccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountSynchronizer = new AccountSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		_jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		AccountConverter accountConverter = Mockito.mock(
			AccountConverter.class);

		Mockito.when(
			accountConverter.toAssetObject(
				Mockito.any(Account.class), Mockito.any(), Mockito.any())
		).thenReturn(
			_jiraAssetObject
		);

		CommerceOrderService commerceOrderService = Mockito.mock(
			CommerceOrderService.class);

		Mockito.when(
			commerceOrderService.getAccountSupportInfo(
				Mockito.anyLong(), Mockito.any())
		).thenReturn(
			Mockito.mock(AccountSupportInfo.class)
		);

		JiraBusinessEventService jiraBusinessEventService = Mockito.mock(
			JiraBusinessEventService.class);

		Mockito.when(
			jiraBusinessEventService.getJiraBusinessEvents(Mockito.any())
		).thenReturn(
			Collections.emptyList()
		);

		OrganizationService organizationService = Mockito.mock(
			OrganizationService.class);

		Mockito.when(
			organizationService.getAccountOrganizations(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		ProjectService projectService = Mockito.mock(ProjectService.class);

		Mockito.when(
			projectService.getProjects(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		PropertyService propertyService = Mockito.mock(PropertyService.class);

		Mockito.when(
			propertyService.getAccountProperties(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountConverter", accountConverter);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountOrganizationSynchronizer",
			Mockito.mock(AccountOrganizationSynchronizer.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountUserAccountRoleSynchronizer",
			Mockito.mock(AccountUserAccountRoleSynchronizer.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_commerceOrderService",
			commerceOrderService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_contactConverter",
			Mockito.mock(ContactConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_entitlementConverter",
			Mockito.mock(EntitlementConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_entitlementService",
			Mockito.mock(EntitlementService.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_externalLinkConverter",
			Mockito.mock(ExternalLinkConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_jiraAssetService", _jiraAssetService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_jiraBusinessEventService",
			jiraBusinessEventService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_jiraSyncLock", new JiraSyncLock());
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_organizationService", organizationService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_postalAddressConverter",
			Mockito.mock(PostalAddressConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_projectService", projectService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_propertyService", propertyService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_userAccountService", userAccountService);
	}

	@Test
	public void testDeleteAccountWaitsForSyncAccount() throws Exception {
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

		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(1L);
		account.setName("Test Account");

		lockSerializationTestHelper.assertSerialized(
			() -> _accountSynchronizer.syncAccount(account),
			() -> _accountSynchronizer.deleteAccount(_EXTERNAL_REFERENCE_CODE),
			"upsert", "delete");
	}

	@Test
	public void testSyncAccountUserAccountsUpsertsUserAccountReferences()
		throws Exception {

		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(1L);
		account.setName("Test Account");

		_accountSynchronizer.syncAccountUserAccounts(account);

		Mockito.verify(
			_jiraAssetObject
		).setAttributeValue(
			Mockito.eq(AccountConstants.ATTRIBUTE_NAME_CUSTOMER_CONTACTS),
			Mockito.any()
		);

		Mockito.verify(
			_jiraAssetObject
		).setAttributeValue(
			Mockito.eq(AccountConstants.ATTRIBUTE_NAME_WORKER_CONTACTS),
			Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.eq(_jiraAssetObject)
		);
	}

	private static final String _EXTERNAL_REFERENCE_CODE =
		"test-external-reference-code";

	private AccountSynchronizer _accountSynchronizer;
	private JiraAssetObject _jiraAssetObject;
	private JiraAssetService _jiraAssetService;

}