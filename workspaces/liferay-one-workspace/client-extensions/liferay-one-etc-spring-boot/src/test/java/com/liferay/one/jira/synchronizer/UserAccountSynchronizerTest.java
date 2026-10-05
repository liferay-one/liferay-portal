/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.constants.ContactConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.EntitlementConverter;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.converter.PhoneConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.function.UnsafeRunnable;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;

import org.json.JSONObject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName("[SYNC-USERACCOUNTSYNCHRONIZER] UserAccountSynchronizer")
public class UserAccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_userAccountSynchronizer = new UserAccountSynchronizer();

		_accountConverter = Mockito.mock(AccountConverter.class);
		_accountUserAccountRoleSynchronizer = Mockito.mock(
			AccountUserAccountRoleSynchronizer.class);
		_contactConverter = Mockito.mock(ContactConverter.class);

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		Mockito.when(
			_jiraAssetService.fetchReferenceObjectIds(
				Mockito.any(), Mockito.isNull(), Mockito.any())
		).thenReturn(
			null
		);

		Mockito.when(
			_jiraAssetService.getOrCreateReferenceObjectIds(
				Mockito.any(), Mockito.isNull(), Mockito.any(), Mockito.any())
		).thenReturn(
			null
		);

		_organizationUserAccountRoleSynchronizer = Mockito.mock(
			OrganizationUserAccountRoleSynchronizer.class);
		_projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);

		_entitlementService = Mockito.mock(EntitlementService.class);

		_propertyService = Mockito.mock(PropertyService.class);

		Mockito.when(
			_propertyService.getUserAccountProperties(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		_jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			_contactConverter.toAssetObject(Mockito.any(UserAccount.class))
		).thenReturn(
			_jiraAssetObject
		);

		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_accountConverter", _accountConverter);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_accountUserAccountRoleSynchronizer",
			_accountUserAccountRoleSynchronizer);
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
			_entitlementService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_externalLinkConverter",
			Mockito.mock(ExternalLinkConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_jiraAssetService", _jiraAssetService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_userAccountSynchronizer,
			"_organizationUserAccountRoleSynchronizer",
			_organizationUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_phoneConverter",
			Mockito.mock(PhoneConverter.class));
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			_userAccountSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
	}

	@Test
	public void testDeleteUserAccountContinuesWhenSoftDeleteFails() {
		Mockito.doThrow(
			new RuntimeException()
		).when(
			_accountUserAccountRoleSynchronizer
		).softDeleteByUserAccount(
			Mockito.any()
		);

		Mockito.doThrow(
			new RuntimeException()
		).when(
			_organizationUserAccountRoleSynchronizer
		).softDeleteByUserAccount(
			Mockito.any()
		);

		_userAccountSynchronizer.deleteUserAccount(_EXTERNAL_REFERENCE_CODE);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).softDeleteByUserAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.eq(_EXTERNAL_REFERENCE_CODE)
		);
	}

	@Test
	public void testDeleteUserAccountSoftDeletesAssignmentsFirst() {
		_userAccountSynchronizer.deleteUserAccount(_EXTERNAL_REFERENCE_CODE);

		InOrder inOrder = Mockito.inOrder(
			_accountUserAccountRoleSynchronizer, _jiraAssetService,
			_organizationUserAccountRoleSynchronizer);

		inOrder.verify(
			_accountUserAccountRoleSynchronizer
		).softDeleteByUserAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_organizationUserAccountRoleSynchronizer
		).softDeleteByUserAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.eq(_EXTERNAL_REFERENCE_CODE)
		);
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

		UserAccount userAccount = _createUserAccount();

		lockSerializationTestHelper.assertSerialized(
			() -> _userAccountSynchronizer.syncUserAccount(userAccount),
			() -> _userAccountSynchronizer.deleteUserAccount(
				_EXTERNAL_REFERENCE_CODE),
			"upsert", "delete");
	}

	@Test
	public void testSyncUserAccountAccountsUpsertsAccountReferences()
		throws Exception {

		_assertUpsertsAttribute(
			ContactConstants.ATTRIBUTE_NAME_ACCOUNT,
			() -> _userAccountSynchronizer.syncUserAccountAccounts(
				_createUserAccount()));
	}

	@Test
	public void testSyncUserAccountAccountsUpsertsProjectReferences()
		throws Exception {

		_whenProjectMembership();

		_userAccountSynchronizer.syncUserAccountAccounts(_createUserAccount());

		_verifyFetchesAccountAndProjectReferences();
	}

	@Test
	public void testSyncUserAccountAssignsRolesSinceStartDate()
		throws Exception {

		UserAccount userAccount = _createUserAccountWithRoles();

		Date startDate = new Date();

		_userAccountSynchronizer.syncUserAccount(userAccount, startDate);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncAssignRole(
			"role-erc", _EXTERNAL_REFERENCE_CODE,
			_ACCOUNT_EXTERNAL_REFERENCE_CODE, startDate
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncAssignRole(
			"role-erc", _EXTERNAL_REFERENCE_CODE, "organization-erc", startDate
		);
	}

	@Test
	public void testSyncUserAccountAssignsRolesUnconditionally()
		throws Exception {

		_userAccountSynchronizer.syncUserAccount(_createUserAccountWithRoles());

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncAssignRole(
			Mockito.eq("role-erc"), Mockito.eq(_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE), Mockito.isNull()
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncAssignRole(
			Mockito.eq("role-erc"), Mockito.eq(_EXTERNAL_REFERENCE_CODE),
			Mockito.eq("organization-erc"), Mockito.isNull()
		);
	}

	@Test
	public void testSyncUserAccountOrganizationsUpsertsOrganizationReferences()
		throws Exception {

		_assertUpsertsAttribute(
			ContactConstants.ATTRIBUTE_NAME_TEAMS,
			() -> _userAccountSynchronizer.syncUserAccountOrganizations(
				_createUserAccount()));
	}

	@Test
	public void testSyncUserAccountRolesUpsertsRoleReferences()
		throws Exception {

		_assertUpsertsAttribute(
			ContactConstants.ATTRIBUTE_NAME_CONTACT_ROLES,
			() -> _userAccountSynchronizer.syncUserAccountRoles(
				_createUserAccount()));
	}

	@Test
	public void testSyncUserAccountSkipsAccountWhenProjectMembershipFails()
		throws Exception {

		Mockito.when(
			_projectMembershipService.getProjectMembershipsByUserId(
				Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(ContactConstants.ATTRIBUTE_NAME_ACCOUNT);
	}

	@Test
	public void testSyncUserAccountSkipsEntitlementsWhenEntitlementFails()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementDefinitions(
				Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(ContactConstants.ATTRIBUTE_NAME_ENTITLEMENTS);
	}

	@Test
	public void testSyncUserAccountSkipsExternalLinksWhenPropertyFails()
		throws Exception {

		Mockito.when(
			_propertyService.getUserAccountProperties(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(ContactConstants.ATTRIBUTE_NAME_EXTERNAL_LINKS);
	}

	@Test
	public void testSyncUserAccountUpsertsProjectReferences() throws Exception {
		_whenProjectMembership();

		_userAccountSynchronizer.syncUserAccount(_createUserAccount());

		_verifyFetchesAccountAndProjectReferences();
	}

	private void _assertSkipsAttribute(String attributeName) throws Exception {
		_userAccountSynchronizer.syncUserAccount(_createUserAccount());

		Mockito.verify(
			_jiraAssetObject
		).setAttributeValue(
			Mockito.eq(attributeName), Mockito.isNull()
		);

		Mockito.verify(
			_jiraAssetObject, Mockito.never()
		).setAttributeValue(
			Mockito.eq(attributeName), Mockito.notNull()
		);

		Mockito.verify(
			_jiraAssetObject
		).setAttributeValue(
			Mockito.eq(ContactConstants.ATTRIBUTE_NAME_TEAMS), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.eq(_jiraAssetObject)
		);
	}

	private void _assertUpsertsAttribute(
			String attributeName, UnsafeRunnable<Exception> unsafeRunnable)
		throws Exception {

		unsafeRunnable.run();

		Mockito.verify(
			_jiraAssetObject
		).setAttributeValue(
			Mockito.eq(attributeName), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.eq(_jiraAssetObject)
		);
	}

	private AccountBrief _createAccountBrief() {
		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(_ACCOUNT_EXTERNAL_REFERENCE_CODE);
		accountBrief.setId(1L);

		return accountBrief;
	}

	private UserAccount _createUserAccount() {
		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(
			new AccountBrief[] {_createAccountBrief()});
		userAccount.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		userAccount.setId(1L);

		return userAccount;
	}

	private UserAccount _createUserAccountWithRoles() {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setExternalReferenceCode("role-erc");

		AccountBrief accountBrief = _createAccountBrief();

		accountBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setExternalReferenceCode("organization-erc");
		organizationBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		UserAccount userAccount = _createUserAccount();

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
		userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {organizationBrief});

		return userAccount;
	}

	private void _verifyFetchesAccountAndProjectReferences() {
		Mockito.verify(
			_jiraAssetService
		).fetchReferenceObjectIds(
			Mockito.eq(_accountConverter),
			Mockito.eq(
				Arrays.asList(
					_ACCOUNT_EXTERNAL_REFERENCE_CODE,
					_PROJECT_EXTERNAL_REFERENCE_CODE)),
			Mockito.any()
		);
	}

	private void _whenProjectMembership() throws Exception {
		Mockito.when(
			_projectMembershipService.getProjectMembershipsByUserId(1L)
		).thenReturn(
			Collections.singletonList(
				new ProjectMembership(
					new JSONObject(
					).put(
						"r_projectToProjectMembership_c_projectERC",
						_PROJECT_EXTERNAL_REFERENCE_CODE
					)))
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE =
		"test-account-external-reference-code";

	private static final String _EXTERNAL_REFERENCE_CODE =
		"test-external-reference-code";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE =
		"test-project-external-reference-code";

	private AccountConverter _accountConverter;
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;
	private ContactConverter _contactConverter;
	private EntitlementService _entitlementService;
	private JiraAssetObject _jiraAssetObject;
	private JiraAssetService _jiraAssetService;
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;
	private ProjectMembershipService _projectMembershipService;
	private PropertyService _propertyService;
	private UserAccountSynchronizer _userAccountSynchronizer;

}