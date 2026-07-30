/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountSynchronizer;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Ricardo Mariz
 */
public class OrganizationsRestControllerTest {

	@Test
	public void testDeleteUserAccountsOrganizationRoleSyncsMembershipToJSM()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		Organization organization = _setUpOrganization();

		Role role = new Role();

		role.setExternalReferenceCode("ROLE-ERC-1");

		Mockito.when(
			_roleService.getRole(_ROLE_ID)
		).thenReturn(
			role
		);

		UserAccount userAccount = _createUserAccount("ana@example.com");

		userAccount.setExternalReferenceCode("USER-ERC-1");

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		organizationsRestController.deleteUserAccountsOrganizationRole(
			null, _ORGANIZATION_ID, _USER_ID, _ROLE_ID);

		Mockito.verify(
			_roleService
		).removeOrganizationUserAccountRole(
			_ORGANIZATION_ID, _ROLE_ID, _USER_ID
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncUnassignRole(
			"ROLE-ERC-1", "USER-ERC-1", _ORGANIZATION_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_organizationUserAccountSynchronizer
		).syncOrganizationUserAccountMembership(
			organization, userAccount
		);
	}

	@Test
	public void testPostSyncFromOktaChecksAdminPermission() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> organizationsRestController.postSyncFromOkta(
				null, _ORGANIZATION_ID));

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testPostSyncFromOktaIgnoresEmailAddressCase() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("Ana@Example.com");
		_setUpOrganizationUserAccounts("ana@example.com");

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verifyNoInteractions(_organizationService);
	}

	@Test
	public void testPostSyncFromOktaReconcilesMembership() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("ana@example.com", "carla@example.com");
		_setUpOrganizationUserAccounts("ana@example.com", "daniel@example.com");

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verify(
			_organizationService
		).addOrganizationUserAccountByEmailAddress(
			"carla@example.com", _ORGANIZATION_ID
		);

		Mockito.verify(
			_organizationService
		).removeOrganizationUserAccountByEmailAddress(
			"daniel@example.com", _ORGANIZATION_ID
		);

		Mockito.verifyNoMoreInteractions(_organizationService);
	}

	@Test
	public void testPostSyncFromOktaRejectsOrganizationWithoutOktaGroup()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> organizationsRestController.postSyncFromOkta(
					null, _ORGANIZATION_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testPostSyncFromOktaSkipsOktaUsersWithoutEmailAddress()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("ana@example.com", null);
		_setUpOrganizationUserAccounts("ana@example.com");

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verifyNoInteractions(_organizationService);
	}

	@Test
	public void testPostUserAccountsOrganizationRoleSyncsMembershipToJSM()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		Organization organization = _setUpOrganization();

		Role role = new Role();

		role.setExternalReferenceCode("ROLE-ERC-1");

		Mockito.when(
			_roleService.getRole(_ROLE_ID)
		).thenReturn(
			role
		);

		UserAccount userAccount = _createUserAccount("ana@example.com");

		userAccount.setExternalReferenceCode("USER-ERC-1");

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		organizationsRestController.postUserAccountsOrganizationRole(
			null, _ORGANIZATION_ID, _USER_ID, _ROLE_ID);

		Mockito.verify(
			_roleService
		).addOrganizationUserAccountRole(
			_ORGANIZATION_ID, _ROLE_ID, _USER_ID
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncAssignRole(
			"ROLE-ERC-1", "USER-ERC-1", _ORGANIZATION_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_organizationUserAccountSynchronizer
		).syncOrganizationUserAccountMembership(
			organization, userAccount
		);
	}

	private OrganizationsRestController _createController() {
		OrganizationsRestController organizationsRestController =
			new OrganizationsRestController();

		ReflectionTestUtils.setField(
			organizationsRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			organizationsRestController, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_organizationService",
			_organizationService);
		ReflectionTestUtils.setField(
			organizationsRestController,
			"_organizationUserAccountRoleSynchronizer",
			_organizationUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			organizationsRestController, "_organizationUserAccountSynchronizer",
			_organizationUserAccountSynchronizer);
		ReflectionTestUtils.setField(
			organizationsRestController, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_roleService", _roleService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_userAccountService",
			_userAccountService);

		return organizationsRestController;
	}

	private OktaUser _createOktaUser(String emailAddress) {
		OktaUser oktaUser = Mockito.mock(OktaUser.class);

		Mockito.when(
			oktaUser.getEmail()
		).thenReturn(
			emailAddress
		);

		return oktaUser;
	}

	private UserAccount _createUserAccount(String emailAddress) {
		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(emailAddress);

		return userAccount;
	}

	private void _setUpOktaGroup(String... emailAddresses) throws Exception {
		Mockito.when(
			_propertyService.getPropertyValue(
				com.liferay.portal.kernel.model.Organization.class.getName(),
				_ORGANIZATION_ID, PropertyConstants.NAME_OKTA_GROUP)
		).thenReturn(
			_OKTA_GROUP_ID
		);

		List<OktaUser> oktaUsers = Arrays.stream(
			emailAddresses
		).map(
			this::_createOktaUser
		).toList();

		Mockito.when(
			_oktaService.getGroupContacts(_OKTA_GROUP_ID)
		).thenReturn(
			oktaUsers
		);
	}

	private Organization _setUpOrganization() throws Exception {
		Organization organization = new Organization();

		organization.setExternalReferenceCode(
			_ORGANIZATION_EXTERNAL_REFERENCE_CODE);
		organization.setId(String.valueOf(_ORGANIZATION_ID));

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenReturn(
			organization
		);

		return organization;
	}

	private void _setUpOrganizationUserAccounts(String... emailAddresses)
		throws Exception {

		List<UserAccount> userAccounts = Arrays.stream(
			emailAddresses
		).map(
			this::_createUserAccount
		).toList();

		Mockito.when(
			_userAccountService.getOrganizationUserAccounts(_ORGANIZATION_ID)
		).thenReturn(
			userAccounts
		);
	}

	private static final String _OKTA_GROUP_ID = "00g1abcd2efGHIJK3l4m";

	private static final String _ORGANIZATION_EXTERNAL_REFERENCE_CODE = "ORG-1";

	private static final long _ORGANIZATION_ID = 44444;

	private static final long _ROLE_ID = 55555;

	private static final long _USER_ID = 22222;

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final OrganizationService _organizationService = Mockito.mock(
		OrganizationService.class);
	private final OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer = Mockito.mock(
			OrganizationUserAccountRoleSynchronizer.class);
	private final OrganizationUserAccountSynchronizer
		_organizationUserAccountSynchronizer = Mockito.mock(
			OrganizationUserAccountSynchronizer.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);
	private final RoleService _roleService = Mockito.mock(RoleService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}