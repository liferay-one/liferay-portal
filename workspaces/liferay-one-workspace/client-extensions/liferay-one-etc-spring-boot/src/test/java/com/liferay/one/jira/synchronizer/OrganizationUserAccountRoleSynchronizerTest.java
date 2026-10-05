/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.TeamContactRoleAssignmentConstants;
import com.liferay.one.jira.converter.TeamContactRoleAssignmentConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.util.KeyedLock;

import java.util.Date;
import java.util.function.BiPredicate;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName(
	"[SYNC-ORGANIZATIONUSERACCOUNTROLESYNCHRONIZER] " +
		"OrganizationUserAccountRoleSynchronizer"
)
public class OrganizationUserAccountRoleSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_organizationUserAccountRoleSynchronizer =
			new OrganizationUserAccountRoleSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		_teamContactRoleAssignmentConverter = Mockito.mock(
			TeamContactRoleAssignmentConverter.class);

		Mockito.when(
			_teamContactRoleAssignmentConverter.toAssetObject(
				Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any())
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer, "_keyedLock",
			new KeyedLock());
		ReflectionTestUtils.setField(
			_organizationUserAccountRoleSynchronizer,
			"_teamContactRoleAssignmentConverter",
			_teamContactRoleAssignmentConverter);
	}

	@Test
	public void testSoftDeleteByOrganization() {
		_organizationUserAccountRoleSynchronizer.softDeleteByOrganization(
			"organization-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_teamContactRoleAssignmentConverter,
			TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY,
			"organization-erc"
		);
	}

	@Test
	public void testSoftDeleteByUserAccount() {
		_organizationUserAccountRoleSynchronizer.softDeleteByUserAccount(
			"user-account-erc");

		Mockito.verify(
			_jiraAssetService
		).softDeleteByAttribute(
			_teamContactRoleAssignmentConverter,
			TeamContactRoleAssignmentConstants.
				ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY,
			"user-account-erc"
		);
	}

	@Test
	public void testSyncAssignRoleMarksAssignmentUndeleted() throws Exception {
		_organizationUserAccountRoleSynchronizer.syncAssignRole(
			"role-erc", "user-account-erc", "organization-erc");

		Mockito.verify(
			_teamContactRoleAssignmentConverter
		).toAssetObject(
			Mockito.eq("role-erc"), Mockito.eq("user-account-erc"),
			Mockito.eq("organization-erc"), Mockito.eq(false), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any(),
			Mockito.isNull()
		);
	}

	@Test
	public void testSyncAssignRoleSkipsAssignmentsUpdatedSinceStartDate()
		throws Exception {

		Date startDate = new Date();

		_organizationUserAccountRoleSynchronizer.syncAssignRole(
			"role-erc", "user-account-erc", "organization-erc", startDate);

		ArgumentCaptor<BiPredicate<JiraAssetObject, JiraAssetObject>>
			biPredicateArgumentCaptor = ArgumentCaptor.forClass(
				BiPredicate.class);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any(),
			biPredicateArgumentCaptor.capture()
		);

		BiPredicate<JiraAssetObject, JiraAssetObject> biPredicate =
			biPredicateArgumentCaptor.getValue();

		JiraAssetObject existingJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Assertions.assertFalse(
			biPredicate.test(
				existingJiraAssetObject, Mockito.mock(JiraAssetObject.class)));

		Mockito.when(
			_jiraAssetService.isUpdatedSince(
				_teamContactRoleAssignmentConverter, startDate,
				existingJiraAssetObject)
		).thenReturn(
			true
		);

		Assertions.assertTrue(
			biPredicate.test(
				existingJiraAssetObject, Mockito.mock(JiraAssetObject.class)));
	}

	@Test
	public void testSyncUnassignRoleMarksAssignmentDeleted() throws Exception {
		_organizationUserAccountRoleSynchronizer.syncUnassignRole(
			"role-erc", "user-account-erc", "organization-erc");

		Mockito.verify(
			_teamContactRoleAssignmentConverter
		).toAssetObject(
			Mockito.eq("role-erc"), Mockito.eq("user-account-erc"),
			Mockito.eq("organization-erc"), Mockito.eq(true), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.eq(_teamContactRoleAssignmentConverter), Mockito.any(),
			Mockito.isNull()
		);
	}

	private JiraAssetService _jiraAssetService;
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;
	private TeamContactRoleAssignmentConverter
		_teamContactRoleAssignmentConverter;

}