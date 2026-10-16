/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.UserAccountResource;
import com.liferay.headless.admin.user.client.resource.v1_0.UserGroupResource;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.okta.service.OktaService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
@DisplayName("[CRON-RECONCILEUSERGROUPS] UserGroupService#reconcileUserGroups")
public class UserGroupServiceReconcileTest {

	@BeforeEach
	public void setUp() throws Exception {
		_userAccountResourceBuilder = Mockito.mock(
			UserAccountResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			_userAccountResourceBuilder.build()
		).thenReturn(
			_userAccountResource
		);

		_userAccountResourceMockedStatic = Mockito.mockStatic(
			UserAccountResource.class);

		_userAccountResourceMockedStatic.when(
			UserAccountResource::builder
		).thenReturn(
			_userAccountResourceBuilder
		);

		Mockito.when(
			_userAccountResource.getUserGroupByExternalReferenceCodeUsersPage(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.any(), ArgumentMatchers.any(),
				ArgumentMatchers.any())
		).thenAnswer(
			invocation -> {
				String externalReferenceCode = invocation.getArgument(0);

				if (externalReferenceCode.equals(
						_failedReadExternalReferenceCode)) {

					throw new IllegalStateException(
						"Unable to get the members");
				}

				List<Page<UserAccount>> pages =
					_userGroupUsersPages.getOrDefault(
						externalReferenceCode, Collections.emptyList());

				if (pages.isEmpty()) {
					return _emptyPage;
				}

				return pages.remove(0);
			}
		);

		UserGroupResource.Builder builder = Mockito.mock(
			UserGroupResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_userGroupResource
		);

		_userGroupResourceMockedStatic = Mockito.mockStatic(
			UserGroupResource.class);

		_userGroupResourceMockedStatic.when(
			UserGroupResource::builder
		).thenReturn(
			builder
		);

		Mockito.when(
			_userAccountService.getUserAccounts(
				Mockito.anyCollection(), Mockito.eq("emailAddress,id"))
		).thenAnswer(
			invocation -> {
				List<UserAccount> userAccounts = new ArrayList<>();

				Collection<Long> userIds = invocation.getArgument(0);

				for (long userId : userIds) {
					UserAccount userAccount = new UserAccount();

					userAccount.setEmailAddress(_getEmailAddress(userId));
					userAccount.setId(userId);

					userAccounts.add(userAccount);
				}

				return userAccounts;
			}
		);

		ReflectionTestUtils.setField(
			_userGroupService, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_userGroupService, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			_userGroupService, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_userGroupService, "_userAccountService", _userAccountService);
	}

	@AfterEach
	public void tearDown() {
		_userAccountResourceMockedStatic.close();
		_userGroupResourceMockedStatic.close();
	}

