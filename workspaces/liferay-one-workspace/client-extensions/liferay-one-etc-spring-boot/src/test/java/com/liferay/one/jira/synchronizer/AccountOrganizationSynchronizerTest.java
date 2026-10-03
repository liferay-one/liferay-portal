/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.one.jira.constants.AccountTeamRoleAssignmentConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.util.AQLUtil;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BiPredicate;
import java.util.function.Consumer;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
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

		_accountTeamRoleAssignmentConverter = Mockito.mock(
			AccountTeamRoleAssignmentConverter.class);

		Mockito.when(
			_accountTeamRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		_accountService = Mockito.mock(AccountService.class);
		_organizationService = Mockito.mock(OrganizationService.class);

		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_accountConverter",
			Mockito.mock(AccountConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_accountService",
			_accountService);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_organizationService",
			_organizationService);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer,
			"_accountTeamRoleAssignmentConverter",
			_accountTeamRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
		ReflectionTestUtils.setField(
			_accountOrganizationSynchronizer, "_teamRoleSynchronizer",
			Mockito.mock(TeamRoleSynchronizer.class));
	}

	@Test
	public void testSoftDeleteByAccount() {
		_accountOrganizationSynchronizer.softDeleteByAccount("account-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_accountTeamRoleAssignmentConverter,
			AccountTeamRoleAssignmentConstants.
				ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY,
			"account-erc"
		);
	}

	@Test
	public void testSoftDeleteByOrganization() {
		_accountOrganizationSynchronizer.softDeleteByOrganization(
			"organization-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_accountTeamRoleAssignmentConverter,
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY,
			"organization-erc"
		);
	}

	@Test
	public void testSyncAssignOrganizationMarksAssignmentUndeleted()
		throws Exception {

		_accountOrganizationSynchronizer.syncAssignOrganization(
			_ORGANIZATION_EXTERNAL_KEY, _ACCOUNT_EXTERNAL_KEY);

		Mockito.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq(_ORGANIZATION_EXTERNAL_KEY),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(false), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any(),
			Mockito.isNull()
		);
	}

	@Test
	public void testSyncAssignOrganizationSkipsAssignmentsUpdatedSinceStartDate()
		throws Exception {

		Date startDate = new Date();

		_accountOrganizationSynchronizer.syncAssignOrganization(
			_ORGANIZATION_EXTERNAL_KEY, _ACCOUNT_EXTERNAL_KEY, startDate);

		_assertSkipsAssignmentsUpdatedSinceStartDate(startDate);
	}

	@Test
	public void testSyncAssignOrganizationWaitsForSyncAssignOrganization()
		throws Exception {

		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		Mockito.doAnswer(
			lockSerializationTestHelper.block("upsert")
		).when(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		lockSerializationTestHelper.assertSerialized(
			() -> _accountOrganizationSynchronizer.syncAssignOrganization(
				"organization-erc", "account-erc"),
			() -> _accountOrganizationSynchronizer.syncAssignOrganization(
				"organization-erc", "account-erc"),
			"upsert", "upsert");
	}

	@Test
	public void testSyncOrganizationsAssignsOrganizationsThenUnassignsStaleOrganizations()
		throws Exception {

		AccountOrganizationSynchronizer accountOrganizationSynchronizer =
			Mockito.spy(_accountOrganizationSynchronizer);

		Date startDate = new Date();

		accountOrganizationSynchronizer.syncOrganizations(
			_ACCOUNT_EXTERNAL_KEY, _getOrganizationExternalKeys(), startDate);

		InOrder inOrder = Mockito.inOrder(
			_accountTeamRoleAssignmentConverter,
			accountOrganizationSynchronizer);

		inOrder.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq("organization-erc-1"),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(false), Mockito.any()
		);

		inOrder.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq("organization-erc-2"),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(false), Mockito.any()
		);

		inOrder.verify(
			accountOrganizationSynchronizer
		).syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, _getOrganizationExternalKeys(), startDate
		);
	}

	@Test
	public void testSyncOrganizationsContinuesWhenAssignOrganizationFails()
		throws Exception {

		AccountOrganizationSynchronizer accountOrganizationSynchronizer =
			Mockito.spy(_accountOrganizationSynchronizer);

		Mockito.when(
			_accountTeamRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.eq("organization-erc-1"), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenThrow(
			new RuntimeException("Unable to assign organization")
		);

		Date startDate = new Date();

		accountOrganizationSynchronizer.syncOrganizations(
			_ACCOUNT_EXTERNAL_KEY, _getOrganizationExternalKeys(), startDate);

		Mockito.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq("organization-erc-2"),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(false), Mockito.any()
		);

		Mockito.verify(
			accountOrganizationSynchronizer
		).syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, _getOrganizationExternalKeys(), startDate
		);
	}

	@Test
	public void testSyncOrganizationsSkipsAssignmentsUpdatedSinceStartDate()
		throws Exception {

		Date startDate = new Date();

		_accountOrganizationSynchronizer.syncOrganizations(
			_ACCOUNT_EXTERNAL_KEY,
			Collections.singleton(_ORGANIZATION_EXTERNAL_KEY), startDate);

		_assertSkipsAssignmentsUpdatedSinceStartDate(startDate);
	}

	@Test
	public void testSyncUnassignOrganizationMarksAssignmentDeleted()
		throws Exception {

		_accountOrganizationSynchronizer.syncUnassignOrganization(
			_ORGANIZATION_EXTERNAL_KEY, _ACCOUNT_EXTERNAL_KEY);

		Mockito.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq(_ORGANIZATION_EXTERNAL_KEY),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(true), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any(),
			Mockito.isNull()
		);
	}

	@Test
	public void testSyncUnassignStaleOrganizationsBaseAQL() throws Exception {
		AtomicReference<String> aqlAtomicReference = _captureAQL();

		_accountOrganizationSynchronizer.syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, Collections.emptySet(), new Date());

		Assertions.assertEquals(
			"base AND \"Account External Key\" = \"account-erc\" AND " +
				"\"Deleted\" = false",
			aqlAtomicReference.get());
	}

	@Test
	public void testSyncUnassignStaleOrganizationsKeepsAssignedOrganizations()
		throws Exception {

		Account account = new Account();

		account.setId(7L);

		Mockito.when(
			_accountService.fetchAccountByExternalReferenceCode(
				_ACCOUNT_EXTERNAL_KEY)
		).thenReturn(
			account
		);

		Organization organization = new Organization();

		organization.setExternalReferenceCode(_ORGANIZATION_EXTERNAL_KEY);

		Mockito.when(
			_organizationService.getAccountOrganizations(7L)
		).thenReturn(
			Collections.singletonList(organization)
		);

		JiraAssetObject jiraAssetObject = _mockAssignment();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.singletonList(jiraAssetObject)
		);

		_accountOrganizationSynchronizer.syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, Collections.emptySet(), new Date());

		Mockito.verify(
			_jiraAssetService, Mockito.never()
		).upsert(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSyncUnassignStaleOrganizationsSkipsCaseDifferingCurrentAssignments()
		throws Exception {

		_assertSkipped(StringUtil.toUpperCase(_ORGANIZATION_EXTERNAL_KEY));
	}

	@Test
	public void testSyncUnassignStaleOrganizationsSkipsCurrentAssignments()
		throws Exception {

		_assertSkipped(_ORGANIZATION_EXTERNAL_KEY);
	}

	@Test
	public void testSyncUnassignStaleOrganizationsSkipsFreshAssignments()
		throws Exception {

		JiraAssetObject jiraAssetObject = _mockAssignment();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.singletonList(jiraAssetObject)
		);

		Date startDate = new Date();

		_accountOrganizationSynchronizer.syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, Collections.emptySet(), startDate);

		BiPredicate<JiraAssetObject, JiraAssetObject> biPredicate =
			_captureShouldSkipUpdateBiPredicate();

		JiraAssetObject existingJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			_jiraAssetService.isUpdatedSince(
				_accountTeamRoleAssignmentConverter, startDate,
				existingJiraAssetObject)
		).thenReturn(
			true
		);

		Assertions.assertTrue(
			biPredicate.test(
				existingJiraAssetObject, Mockito.mock(JiraAssetObject.class)));
	}

	@Test
	public void testSyncUnassignStaleOrganizationsSoftDeletesStaleAssignments()
		throws Exception {

		JiraAssetObject jiraAssetObject = _mockAssignment();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.singletonList(jiraAssetObject)
		);

		_accountOrganizationSynchronizer.syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY, Collections.emptySet(), new Date());

		Mockito.verify(
			_accountTeamRoleAssignmentConverter
		).toAssetObject(
			Mockito.any(), Mockito.eq(_ORGANIZATION_EXTERNAL_KEY),
			Mockito.eq(_ACCOUNT_EXTERNAL_KEY), Mockito.eq(true), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any(),
			Mockito.any()
		);
	}

	private void _assertSkipped(String organizationExternalKey) {
		JiraAssetObject jiraAssetObject = _mockAssignment();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.singletonList(jiraAssetObject)
		);

		_accountOrganizationSynchronizer.syncUnassignStaleOrganizations(
			_ACCOUNT_EXTERNAL_KEY,
			Collections.singleton(organizationExternalKey), new Date());

		Mockito.verify(
			_jiraAssetService, Mockito.never()
		).upsert(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	private void _assertSkipsAssignmentsUpdatedSinceStartDate(Date startDate) {
		BiPredicate<JiraAssetObject, JiraAssetObject> biPredicate =
			_captureShouldSkipUpdateBiPredicate();

		JiraAssetObject existingJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Assertions.assertFalse(
			biPredicate.test(
				existingJiraAssetObject, Mockito.mock(JiraAssetObject.class)));

		Mockito.when(
			_jiraAssetService.isUpdatedSince(
				_accountTeamRoleAssignmentConverter, startDate,
				existingJiraAssetObject)
		).thenReturn(
			true
		);

		Assertions.assertTrue(
			biPredicate.test(
				existingJiraAssetObject, Mockito.mock(JiraAssetObject.class)));
	}

	private AtomicReference<String> _captureAQL() {
		AtomicReference<String> aqlAtomicReference = new AtomicReference<>();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				Consumer<AQLUtil.Builder> consumer = invocation.getArgument(1);

				AQLUtil.Builder aqlBuilder = AQLUtil.builder("base");

				consumer.accept(aqlBuilder);

				aqlAtomicReference.set(aqlBuilder.build());

				return Collections.emptyList();
			}
		);

		return aqlAtomicReference;
	}

	private BiPredicate<JiraAssetObject, JiraAssetObject>
		_captureShouldSkipUpdateBiPredicate() {

		ArgumentCaptor<BiPredicate<JiraAssetObject, JiraAssetObject>>
			biPredicateArgumentCaptor = ArgumentCaptor.forClass(
				BiPredicate.class);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any(),
			biPredicateArgumentCaptor.capture()
		);

		return biPredicateArgumentCaptor.getValue();
	}

	private Set<String> _getOrganizationExternalKeys() {
		return new LinkedHashSet<>(
			Arrays.asList("organization-erc-1", "organization-erc-2"));
	}

	private JiraAssetObject _mockAssignment() {
		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY)
		).thenReturn(
			_ORGANIZATION_EXTERNAL_KEY
		);

		return jiraAssetObject;
	}

	private static final String _ACCOUNT_EXTERNAL_KEY = "account-erc";

	private static final String _ORGANIZATION_EXTERNAL_KEY = "organization-erc";

	private AccountOrganizationSynchronizer _accountOrganizationSynchronizer;
	private AccountService _accountService;
	private AccountTeamRoleAssignmentConverter
		_accountTeamRoleAssignmentConverter;
	private JiraAssetService _jiraAssetService;
	private OrganizationService _organizationService;

}