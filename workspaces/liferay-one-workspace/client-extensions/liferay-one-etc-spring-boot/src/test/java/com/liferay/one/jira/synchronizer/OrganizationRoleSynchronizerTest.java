/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.service.RoleService;

import java.util.List;
import java.util.function.BiPredicate;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[SYNC-ORGANIZATIONROLESYNCHRONIZER] [CRON-SYNCORGANIZATIONROLES] " +
		"[LSN-ORGANIZATIONROLESYNCHRONIZER-ONAPPLICATIONREADY] OrganizationRoleSynchronizer"
)
public class OrganizationRoleSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_organizationRoleSynchronizer = new OrganizationRoleSynchronizer();

		_contactRoleConverter = Mockito.mock(ContactRoleConverter.class);
		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		_role1 = _createRole("ORGANIZATION_ROLE_1");
		_role2 = _createRole("ORGANIZATION_ROLE_2");
		_roleService = Mockito.mock(RoleService.class);

		Mockito.when(
			_contactRoleConverter.toAssetObject(_role1)
		).thenReturn(
			_jiraAssetObject1
		);

		Mockito.when(
			_contactRoleConverter.toAssetObject(_role2)
		).thenReturn(
			_jiraAssetObject2
		);

		Mockito.when(
			_roleService.getOrganizationRoles()
		).thenReturn(
			List.of(_role1, _role2)
		);

		ReflectionTestUtils.setField(
			_organizationRoleSynchronizer, "_contactRoleConverter",
			_contactRoleConverter);
		ReflectionTestUtils.setField(
			_organizationRoleSynchronizer, "_jiraAssetService",
			_jiraAssetService);
		ReflectionTestUtils.setField(
			_organizationRoleSynchronizer, "_roleService", _roleService);
	}

	@Test
	public void testOnApplicationReadyLogsWhenRoleFetchFails()
		throws Exception {

		Mockito.when(
			_roleService.getOrganizationRoles()
		).thenThrow(
			new RuntimeException("Unable to get organization roles")
		);

		Assertions.assertDoesNotThrow(
			_organizationRoleSynchronizer::onApplicationReady);

		Mockito.verifyNoInteractions(_jiraAssetService);
	}

	@Test
	public void testOnApplicationReadySyncsOrganizationRoles() {
		_organizationRoleSynchronizer.onApplicationReady();

		_verifyUpsert(_jiraAssetObject1, 1);
		_verifyUpsert(_jiraAssetObject2, 1);
	}

	@Test
	public void testSyncOrganizationRolesContinuesAfterRoleFailure()
		throws Exception {

		Mockito.doThrow(
			new RuntimeException("Unable to upsert")
		).when(
			_jiraAssetService
		).upsert(
			ArgumentMatchers.eq(_contactRoleConverter),
			ArgumentMatchers.eq(_jiraAssetObject1), ArgumentMatchers.any()
		);

		_organizationRoleSynchronizer.syncOrganizationRoles();

		_verifyUpsert(_jiraAssetObject2, 1);
	}

	@Test
	public void testSyncOrganizationRolesIsIdempotent() throws Exception {
		_organizationRoleSynchronizer.syncOrganizationRoles();
		_organizationRoleSynchronizer.syncOrganizationRoles();

		_verifyUpsert(_jiraAssetObject1, 2);
		_verifyUpsert(_jiraAssetObject2, 2);

		Mockito.verify(
			_jiraAssetService, Mockito.times(4)
		).upsert(
			ArgumentMatchers.any(), ArgumentMatchers.any(),
			ArgumentMatchers.any()
		);
	}

	@Test
	public void testSyncOrganizationRolesSkipsUnchangedByExternalUpdatedAt()
		throws Exception {

		_organizationRoleSynchronizer.syncOrganizationRoles();

		ArgumentCaptor<BiPredicate<JiraAssetObject, JiraAssetObject>>
			argumentCaptor = ArgumentCaptor.forClass(BiPredicate.class);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			ArgumentMatchers.eq(_contactRoleConverter),
			ArgumentMatchers.eq(_jiraAssetObject1), argumentCaptor.capture()
		);

		BiPredicate<JiraAssetObject, JiraAssetObject> biPredicate =
			argumentCaptor.getValue();

		JiraAssetObject existingJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			_jiraAssetService.isUnchangedByExternalUpdatedAt(
				_contactRoleConverter, existingJiraAssetObject,
				_jiraAssetObject1)
		).thenReturn(
			true, false
		);

		Assertions.assertTrue(
			biPredicate.test(existingJiraAssetObject, _jiraAssetObject1));
		Assertions.assertFalse(
			biPredicate.test(existingJiraAssetObject, _jiraAssetObject1));
	}

	@Test
	public void testSyncOrganizationRolesUpsertsEveryOrganizationRole()
		throws Exception {

		_organizationRoleSynchronizer.syncOrganizationRoles();

		Mockito.verify(
			_contactRoleConverter
		).toAssetObject(
			_role1
		);

		Mockito.verify(
			_contactRoleConverter
		).toAssetObject(
			_role2
		);

		_verifyUpsert(_jiraAssetObject1, 1);
		_verifyUpsert(_jiraAssetObject2, 1);
	}

	private Role _createRole(String externalReferenceCode) {
		Role role = new Role();

		role.setExternalReferenceCode(externalReferenceCode);

		return role;
	}

	private void _verifyUpsert(JiraAssetObject jiraAssetObject, int times) {
		Mockito.verify(
			_jiraAssetService, Mockito.times(times)
		).upsert(
			ArgumentMatchers.eq(_contactRoleConverter),
			ArgumentMatchers.eq(jiraAssetObject), ArgumentMatchers.notNull()
		);
	}

	private ContactRoleConverter _contactRoleConverter;
	private final JiraAssetObject _jiraAssetObject1 = Mockito.mock(
		JiraAssetObject.class);
	private final JiraAssetObject _jiraAssetObject2 = Mockito.mock(
		JiraAssetObject.class);
	private JiraAssetService _jiraAssetService;
	private OrganizationRoleSynchronizer _organizationRoleSynchronizer;
	private Role _role1;
	private Role _role2;
	private RoleService _roleService;

}