	@Test
	public void testReconcileUserGroupsAddsAndRemovesTheDifference()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null),
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));
		_mockAccountUserAccounts(
			_CUSTOMER_ACCOUNT_ID,
			_createUserAccount(
				_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER, 10),
			_createUserAccount(
				_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MEMBER, 11));
		_mockAccountUserAccounts(
			_PARTNER_ACCOUNT_ID,
			_createUserAccount(
				_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MEMBER, 12),
			_createUserAccount(
				_PARTNER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER, 13));
		_mockUserGroupUsers(_SUPPORT_CUSTOMERS, 14);
		_mockUserGroupUsers(_PARTNERS, 15);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {10L}
		);

		Mockito.verify(
			_userGroupResource
		).deleteUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {14L}
		);

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_PARTNERS, new Long[] {12L}
		);

		Mockito.verify(
			_userGroupResource
		).deleteUserGroupByExternalReferenceCodeUsers(
			_PARTNERS, new Long[] {15L}
		);

		Mockito.verifyNoMoreInteractions(_userGroupResource);
	}

	@Test
	public void testReconcileUserGroupsAddsTheMembersOfTheProjectsAsCustomers()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(20);

		_userGroupService.reconcileUserGroups();

		ArgumentCaptor<Collection<String>> projectCaptor =
			ArgumentCaptor.forClass(Collection.class);

		Mockito.verify(
			_projectMembershipService
		).getProjectMemberships(
			projectCaptor.capture()
		);

		Assertions.assertEquals(
			Collections.singletonList(_PROJECT_EXTERNAL_REFERENCE_CODE),
			new ArrayList<>(projectCaptor.getValue()));

		Mockito.verify(
			_userAccountService, Mockito.never()
		).getAccountUserAccounts(
			Mockito.anyLong(), Mockito.anyString()
		);

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {20L}
		);

		Mockito.verifyNoMoreInteractions(_userGroupResource);
	}

	@Test
	public void testReconcileUserGroupsContinuesAfterAFailedBatch()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(_createUserIds(150));

		Mockito.doThrow(
			new IllegalStateException("Unable to add the users")
		).doNothing(
		).when(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			Mockito.eq(_SUPPORT_CUSTOMERS), Mockito.any(Long[].class)
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_userGroupResource, Mockito.times(2)
		).postUserGroupByExternalReferenceCodeUsers(
			Mockito.eq(_SUPPORT_CUSTOMERS), Mockito.any(Long[].class)
		);
	}

	@Test
	public void testReconcileUserGroupsDoesNotSkipTheUsersSyncedBeforeTheRun()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(10);
		_mockUserAccount(10);

		_userGroupService.syncUserAccountUserGroups(10);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {10L}
		);
	}

	@Test
	public void testReconcileUserGroupsKeysetPagingSendsTheFilterFromTheLastScreenName()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		long[] userIds = _createUserIds(500);

		_mockProjectMemberships(userIds);

		List<UserAccount> userAccounts = new ArrayList<>();

		for (long userId : userIds) {
			userAccounts.add(
				_createMemberUserAccount("user-" + userId, userId));
		}

		userAccounts.set(
			userIds.length - 1,
			_createMemberUserAccount("last'name", userIds[userIds.length - 1]));

		_userGroupUsersPages.put(
			_SUPPORT_CUSTOMERS,
			new ArrayList<>(
				Arrays.asList(
					_createPage(userAccounts.toArray(new UserAccount[0])),
					_createPage(_createMemberUserAccount("z", 9999)))));

		_userGroupService.reconcileUserGroups();

		ArgumentCaptor<String> filterStringCaptor = ArgumentCaptor.forClass(
			String.class);
		ArgumentCaptor<Pagination> paginationCaptor = ArgumentCaptor.forClass(
			Pagination.class);

		Mockito.verify(
			_userAccountResource, Mockito.times(2)
		).getUserGroupByExternalReferenceCodeUsersPage(
			ArgumentMatchers.eq(_SUPPORT_CUSTOMERS), ArgumentMatchers.isNull(),
			filterStringCaptor.capture(), paginationCaptor.capture(),
			ArgumentMatchers.eq("alternateName:asc")
		);

		List<String> filterStrings = filterStringCaptor.getAllValues();

		Assertions.assertNull(filterStrings.get(0));
		Assertions.assertEquals(
			"alternateName gt 'last''name'", filterStrings.get(1));

		for (Pagination pagination : paginationCaptor.getAllValues()) {
			Assertions.assertEquals(1, pagination.getPage());
			Assertions.assertEquals(500, pagination.getPageSize());
		}

		Mockito.verify(
			_userAccountResourceBuilder, Mockito.times(2)
		).parameters(
			"fields", "alternateName,id"
		);

		Mockito.verify(
			_userGroupResource
		).deleteUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {9999L}
		);

		Mockito.verifyNoMoreInteractions(_userGroupResource);
	}

	@Test
	public void testReconcileUserGroupsPublishesOneOktaMessageForEachChangedUser()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null),
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));
		_mockAccountUserAccounts(
			_CUSTOMER_ACCOUNT_ID,
			_createUserAccount(
				_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER, 10));
		_mockAccountUserAccounts(
			_PARTNER_ACCOUNT_ID,
			_createUserAccount(
				_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MEMBER, 12));
		_mockUserGroupUsers(_SUPPORT_CUSTOMERS, 14);
		_mockUserGroupUsers(_PARTNERS, 15);

		_userGroupService.reconcileUserGroups();

		ArgumentCaptor<Collection<Long>> userIdsCaptor =
			ArgumentCaptor.forClass(Collection.class);

		Mockito.verify(
			_userAccountService
		).getUserAccounts(
			userIdsCaptor.capture(), Mockito.eq("emailAddress,id")
		);

		Assertions.assertEquals(
			new HashSet<>(Arrays.asList(10L, 12L, 14L, 15L)),
			new HashSet<>(userIdsCaptor.getValue()));

		Mockito.verify(
			_oktaService
		).addUserToGroup(
			_getEmailAddress(10), "Customers"
		);

		Mockito.verify(
			_oktaService
		).addUserToGroup(
			_getEmailAddress(12), "Partners"
		);

		Mockito.verify(
			_oktaService
		).removeUserFromGroup(
			_getEmailAddress(14), "Customers"
		);

		Mockito.verify(
			_oktaService
		).removeUserFromGroup(
			_getEmailAddress(15), "Partners"
		);

		Mockito.verifyNoMoreInteractions(_oktaService);
	}

	@Test
	public void testReconcileUserGroupsReadsAnAccountThatIsBothSupportAndPartnerOnce()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null),
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));

		UserAccount userAccount = _createUserAccount(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER, 10);

		AccountBrief[] accountBriefs = userAccount.getAccountBriefs();

		accountBriefs[0].setRoleBriefs(
			new RoleBrief[] {
				_createRoleBrief(RoleConstants.NAME_ACCOUNT_MEMBER),
				_createRoleBrief(RoleConstants.NAME_PARTNER_MEMBER)
			});

		_mockAccountUserAccounts(_CUSTOMER_ACCOUNT_ID, userAccount);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_userAccountService
		).getAccountUserAccounts(
			_CUSTOMER_ACCOUNT_ID, "accountBriefs,id"
		);

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {10L}
		);

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_PARTNERS, new Long[] {10L}
		);

		Mockito.verifyNoMoreInteractions(_userGroupResource);
	}

	@Test
	public void testReconcileUserGroupsReleasesTheGuardAndSkipsAConcurrentRun()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementsByNames(Mockito.anyList())
		).thenAnswer(
			invocation -> {
				_userGroupService.reconcileUserGroups();

				return Collections.emptyList();
			}
		).thenReturn(
			Collections.emptyList()
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_entitlementService
		).getActiveEntitlementsByNames(
			Mockito.anyList()
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_entitlementService, Mockito.times(2)
		).getActiveEntitlementsByNames(
			Mockito.anyList()
		);
	}

	@Test
	public void testReconcileUserGroupsSkipsOktaForAFailedBatch()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(_createUserIds(150));

		Mockito.doThrow(
			new IllegalStateException("Unable to add the users")
		).doNothing(
		).when(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			Mockito.eq(_SUPPORT_CUSTOMERS), Mockito.any(Long[].class)
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_oktaService, Mockito.times(50)
		).addUserToGroup(
			Mockito.anyString(), Mockito.eq("Customers")
		);

		Mockito.verifyNoMoreInteractions(_oktaService);
	}

	@Test
	public void testReconcileUserGroupsSkipsTheUsersSyncedDuringTheRun()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockUserAccount(10);
		_mockUserAccount(14);
		_mockUserGroupUsers(_SUPPORT_CUSTOMERS, 14, 15);

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				Mockito.<Collection<String>>any())
		).thenAnswer(
			invocation -> {
				_userGroupService.syncUserAccountUserGroups(10);
				_userGroupService.syncUserAccountUserGroups(14);

				return _createProjectMemberships(10, 11);
			}
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verify(
			_userGroupResource
		).postUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {11L}
		);

		Mockito.verify(
			_userGroupResource
		).deleteUserGroupByExternalReferenceCodeUsers(
			_SUPPORT_CUSTOMERS, new Long[] {15L}
		);

		Mockito.verifyNoMoreInteractions(_userGroupResource);

		Mockito.verify(
			_oktaService
		).addUserToGroup(
			_getEmailAddress(11), "Customers"
		);

		Mockito.verify(
			_oktaService
		).removeUserFromGroup(
			_getEmailAddress(15), "Customers"
		);

		Mockito.verifyNoMoreInteractions(_oktaService);
	}

	@Test
	public void testReconcileUserGroupsWritesInBatchesOfOneHundred()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(_createUserIds(250));

		_userGroupService.reconcileUserGroups();

		ArgumentCaptor<Long[]> userIdsCaptor = ArgumentCaptor.forClass(
			Long[].class);

		Mockito.verify(
			_userGroupResource, Mockito.times(3)
		).postUserGroupByExternalReferenceCodeUsers(
			Mockito.eq(_SUPPORT_CUSTOMERS), userIdsCaptor.capture()
		);

		List<Integer> batchSizes = new ArrayList<>();

		for (Long[] userIds : userIdsCaptor.getAllValues()) {
			batchSizes.add(userIds.length);
		}

		Collections.sort(batchSizes);

		Assertions.assertEquals(Arrays.asList(50, 100, 100), batchSizes);
	}

	@Test
	public void testReconcileUserGroupsWritesNothingWhenAReadFails()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(10);
		_mockUserGroupUsers(_PARTNERS, 15);

		_failedReadExternalReferenceCode = _PARTNERS;

		_userGroupService.reconcileUserGroups();

		Mockito.verifyNoInteractions(_userGroupResource);

		_failedReadExternalReferenceCode = null;

		Mockito.when(
			_entitlementService.getActiveEntitlementsByNames(Mockito.anyList())
		).thenThrow(
			new IllegalStateException("Unable to get the entitlements")
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verifyNoInteractions(_userGroupResource);
	}

	@Test
	public void testReconcileUserGroupsWritesNothingWhenTheEmailAddressReadFails()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockProjectMemberships(10);
		_mockUserGroupUsers(_PARTNERS, 15);

		Mockito.when(
			_userAccountService.getUserAccounts(
				Mockito.anyCollection(), Mockito.eq("emailAddress,id"))
		).thenThrow(
			new IllegalStateException("Unable to get the users")
		);

		_userGroupService.reconcileUserGroups();

		Mockito.verifyNoInteractions(_oktaService, _userGroupResource);
	}

	private Entitlement _createEntitlement(
		long accountEntryId, String name, String projectExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", _nextEntitlementId++
		).put(
			"name", name
		);

		if (accountEntryId > 0) {
			jsonObject.put(
				"r_accountEntryToEntitlement_accountEntryId", accountEntryId);
		}

		if (projectExternalReferenceCode != null) {
			jsonObject.put(
				"r_projectToEntitlement_c_projectERC",
				projectExternalReferenceCode);
		}

		return new Entitlement(jsonObject);
	}

	private UserAccount _createMemberUserAccount(
		String alternateName, long userId) {

		UserAccount userAccount = new UserAccount();

		userAccount.setAlternateName(alternateName);
		userAccount.setId(userId);

		return userAccount;
	}

	private Page<UserAccount> _createPage(UserAccount... userAccounts) {
		Page<UserAccount> page = Mockito.mock(Page.class);

		Mockito.when(
			page.getItems()
		).thenReturn(
			Arrays.asList(userAccounts)
		);

		return page;
	}

	private List<ProjectMembership> _createProjectMemberships(long... userIds) {
		List<ProjectMembership> projectMemberships = new ArrayList<>();

		for (long userId : userIds) {
			projectMemberships.add(
				new ProjectMembership(
					new JSONObject(
					).put(
						"r_projectToProjectMembership_c_projectERC",
						_PROJECT_EXTERNAL_REFERENCE_CODE
					).put(
						"r_userToProjectMembership_userId", userId
					)));
		}

		return projectMemberships;
	}

	private RoleBrief _createRoleBrief(String name) {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setName(name);

		return roleBrief;
	}

	private UserAccount _createUserAccount(
		long accountId, String accountRoleName, long userId) {

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(accountId);
		accountBrief.setRoleBriefs(
			new RoleBrief[] {_createRoleBrief(accountRoleName)});

		UserAccount userAccount = new UserAccount();

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
		userAccount.setId(userId);

		return userAccount;
	}

	private long[] _createUserIds(int count) {
		long[] userIds = new long[count];

		for (int i = 0; i < count; i++) {
			userIds[i] = i + 1;
		}

		return userIds;
	}

	private String _getEmailAddress(long userId) {
		return "user-" + userId + "@example.com";
	}

	private void _mockAccountUserAccounts(
			long accountEntryId, UserAccount... userAccounts)
		throws Exception {

		Mockito.when(
			_userAccountService.getAccountUserAccounts(
				accountEntryId, "accountBriefs,id")
		).thenReturn(
			Arrays.asList(userAccounts)
		);
	}

	private void _mockEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementsByNames(Mockito.anyList())
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _mockProjectMemberships(long... userIds) throws Exception {
		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				Mockito.<Collection<String>>any())
		).thenReturn(
			_createProjectMemberships(userIds)
		);
	}

	private void _mockUserAccount(long userId) throws Exception {
		UserAccount userAccount = new UserAccount();

		userAccount.setId(userId);

		Mockito.when(
			_userAccountService.getUserAccount(userId)
		).thenReturn(
			userAccount
		);
	}

	private void _mockUserGroupUsers(
		String externalReferenceCode, long... userIds) {

		UserAccount[] userAccounts = new UserAccount[userIds.length];

		for (int i = 0; i < userIds.length; i++) {
			userAccounts[i] = _createMemberUserAccount(
				"user-" + userIds[i], userIds[i]);
		}

		_userGroupUsersPages.put(
			externalReferenceCode,
			new ArrayList<>(
				Collections.singletonList(_createPage(userAccounts))));
	}

	private static final long _CUSTOMER_ACCOUNT_ID = 11111;

	private static final long _PARTNER_ACCOUNT_ID = 11112;

	private static final String _PARTNERS = "C_PARTNERS";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final String _SUPPORT_CUSTOMERS = "C_SUPPORT_CUSTOMERS";

	private final Page<UserAccount> _emptyPage = _createPage();
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private String _failedReadExternalReferenceCode;
	private long _nextEntitlementId = 1;
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private final UserAccountResource _userAccountResource = Mockito.mock(
		UserAccountResource.class);
	private UserAccountResource.Builder _userAccountResourceBuilder;
	private MockedStatic<UserAccountResource> _userAccountResourceMockedStatic;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserGroupResource _userGroupResource = Mockito.mock(
		UserGroupResource.class);
	private MockedStatic<UserGroupResource> _userGroupResourceMockedStatic;

	private final UserGroupService _userGroupService = new UserGroupService() {

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

		@Override
		protected String getDXPEndpointAddress() {
			return "localhost:8080";
		}

	};

	private final Map<String, List<Page<UserAccount>>> _userGroupUsersPages =
		new HashMap<>();

}