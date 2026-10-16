/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.resource.v1_0.UserGroupResource;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ProjectMembership;

import java.time.Duration;
import java.time.Instant;

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
@DisplayName("[CRON-SYNCUSERGROUPS] UserGroupService#syncUserGroups")
public class UserGroupServiceSyncTest {

	@BeforeEach
	public void setUp() throws Exception {
		UserGroupResource.Builder builder = Mockito.mock(
			UserGroupResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			Mockito.mock(UserGroupResource.class)
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
			_userGroupService, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_userGroupService, "_userAccountService", _userAccountService);

		_mockEntitlements();
	}

	@AfterEach
	public void tearDown() {
		_userGroupResourceMockedStatic.close();
	}

	@Test
	public void testSyncUserGroupsContinuesAfterAUserFailure()
		throws Exception {

		_mockEntitlements(_createEntitlement(_ACCOUNT_ID, null));
		_mockAccountUserAccounts(_ACCOUNT_ID, 10, 11);
		_mockUserAccount(11);

		Mockito.when(
			_userAccountService.getUserAccount(10)
		).thenThrow(
			new IllegalStateException("Unable to get the user")
		);

		_userGroupService.syncUserGroups();

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			10
		);

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			11
		);
	}

	@Test
	public void testSyncUserGroupsLooksBackThirtyMinutesOnEveryRun()
		throws Exception {

		_userGroupService.syncUserGroups();

		Thread.sleep(2);

		_userGroupService.syncUserGroups();

		_captureChangedEntitlementsCalls(2);

		List<Instant> endInstants = _endInstantCaptor.getAllValues();
		List<Instant> startInstants = _startInstantCaptor.getAllValues();

		for (int i = 0; i < endInstants.size(); i++) {
			Assertions.assertEquals(
				_LOOK_BACK,
				Duration.between(startInstants.get(i), endInstants.get(i)));
		}

		Assertions.assertTrue(
			startInstants.get(
				1
			).isAfter(
				startInstants.get(0)
			));
	}

	@Test
	public void testSyncUserGroupsReleasesTheGuardAndSkipsAConcurrentRun()
		throws Exception {

		Mockito.when(
			_entitlementService.getChangedEntitlements(
				Mockito.any(), Mockito.anyList(), Mockito.any())
		).thenAnswer(
			invocation -> {
				_userGroupService.syncUserGroups();

				return Collections.emptyList();
			}
		).thenReturn(
			Collections.emptyList()
		);

		_userGroupService.syncUserGroups();

		Mockito.verify(
			_entitlementService
		).getChangedEntitlements(
			Mockito.any(), Mockito.anyList(), Mockito.any()
		);

		_userGroupService.syncUserGroups();

		Mockito.verify(
			_entitlementService, Mockito.times(2)
		).getChangedEntitlements(
			Mockito.any(), Mockito.anyList(), Mockito.any()
		);
	}

	@Test
	public void testSyncUserGroupsSyncsAUserOnceWhenTheUserIsOnTwoAccounts()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(_ACCOUNT_ID, _PROJECT_EXTERNAL_REFERENCE_CODE),
			_createEntitlement(_OTHER_ACCOUNT_ID, null));
		_mockAccountUserAccounts(_ACCOUNT_ID, 10);
		_mockAccountUserAccounts(_OTHER_ACCOUNT_ID, 10);
		_mockProjectMemberships(10);
		_mockUserAccount(10);

		_userGroupService.syncUserGroups();

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			10
		);
	}

	@Test
	public void testSyncUserGroupsSyncsTheMembersOfTheChangedAccountsAndProjects()
		throws Exception {

		_mockEntitlements(
			_createEntitlement(_ACCOUNT_ID, null),
			_createEntitlement(0, _PROJECT_EXTERNAL_REFERENCE_CODE));
		_mockAccountUserAccounts(_ACCOUNT_ID, 10);
		_mockProjectMemberships(11);
		_mockUserAccount(10);
		_mockUserAccount(11);

		_userGroupService.syncUserGroups();

		Mockito.verify(
			_userAccountService
		).getAccountUserAccounts(
			_ACCOUNT_ID
		);

		Mockito.verify(
			_userAccountService, Mockito.never()
		).getAccountUserAccounts(
			0L
		);

		ArgumentCaptor<Collection<String>> projectCaptor =
			ArgumentCaptor.forClass(Collection.class);

		Mockito.verify(
			_projectMembershipService
		).getProjectMemberships(
			projectCaptor.capture()
		);

		Assertions.assertEquals(
			new HashSet<>(Arrays.asList(_PROJECT_EXTERNAL_REFERENCE_CODE)),
			new HashSet<>(projectCaptor.getValue()));

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			10
		);

		Mockito.verify(
			_userAccountService
		).getUserAccount(
			11
		);
	}

	private void _captureChangedEntitlementsCalls(int times) throws Exception {
		Mockito.verify(
			_entitlementService, Mockito.times(times)
		).getChangedEntitlements(
			_endInstantCaptor.capture(), Mockito.anyList(),
			_startInstantCaptor.capture()
		);
	}

	private Entitlement _createEntitlement(
		long accountEntryId, String projectExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", _nextEntitlementId++
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

	private void _mockAccountUserAccounts(long accountEntryId, long... userIds)
		throws Exception {

		List<UserAccount> userAccounts = new ArrayList<>();

		for (long userId : userIds) {
			UserAccount userAccount = new UserAccount();

			userAccount.setId(userId);

			userAccounts.add(userAccount);
		}

		Mockito.when(
			_userAccountService.getAccountUserAccounts(accountEntryId)
		).thenReturn(
			userAccounts
		);
	}

	private void _mockEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getChangedEntitlements(
				Mockito.any(), Mockito.anyList(), Mockito.any())
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _mockProjectMemberships(long... userIds) throws Exception {
		List<ProjectMembership> projectMemberships = new ArrayList<>();

		for (long userId : userIds) {
			projectMemberships.add(
				new ProjectMembership(
					new JSONObject(
					).put(
						"r_userToProjectMembership_userId", userId
					)));
		}

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				Mockito.<Collection<String>>any())
		).thenReturn(
			projectMemberships
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

	private static final long _ACCOUNT_ID = 11111;

	private static final Duration _LOOK_BACK = Duration.ofMinutes(30);

	private static final long _OTHER_ACCOUNT_ID = 11112;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private final ArgumentCaptor<Instant> _endInstantCaptor =
		ArgumentCaptor.forClass(Instant.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private long _nextEntitlementId = 1;
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private final ArgumentCaptor<Instant> _startInstantCaptor =
		ArgumentCaptor.forClass(Instant.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
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