/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.AccountContactRoleAssignmentConstants;
import com.liferay.one.jira.constants.AccountTeamRoleAssignmentConstants;
import com.liferay.one.jira.constants.TeamContactRoleAssignmentConstants;
import com.liferay.one.jira.converter.AccountContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.TeamContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.converter.TeamRoleConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.jira.util.AQLUtil;

import java.util.Arrays;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.function.Predicate;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class OrphanedAssignmentReconcilerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_orphanedAssignmentReconciler = new OrphanedAssignmentReconciler();

		_accountContactRoleAssignmentConverter = Mockito.mock(
			AccountContactRoleAssignmentConverter.class);
		_accountConverter = Mockito.mock(AccountConverter.class);
		_accountTeamRoleAssignmentConverter = Mockito.mock(
			AccountTeamRoleAssignmentConverter.class);
		_contactConverter = Mockito.mock(ContactConverter.class);
		_contactRoleConverter = Mockito.mock(ContactRoleConverter.class);
		_jiraAssetService = Mockito.mock(JiraAssetService.class);
		_teamContactRoleAssignmentConverter = Mockito.mock(
			TeamContactRoleAssignmentConverter.class);
		_teamConverter = Mockito.mock(TeamConverter.class);
		_teamRoleConverter = Mockito.mock(TeamRoleConverter.class);

		Mockito.when(
			_accountContactRoleAssignmentConverter.getDeletedAttributeName()
		).thenReturn(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED
		);

		Mockito.when(
			_accountTeamRoleAssignmentConverter.getDeletedAttributeName()
		).thenReturn(
			AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED
		);

		Mockito.when(
			_teamContactRoleAssignmentConverter.getDeletedAttributeName()
		).thenReturn(
			TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED
		);

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.emptyList()
		);

		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler,
			"_accountContactRoleAssignmentConverter",
			_accountContactRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_accountConverter",
			_accountConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler,
			"_accountTeamRoleAssignmentConverter",
			_accountTeamRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_contactConverter",
			_contactConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_contactRoleConverter",
			_contactRoleConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler,
			"_teamContactRoleAssignmentConverter",
			_teamContactRoleAssignmentConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_teamConverter", _teamConverter);
		ReflectionTestUtils.setField(
			_orphanedAssignmentReconciler, "_teamRoleConverter",
			_teamRoleConverter);
	}

	@Test
	public void testOnApplicationReadyReconcilesOrphanedAssignments() {
		_orphanedAssignmentReconciler.onApplicationReady();

		Mockito.verify(
			_jiraAssetService, Mockito.times(3)
		).getJiraAssetObjects(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testReconcileOrphanedAssignmentsContinuesAfterTypeFailure() {
		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(
				Mockito.eq(_accountContactRoleAssignmentConverter),
				Mockito.any())
		).thenThrow(
			new RuntimeException()
		);

		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		Mockito.verify(
			_jiraAssetService
		).getJiraAssetObjects(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).getJiraAssetObjects(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any()
		);
	}

	@Test
	public void testReconcileOrphanedAssignmentsQueriesLiveCandidatesWithEmptyReferences() {
		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		ArgumentCaptor<Consumer<AQLUtil.Builder>> consumerArgumentCaptor =
			ArgumentCaptor.forClass(Consumer.class);

		Mockito.verify(
			_jiraAssetService
		).getJiraAssetObjects(
			Mockito.eq(_accountTeamRoleAssignmentConverter),
			consumerArgumentCaptor.capture()
		);

		AQLUtil.Builder aqlBuilder = AQLUtil.builder("base");

		Consumer<AQLUtil.Builder> consumer = consumerArgumentCaptor.getValue();

		consumer.accept(aqlBuilder);

		Assertions.assertEquals(
			"base AND \"Deleted\" = false AND (\"Account\" IS EMPTY OR " +
				"\"Team\" IS EMPTY OR \"Team Role\" IS EMPTY)",
			aqlBuilder.build());
	}

	@Test
	public void testReconcileOrphanedAssignmentsSkipsFreshAssignments() {
		JiraAssetObject orphanedJiraAssetObject = _createJiraAssetObject(
			null, "team-1", "role-1");

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(
				Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any())
		).thenReturn(
			Collections.singletonList(orphanedJiraAssetObject)
		);

		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		ArgumentCaptor<Predicate<JiraAssetObject>> predicateArgumentCaptor =
			ArgumentCaptor.forClass(Predicate.class);

		Mockito.verify(
			_jiraAssetService
		).softDelete(
			Mockito.eq(_accountTeamRoleAssignmentConverter),
			Mockito.eq(orphanedJiraAssetObject),
			predicateArgumentCaptor.capture()
		);

		JiraAssetObject existingJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			_jiraAssetService.isUpdatedSince(
				Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any(),
				Mockito.eq(existingJiraAssetObject))
		).thenReturn(
			true
		);

		Predicate<JiraAssetObject> predicate =
			predicateArgumentCaptor.getValue();

		Assertions.assertTrue(predicate.test(existingJiraAssetObject));
	}

	@Test
	public void testReconcileOrphanedAssignmentsSkipsOverlappingRun() {
		AtomicInteger searchCount = new AtomicInteger();

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (searchCount.incrementAndGet() == 1) {
					_orphanedAssignmentReconciler.
						reconcileOrphanedAssignments();
				}

				return Collections.emptyList();
			}
		);

		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		Assertions.assertEquals(3, searchCount.get());
	}

	@Test
	public void testReconcileOrphanedAssignmentsSkipsUnsupportedConverter() {
		Mockito.when(
			_accountContactRoleAssignmentConverter.getDeletedAttributeName()
		).thenThrow(
			new UnsupportedOperationException()
		);

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(
				Mockito.eq(_accountContactRoleAssignmentConverter),
				Mockito.any())
		).thenAnswer(
			invocation -> {
				Consumer<AQLUtil.Builder> consumer = invocation.getArgument(1);

				consumer.accept(AQLUtil.builder("base"));

				return Collections.emptyList();
			}
		);

		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		Mockito.verify(
			_jiraAssetService, Mockito.never()
		).softDelete(
			Mockito.eq(_accountContactRoleAssignmentConverter), Mockito.any(),
			Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).getJiraAssetObjects(
			Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).getJiraAssetObjects(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any()
		);
	}

	@Test
	public void testReconcileOrphanedAssignmentsSoftDeletesUnresolvableCandidates() {
		JiraAssetObject healthyJiraAssetObject = _createJiraAssetObject(
			"account-1", "team-1", "role-1");
		JiraAssetObject missingKeyJiraAssetObject = _createJiraAssetObject(
			"account-1", null, "role-1");
		JiraAssetObject orphanedJiraAssetObject = _createJiraAssetObject(
			"account-1", "team-gone", "role-1");

		Mockito.when(
			_jiraAssetService.getJiraAssetObjects(
				Mockito.eq(_accountTeamRoleAssignmentConverter), Mockito.any())
		).thenReturn(
			Arrays.asList(
				healthyJiraAssetObject, missingKeyJiraAssetObject,
				orphanedJiraAssetObject)
		);

		Mockito.when(
			_jiraAssetService.getExternalKeyToObjectIdMap(
				Mockito.eq(_accountConverter), Mockito.anyCollection())
		).thenReturn(
			Collections.singletonMap("account-1", "account-object-id")
		);

		Mockito.when(
			_jiraAssetService.getExternalKeyToObjectIdMap(
				Mockito.eq(_teamConverter), Mockito.anyCollection())
		).thenReturn(
			Collections.singletonMap("team-1", "team-object-id")
		);

		Mockito.when(
			_jiraAssetService.getExternalKeyToObjectIdMap(
				Mockito.eq(_teamRoleConverter), Mockito.anyCollection())
		).thenReturn(
			Collections.singletonMap("role-1", "team-role-object-id")
		);

		_orphanedAssignmentReconciler.reconcileOrphanedAssignments();

		Mockito.verify(
			_jiraAssetService
		).softDelete(
			Mockito.eq(_accountTeamRoleAssignmentConverter),
			Mockito.eq(missingKeyJiraAssetObject), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).softDelete(
			Mockito.eq(_accountTeamRoleAssignmentConverter),
			Mockito.eq(orphanedJiraAssetObject), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService, Mockito.never()
		).softDelete(
			Mockito.eq(_accountTeamRoleAssignmentConverter),
			Mockito.eq(healthyJiraAssetObject), Mockito.any()
		);
	}

	private JiraAssetObject _createJiraAssetObject(
		String accountExternalKey, String teamExternalKey,
		String teamRoleExternalKey) {

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY)
		).thenReturn(
			accountExternalKey
		);

		Mockito.when(
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY)
		).thenReturn(
			teamExternalKey
		);

		Mockito.when(
			jiraAssetObject.getAttributeValue(
				AccountTeamRoleAssignmentConstants.
					ATTRIBUTE_NAME_TEAM_ROLE_EXTERNAL_KEY)
		).thenReturn(
			teamRoleExternalKey
		);

		return jiraAssetObject;
	}

	private AccountContactRoleAssignmentConverter
		_accountContactRoleAssignmentConverter;
	private AccountConverter _accountConverter;
	private AccountTeamRoleAssignmentConverter
		_accountTeamRoleAssignmentConverter;
	private ContactConverter _contactConverter;
	private ContactRoleConverter _contactRoleConverter;
	private JiraAssetService _jiraAssetService;
	private OrphanedAssignmentReconciler _orphanedAssignmentReconciler;
	private TeamContactRoleAssignmentConverter
		_teamContactRoleAssignmentConverter;
	private TeamConverter _teamConverter;
	private TeamRoleConverter _teamRoleConverter;

}