/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.dto.v1_0.UserGroupBrief;
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
import java.util.HashSet;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
@DisplayName("[SVC-USERGROUPSERVICE] UserGroupService")
public class UserGroupServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
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

		ReflectionTestUtils.setField(
			_userGroupService, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_userGroupService, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			_userGroupService, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_userGroupService, "_userAccountService", _userAccountService);

		_userAccount = new UserAccount();

		_userAccount.setEmailAddress(_EMAIL_ADDRESS);
		_userAccount.setId(_USER_ID);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_userAccount
		);
	}

	@AfterEach
	public void tearDown() {
		_userGroupResourceMockedStatic.close();
	}

	@Test
	public void testSyncAddsACustomerThroughACustomerRoleAndAnAccountSLA()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Arrays.asList("C_SUPPORT_CUSTOMERS"), Collections.emptyList());
	}

	@Test
	public void testSyncAddsACustomerThroughAProjectMembershipOnly()
		throws Exception {

		_mockProjectMemberships(_PROJECT_EXTERNAL_REFERENCE_CODE);

		_mockEntitlements(
			_createEntitlement(
				0, EntitlementConstants.NAME_PREMIER_24_7_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Arrays.asList("C_SUPPORT_CUSTOMERS"), Collections.emptyList());
	}

	@Test
	public void testSyncAddsACustomerWithAProjectSLAWhenTheAccountSLAExpired()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);

		_mockProjectMemberships(_PROJECT_EXTERNAL_REFERENCE_CODE);

		_mockEntitlements(
			_createEntitlement(
				_OTHER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Arrays.asList("C_SUPPORT_CUSTOMERS"), Collections.emptyList());
	}

	@Test
	public void testSyncAddsAPartnerThroughAPartnerRoleAndAPartnerEntitlement()
		throws Exception {

		_addAccountBrief(
			_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MEMBER);

		_mockEntitlements(
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(Arrays.asList("C_PARTNERS"), Collections.emptyList());
	}

	@Test
	public void testSyncAddsBothGroupsForACustomerAndAPartner()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);
		_addAccountBrief(
			_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MANAGER);

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null),
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Arrays.asList("C_PARTNERS", "C_SUPPORT_CUSTOMERS"),
			Collections.emptyList());
	}

	@Test
	public void testSyncAddsTheUserToTheOktaGroupsOfTheGroupsItJoins()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);
		_addAccountBrief(
			_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MANAGER);

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null),
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		Mockito.verify(
			_oktaService
		).addUserToGroup(
			_EMAIL_ADDRESS, "Customers"
		);

		Mockito.verify(
			_oktaService
		).addUserToGroup(
			_EMAIL_ADDRESS, "Partners"
		);

		Mockito.verifyNoMoreInteractions(_oktaService);
	}

	@Test
	public void testSyncGivesNeitherGroupForACustomerRoleOnAPartnerOnlyAccount()
		throws Exception {

		_addAccountBrief(
			_PARTNER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);

		_mockEntitlements(
			_createEntitlement(
				_PARTNER_ACCOUNT_ID, EntitlementConstants.NAME_PARTNER, null));

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(Collections.emptyList(), Collections.emptyList());
	}

	@Test
	public void testSyncKeepsTheLiferayChangeWhenTheOktaPublishFails()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null));

		Mockito.doThrow(
			new RuntimeException("Unable to publish")
		).when(
			_oktaService
		).addUserToGroup(
			Mockito.anyString(), Mockito.anyString()
		);

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Arrays.asList("C_SUPPORT_CUSTOMERS"), Collections.emptyList());
	}

	@Test
	public void testSyncQueriesTheEntitlementsOfEveryAccountAndProject()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);
		_addAccountBrief(
			_PARTNER_ACCOUNT_ID, RoleConstants.NAME_PARTNER_MEMBER);

		_mockProjectMemberships(_PROJECT_EXTERNAL_REFERENCE_CODE);

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		ArgumentCaptor<Collection<Long>> accountEntryIdsCaptor =
			ArgumentCaptor.forClass(Collection.class);
		ArgumentCaptor<List<String>> namesCaptor = ArgumentCaptor.forClass(
			List.class);
		ArgumentCaptor<Collection<String>> projectCaptor =
			ArgumentCaptor.forClass(Collection.class);

		Mockito.verify(
			_entitlementService
		).getActiveEntitlements(
			accountEntryIdsCaptor.capture(), namesCaptor.capture(),
			projectCaptor.capture()
		);

		Assertions.assertEquals(
			new HashSet<>(
				Arrays.asList(_CUSTOMER_ACCOUNT_ID, _PARTNER_ACCOUNT_ID)),
			new HashSet<>(accountEntryIdsCaptor.getValue()));

		List<String> expectedNames = new ArrayList<>(
			EntitlementConstants.namesSLAs);

		expectedNames.add(EntitlementConstants.NAME_PARTNER);

		Assertions.assertEquals(expectedNames, namesCaptor.getValue());

		Assertions.assertEquals(
			new HashSet<>(Arrays.asList(_PROJECT_EXTERNAL_REFERENCE_CODE)),
			new HashSet<>(projectCaptor.getValue()));
	}

	@Test
	public void testSyncRemovesAUserThatIsNotEligible() throws Exception {
		_mockUserGroups("C_EVERYONE", "C_PARTNERS", "C_SUPPORT_CUSTOMERS");

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(
			Collections.emptyList(),
			Arrays.asList("C_PARTNERS", "C_SUPPORT_CUSTOMERS"));
	}

	@Test
	public void testSyncRemovesTheUserFromTheOktaGroupsOfTheGroupsItLeaves()
		throws Exception {

		_mockUserGroups("C_EVERYONE", "C_PARTNERS", "C_SUPPORT_CUSTOMERS");

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		Mockito.verify(
			_oktaService
		).removeUserFromGroup(
			_EMAIL_ADDRESS, "Customers"
		);

		Mockito.verify(
			_oktaService
		).removeUserFromGroup(
			_EMAIL_ADDRESS, "Partners"
		);

		Mockito.verifyNoMoreInteractions(_oktaService);
	}

	@Test
	public void testSyncSkipsOktaWhenTheLiferayWriteFails() throws Exception {
		_mockUserGroups("C_EVERYONE", "C_PARTNERS");

		Mockito.doThrow(
			new RuntimeException("Unable to remove")
		).when(
			_userGroupResource
		).deleteUserGroupByExternalReferenceCodeUsers(
			Mockito.eq("C_PARTNERS"), Mockito.any(Long[].class)
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> _userGroupService.syncUserAccountUserGroups(_USER_ID));

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testSyncSkipsTheWritesWhenTheGroupsAlreadyMatch()
		throws Exception {

		_addAccountBrief(
			_CUSTOMER_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_MEMBER);

		_mockEntitlements(
			_createEntitlement(
				_CUSTOMER_ACCOUNT_ID, EntitlementConstants.NAME_GOLD_SUPPORT,
				null));
		_mockUserGroups("C_EVERYONE", "C_SUPPORT_CUSTOMERS");

		_userGroupService.syncUserAccountUserGroups(_USER_ID);

		_assertWrites(Collections.emptyList(), Collections.emptyList());

		Mockito.verifyNoInteractions(_oktaService);
	}

	private void _addAccountBrief(long accountId, String accountRoleName) {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setName(accountRoleName);

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(accountId);
		accountBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		AccountBrief[] accountBriefs = _userAccount.getAccountBriefs();

		if (accountBriefs == null) {
			accountBriefs = new AccountBrief[0];
		}

		AccountBrief[] newAccountBriefs = Arrays.copyOf(
			accountBriefs, accountBriefs.length + 1);

		newAccountBriefs[accountBriefs.length] = accountBrief;

		_userAccount.setAccountBriefs(newAccountBriefs);
	}

	private void _assertWrites(
			List<String> addedExternalReferenceCodes,
			List<String> removedExternalReferenceCodes)
		throws Exception {

		for (String externalReferenceCode : addedExternalReferenceCodes) {
			Mockito.verify(
				_userGroupResource
			).postUserGroupByExternalReferenceCodeUsers(
				externalReferenceCode, new Long[] {_USER_ID}
			);
		}

		for (String externalReferenceCode : removedExternalReferenceCodes) {
			Mockito.verify(
				_userGroupResource
			).deleteUserGroupByExternalReferenceCodeUsers(
				externalReferenceCode, new Long[] {_USER_ID}
			);
		}

		Mockito.verifyNoMoreInteractions(_userGroupResource);
	}

	private Entitlement _createEntitlement(
		long accountEntryId, String name, String projectExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", _nextEntitlementId++
		).put(
			"name", name
		).put(
			"r_accountEntryToEntitlement_accountEntryId", accountEntryId
		);

		if (projectExternalReferenceCode != null) {
			jsonObject.put(
				"r_projectToEntitlement_c_projectERC",
				projectExternalReferenceCode);
		}

		return new Entitlement(jsonObject);
	}

	private void _mockEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				Mockito.anyCollection(), Mockito.anyList(),
				Mockito.anyCollection())
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _mockProjectMemberships(
			String... projectExternalReferenceCodes)
		throws Exception {

		List<ProjectMembership> projectMemberships = new ArrayList<>();

		for (String projectExternalReferenceCode :
				projectExternalReferenceCodes) {

			projectMemberships.add(
				new ProjectMembership(
					new JSONObject(
					).put(
						"r_projectToProjectMembership_c_projectERC",
						projectExternalReferenceCode
					).put(
						"r_userToProjectMembership_userId", _USER_ID
					)));
		}

		Mockito.when(
			_projectMembershipService.getProjectMembershipsByUserId(_USER_ID)
		).thenReturn(
			projectMemberships
		);
	}

	private void _mockUserGroups(String... externalReferenceCodes) {
		UserGroupBrief[] userGroupBriefs =
			new UserGroupBrief[externalReferenceCodes.length];

		for (int i = 0; i < externalReferenceCodes.length; i++) {
			UserGroupBrief userGroupBrief = new UserGroupBrief();

			userGroupBrief.setExternalReferenceCode(externalReferenceCodes[i]);

			userGroupBriefs[i] = userGroupBrief;
		}

		_userAccount.setUserGroupBriefs(userGroupBriefs);
	}

	private static final long _CUSTOMER_ACCOUNT_ID = 11111;

	private static final String _EMAIL_ADDRESS = "user@example.com";

	private static final long _OTHER_ACCOUNT_ID = 11113;

	private static final long _PARTNER_ACCOUNT_ID = 11112;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final long _USER_ID = 22222;

	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private long _nextEntitlementId = 1;
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private UserAccount _userAccount;
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

}