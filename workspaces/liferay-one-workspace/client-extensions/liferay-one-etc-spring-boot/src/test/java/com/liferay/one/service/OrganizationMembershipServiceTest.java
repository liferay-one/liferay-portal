/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.model.Property;
import com.liferay.one.okta.service.OktaService;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class OrganizationMembershipServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_organization = new Organization();

		_organization.setExternalReferenceCode(_ORGANIZATION_ERC);

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenReturn(
			_organization
		);

		_updatedUserAccount = new UserAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_updatedUserAccount
		);

		_userAccount = new UserAccount();

		_userAccount.setEmailAddress(_EMAIL_ADDRESS);
		_userAccount.setExternalReferenceCode(_USER_ERC);
		_userAccount.setId(_USER_ID);

		ReflectionTestUtils.setField(
			_organizationMembershipService, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			_organizationMembershipService, "_organizationService",
			_organizationService);
		ReflectionTestUtils.setField(
			_organizationMembershipService, "_organizationSynchronizer",
			_organizationSynchronizer);
		ReflectionTestUtils.setField(
			_organizationMembershipService,
			"_organizationUserAccountRoleSynchronizer",
			_organizationUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			_organizationMembershipService, "_propertyService",
			_propertyService);
		ReflectionTestUtils.setField(
			_organizationMembershipService, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			_organizationMembershipService, "_userAccountSynchronizer",
			_userAccountSynchronizer);
	}

	@Test
	public void testAddOrganizationUserAccountAddsMemberAndSyncsToJSM()
		throws Exception {

		_organizationMembershipService.addOrganizationUserAccount(
			_ORGANIZATION_ID, _userAccount);

		InOrder inOrder = Mockito.inOrder(
			_organizationService, _organizationSynchronizer,
			_userAccountSynchronizer);

		inOrder.verify(
			_organizationService
		).addOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			_updatedUserAccount
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			_updatedUserAccount
		);

		inOrder.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			_organization
		);

		Mockito.verifyNoInteractions(_organizationUserAccountRoleSynchronizer);
	}

	@Test
	public void testAddOrganizationUserAccountContinuesWhenJSMSyncFails()
		throws Exception {

		Mockito.doThrow(
			new RuntimeException()
		).when(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			_updatedUserAccount
		);

		Assertions.assertDoesNotThrow(
			() -> _organizationMembershipService.addOrganizationUserAccount(
				_ORGANIZATION_ID, _userAccount));

		Mockito.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			_organization
		);
	}

	@Test
	public void testRemoveOrganizationUserAccountUnassignsContactRolesFirst()
		throws Exception {

		_setOrganizationBrief(_ORGANIZATION_ERC, _ROLE_ERC);

		_organizationMembershipService.removeOrganizationUserAccount(
			_ORGANIZATION_ID, _userAccount);

		InOrder inOrder = Mockito.inOrder(
			_organizationService, _organizationSynchronizer,
			_organizationUserAccountRoleSynchronizer, _userAccountSynchronizer);

		inOrder.verify(
			_organizationUserAccountRoleSynchronizer
		).syncUnassignRole(
			_ROLE_ERC, _USER_ERC, _ORGANIZATION_ERC
		);

		inOrder.verify(
			_organizationService
		).removeOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			_updatedUserAccount
		);

		inOrder.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			_organization
		);
	}

	@Test
	public void testSyncOktaGroupOrganizationsAddsMissingMembership()
		throws Exception {

		_mockOktaGroupOrganizations(_GROUP_ID);

		_organizationMembershipService.syncOktaGroupOrganizations(_userAccount);

		Mockito.verify(
			_organizationService
		).addOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		Mockito.verify(
			_organizationService, Mockito.never()
		).removeOrganizationUserAccountByEmailAddress(
			Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testSyncOktaGroupOrganizationsLeavesUnlinkedOrganizations()
		throws Exception {

		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setId(_UNLINKED_ORGANIZATION_ID);

		_userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {organizationBrief});

		_mockOktaGroupOrganizations();

		_organizationMembershipService.syncOktaGroupOrganizations(_userAccount);

		Mockito.verify(
			_organizationService, Mockito.never()
		).addOrganizationUserAccountByEmailAddress(
			Mockito.any(), Mockito.anyLong()
		);

		Mockito.verify(
			_organizationService, Mockito.never()
		).removeOrganizationUserAccountByEmailAddress(
			Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testSyncOktaGroupOrganizationsRemovesStaleMembership()
		throws Exception {

		_setOrganizationBrief(_ORGANIZATION_ERC, _ROLE_ERC);

		_mockOktaGroupOrganizations();

		_organizationMembershipService.syncOktaGroupOrganizations(_userAccount);

		Mockito.verify(
			_organizationService
		).removeOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		Mockito.verify(
			_organizationService, Mockito.never()
		).addOrganizationUserAccountByEmailAddress(
			Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testUnassignContactRolesSkipsOtherOrganizations()
		throws Exception {

		_setOrganizationBrief("ORGANIZATION-OTHER", _ROLE_ERC);

		_organizationMembershipService.unassignContactRoles(
			_organization, _userAccount);

		Mockito.verifyNoInteractions(_organizationUserAccountRoleSynchronizer);
	}

	private void _mockOktaGroupOrganizations(String... groupIds)
		throws Exception {

		Mockito.when(
			_oktaService.getContactGroupIds(_EMAIL_ADDRESS)
		).thenReturn(
			List.of(groupIds)
		);

		Mockito.when(
			_propertyService.getProperties(
				com.liferay.portal.kernel.model.Organization.class.getName(),
				PropertyConstants.NAME_OKTA_GROUP)
		).thenReturn(
			List.of(
				new Property(
					new JSONObject(
					).put(
						"classPK", _ORGANIZATION_ID
					).put(
						"id", 1
					).put(
						"value", _GROUP_ID
					)))
		);
	}

	private void _setOrganizationBrief(
		String organizationExternalReferenceCode,
		String roleExternalReferenceCode) {

		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setExternalReferenceCode(roleExternalReferenceCode);

		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setExternalReferenceCode(
			organizationExternalReferenceCode);
		organizationBrief.setId(_ORGANIZATION_ID);
		organizationBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		_userAccount.setOrganizationBriefs(
			new OrganizationBrief[] {organizationBrief});
	}

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _GROUP_ID = "00g-account-access-us";

	private static final String _ORGANIZATION_ERC = "ORGANIZATION-1";

	private static final long _ORGANIZATION_ID = 30L;

	private static final String _ROLE_ERC = "ROLE-1";

	private static final long _UNLINKED_ORGANIZATION_ID = 99L;

	private static final String _USER_ERC = "USER-1";

	private static final long _USER_ID = 42L;

	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private Organization _organization;
	private final OrganizationMembershipService _organizationMembershipService =
		new OrganizationMembershipService();
	private final OrganizationService _organizationService = Mockito.mock(
		OrganizationService.class);
	private final OrganizationSynchronizer _organizationSynchronizer =
		Mockito.mock(OrganizationSynchronizer.class);
	private final OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer = Mockito.mock(
			OrganizationUserAccountRoleSynchronizer.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);
	private UserAccount _updatedUserAccount;
	private UserAccount _userAccount;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAccountSynchronizer _userAccountSynchronizer =
		Mockito.mock(UserAccountSynchronizer.class);

}