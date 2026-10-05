/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
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
import com.liferay.one.model.AccountSupportInfo;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.KeyedLock;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

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
@DisplayName("[SYNC-ACCOUNTSYNCHRONIZER] AccountSynchronizer")
public class AccountSynchronizerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountSynchronizer = new AccountSynchronizer();

		_jiraAssetService = Mockito.mock(JiraAssetService.class);

		Mockito.when(
			_jiraAssetService.getOrCreateReferenceObjectIds(
				Mockito.any(), Mockito.isNull(), Mockito.any(), Mockito.any())
		).thenReturn(
			null
		);

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

		_organizationService = Mockito.mock(OrganizationService.class);

		Mockito.when(
			_organizationService.getAccountOrganizations(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		_projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);

		_projectService = Mockito.mock(ProjectService.class);

		Mockito.when(
			_projectService.getProjects(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		_propertyService = Mockito.mock(PropertyService.class);

		Mockito.when(
			_propertyService.getAccountProperties(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		_userAccountService = Mockito.mock(UserAccountService.class);

		Mockito.when(
			_userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenReturn(
			Collections.emptyList()
		);

		_userAccountSynchronizer = Mockito.mock(UserAccountSynchronizer.class);

		_accountService = Mockito.mock(AccountService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);

		_accountOrganizationSynchronizer = Mockito.mock(
			AccountOrganizationSynchronizer.class);
		_accountUserAccountRoleSynchronizer = Mockito.mock(
			AccountUserAccountRoleSynchronizer.class);

		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountConverter", accountConverter);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountOrganizationSynchronizer",
			_accountOrganizationSynchronizer);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_accountUserAccountRoleSynchronizer",
			_accountUserAccountRoleSynchronizer);
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
			_accountSynchronizer, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_externalLinkConverter",
			Mockito.mock(ExternalLinkConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_jiraAssetService", _jiraAssetService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_jiraBusinessEventService",
			jiraBusinessEventService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_organizationService", _organizationService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_postalAddressConverter",
			Mockito.mock(PostalAddressConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_roleService",
			Mockito.mock(RoleService.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_teamConverter",
			Mockito.mock(TeamConverter.class));
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			_accountSynchronizer, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testDeleteAccountContinuesWhenSoftDeleteFails() {
		Mockito.doThrow(
			new RuntimeException()
		).when(
			_accountOrganizationSynchronizer
		).softDeleteByAccount(
			Mockito.any()
		);

		Mockito.doThrow(
			new RuntimeException()
		).when(
			_accountUserAccountRoleSynchronizer
		).softDeleteByAccount(
			Mockito.any()
		);

		_accountSynchronizer.deleteAccount(_EXTERNAL_REFERENCE_CODE);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).softDeleteByAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.eq(_EXTERNAL_REFERENCE_CODE)
		);
	}

	@Test
	public void testDeleteAccountSoftDeletesAssignmentsFirst() {
		_accountSynchronizer.deleteAccount(_EXTERNAL_REFERENCE_CODE);

		InOrder inOrder = Mockito.inOrder(
			_accountOrganizationSynchronizer,
			_accountUserAccountRoleSynchronizer, _jiraAssetService);

		inOrder.verify(
			_accountOrganizationSynchronizer
		).softDeleteByAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_accountUserAccountRoleSynchronizer
		).softDeleteByAccount(
			_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_jiraAssetService
		).delete(
			Mockito.any(), Mockito.eq(_EXTERNAL_REFERENCE_CODE)
		);
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
	public void testSyncAccountSkipsEntitlementsWhenEntitlementFails()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementDefinitions(
				Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(AccountConstants.ATTRIBUTE_NAME_ENTITLEMENTS);
	}

	@Test
	public void testSyncAccountSkipsExternalLinksWhenPropertyFails()
		throws Exception {

		Mockito.when(
			_propertyService.getAccountProperties(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(AccountConstants.ATTRIBUTE_NAME_EXTERNAL_LINKS);
	}

	@Test
	public void testSyncAccountSkipsOrganizationsWhenOrganizationFails()
		throws Exception {

		Mockito.when(
			_organizationService.getAccountOrganizations(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(AccountConstants.ATTRIBUTE_NAME_ASSIGNED_TEAMS);

		Mockito.verify(
			_accountOrganizationSynchronizer, Mockito.never()
		).syncOrganizations(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSyncAccountSkipsRolesWhenUserAccountFails()
		throws Exception {

		Mockito.when(
			_userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		_assertSkipsAttribute(
			AccountConstants.ATTRIBUTE_NAME_CUSTOMER_CONTACTS);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer, Mockito.never()
		).syncRoles(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSyncAccountSyncsAccountRoles() throws Exception {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setExternalReferenceCode("role-erc");

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		accountBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
		userAccount.setExternalReferenceCode("user-account-erc");
		userAccount.setId(2L);

		Mockito.when(
			_userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenReturn(
			Collections.singletonList(userAccount)
		);

		Organization organization = new Organization();

		organization.setExternalReferenceCode("organization-erc");

		Mockito.when(
			_organizationService.getAccountOrganizations(Mockito.anyLong())
		).thenReturn(
			Collections.singletonList(organization)
		);

		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(1L);
		account.setName("Test Account");

		_accountSynchronizer.syncAccount(account);

		Mockito.verify(
			_accountOrganizationSynchronizer
		).syncOrganizations(
			Mockito.eq(_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(Collections.singleton("organization-erc")),
			Mockito.any(Date.class)
		);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncRoles(
			Mockito.eq(_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(
				Collections.singletonMap(
					"user-account-erc", Collections.singleton("role-erc"))),
			Mockito.any(Date.class)
		);
	}

	@Test
	public void testSyncAccountSyncsAccountUserAccounts() throws Exception {
		UserAccount failingUserAccount = new UserAccount();

		failingUserAccount.setExternalReferenceCode("failing-user-account-erc");

		UserAccount userAccount = new UserAccount();

		userAccount.setExternalReferenceCode("user-account-erc");

		Mockito.when(
			_userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenReturn(
			Arrays.asList(failingUserAccount, userAccount)
		);

		Mockito.doThrow(
			new RuntimeException("Unable to sync user account")
		).when(
			_userAccountSynchronizer
		).syncUserAccount(
			Mockito.eq(failingUserAccount), Mockito.any(Date.class)
		);

		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(1L);
		account.setName("Test Account");

		_accountSynchronizer.syncAccount(account);

		InOrder inOrder = Mockito.inOrder(
			_jiraAssetService, _userAccountSynchronizer);

		inOrder.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.any()
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccount(
			Mockito.eq(failingUserAccount), Mockito.any(Date.class)
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccount(
			Mockito.eq(userAccount), Mockito.any(Date.class)
		);
	}

	@Test
	public void testSyncAccountSyncsProjectRoles() throws Exception {
		Project project = _mockProjectMemberships();

		Mockito.when(
			_projectService.getProjects(Mockito.anyLong())
		).thenReturn(
			Collections.singletonList(project)
		);

		_accountSynchronizer.syncAccount(_createAccount());

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncRoles(
			Mockito.eq(_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(Collections.emptyMap()), Mockito.any(Date.class)
		);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncRoles(
			Mockito.eq(_PROJECT_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(_getExpectedRoleExternalKeysByUserAccountExternalKey()),
			Mockito.any(Date.class)
		);
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

	@Test
	public void testSyncProjectSkipsContactsWhenProjectMembershipFails()
		throws Exception {

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenThrow(
			new RuntimeException()
		);

		_accountSynchronizer.syncProject(_createProject());

		Mockito.verify(
			_jiraAssetObject, Mockito.never()
		).setAttributeValue(
			Mockito.eq(AccountConstants.ATTRIBUTE_NAME_CUSTOMER_CONTACTS),
			Mockito.notNull()
		);

		Mockito.verify(
			_jiraAssetObject, Mockito.never()
		).setAttributeValue(
			Mockito.eq(AccountConstants.ATTRIBUTE_NAME_WORKER_CONTACTS),
			Mockito.notNull()
		);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer, Mockito.never()
		).syncRoles(
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.eq(_jiraAssetObject)
		);
	}

	@Test
	public void testSyncProjectSyncsProjectRoles() throws Exception {
		Project project = _mockProjectMemberships();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createAccount()
		);

		_accountSynchronizer.syncProject(project);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncRoles(
			Mockito.eq(_PROJECT_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(_getExpectedRoleExternalKeysByUserAccountExternalKey()),
			Mockito.any(Date.class)
		);
	}

	private void _assertSkipsAttribute(String attributeName) {
		_accountSynchronizer.syncAccount(_createAccount());

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
			Mockito.eq(AccountConstants.ATTRIBUTE_NAME_LANGUAGE),
			Mockito.notNull()
		);

		Mockito.verify(
			_jiraAssetService
		).upsert(
			Mockito.any(), Mockito.eq(_jiraAssetObject)
		);
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(1L);
		account.setName("Test Account");

		return account;
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"name", "Test Project"
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryId", 1L
			));
	}

	private ProjectMembership _createProjectMembership(
		String roleExternalReferenceCode) {

		return new ProjectMembership(
			new JSONObject(
			).put(
				"externalReferenceCode",
				roleExternalReferenceCode + "-membership"
			).put(
				"r_projectToProjectMembership_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_userToProjectMembership_userId", 2L
			).put(
				"roleExternalReferenceCode", roleExternalReferenceCode
			));
	}

	private Map<String, Set<String>>
		_getExpectedRoleExternalKeysByUserAccountExternalKey() {

		return Collections.singletonMap(
			"user-account-erc",
			new LinkedHashSet<>(Arrays.asList("role-erc-1", "role-erc-2")));
	}

	private Project _mockProjectMemberships() throws Exception {
		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Arrays.asList(
				_createProjectMembership("role-erc-1"),
				_createProjectMembership("role-erc-2"))
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setExternalReferenceCode("user-account-erc");
		userAccount.setId(2L);

		Mockito.when(
			_userAccountService.getUserAccounts(Mockito.anyCollection())
		).thenReturn(
			Collections.singletonList(userAccount)
		);

		return _createProject();
	}

	private static final String _EXTERNAL_REFERENCE_CODE =
		"test-external-reference-code";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE =
		"test-project-external-reference-code";

	private AccountOrganizationSynchronizer _accountOrganizationSynchronizer;
	private AccountService _accountService;
	private AccountSynchronizer _accountSynchronizer;
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;
	private EntitlementService _entitlementService;
	private JiraAssetObject _jiraAssetObject;
	private JiraAssetService _jiraAssetService;
	private OrganizationService _organizationService;
	private ProjectMembershipService _projectMembershipService;
	private ProjectService _projectService;
	private PropertyService _propertyService;
	private UserAccountService _userAccountService;
	private UserAccountSynchronizer _userAccountSynchronizer;

}