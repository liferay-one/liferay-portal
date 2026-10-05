/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.jira.synchronizer.AccountOrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserAssignmentService;
import com.liferay.portal.kernel.model.Organization;
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
	public void testDeleteAccountChecksAdminPermission() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_denyAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> organizationsRestController.deleteAccount(
				null, _ORGANIZATION_ID, _ACCOUNT_ID));

		Mockito.verifyNoInteractions(
			_accountOrganizationSynchronizer, _accountService);
	}

	@Test
	public void testDeleteAccountRemovesAndUnsyncsTheAccount()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpAccountAndOrganization();

		organizationsRestController.deleteAccount(
			null, _ORGANIZATION_ID, _ACCOUNT_ID);

		Mockito.verify(
			_accountService
		).removeOrganizationAccount(
			_ACCOUNT_ID, _ORGANIZATION_ID
		);

		Mockito.verify(
			_accountOrganizationSynchronizer
		).syncUnassignOrganization(
			_ORGANIZATION_ERC, _ACCOUNT_ERC
		);
	}

	@Test
	public void testDeleteAccountSkipsTheJiraSyncWhenTheAccountIsMissing()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		organizationsRestController.deleteAccount(
			null, _ORGANIZATION_ID, _ACCOUNT_ID);

		Mockito.verify(
			_accountService
		).removeOrganizationAccount(
			_ACCOUNT_ID, _ORGANIZATION_ID
		);

		Mockito.verifyNoInteractions(_accountOrganizationSynchronizer);
	}

	@Test
	public void testDeleteAccountSwallowsAJiraSyncFailure() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenThrow(
			new IllegalStateException()
		);

		organizationsRestController.deleteAccount(
			null, _ORGANIZATION_ID, _ACCOUNT_ID);

		Mockito.verify(
			_accountService
		).removeOrganizationAccount(
			_ACCOUNT_ID, _ORGANIZATION_ID
		);

		Mockito.verifyNoInteractions(_accountOrganizationSynchronizer);
	}

	@Test
	public void testDeleteUserAccountsOrganizationRoleUnassignsRole()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		organizationsRestController.deleteUserAccountsOrganizationRole(
			null, _ORGANIZATION_ID, _USER_ID, _ROLE_ID);

		Mockito.verify(
			_userAssignmentService
		).unassignOrganizationRole(
			_ORGANIZATION_ID, _ROLE_ID, _USER_ID
		);
	}

	@Test
	public void testPostAccountAddsAndSyncsTheAccount() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpAccountAndOrganization();

		organizationsRestController.postAccount(
			null, _ORGANIZATION_ID, _ACCOUNT_ID);

		Mockito.verify(
			_accountService
		).addOrganizationAccount(
			_ACCOUNT_ID, _ORGANIZATION_ID
		);

		Mockito.verify(
			_accountOrganizationSynchronizer
		).syncAssignOrganization(
			_ORGANIZATION_ERC, _ACCOUNT_ERC
		);
	}

	@Test
	public void testPostAccountChecksAdminPermission() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_denyAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> organizationsRestController.postAccount(
				null, _ORGANIZATION_ID, _ACCOUNT_ID));

		Mockito.verifyNoInteractions(
			_accountOrganizationSynchronizer, _accountService);
	}

	@Test
	public void testPostAccountSkipsTheJiraSyncWhenTheAccountIsMissing()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		organizationsRestController.postAccount(
			null, _ORGANIZATION_ID, _ACCOUNT_ID);

		Mockito.verify(
			_accountService
		).addOrganizationAccount(
			_ACCOUNT_ID, _ORGANIZATION_ID
		);

		Mockito.verifyNoInteractions(
			_accountOrganizationSynchronizer, _organizationService);
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

		Mockito.verifyNoInteractions(_oktaService, _userAssignmentService);
	}

	@Test
	public void testPostSyncFromOktaIgnoresEmailAddressCase() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("Ana@Example.com");
		_setUpOrganizationUserAccounts(
			_createUserAccount("ana@example.com", 1));

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostSyncFromOktaReconcilesMembership() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("ana@example.com", "carla@example.com");
		_setUpOrganizationUserAccounts(
			_createUserAccount("ana@example.com", 1),
			_createUserAccount("daniel@example.com", 3));

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(
				"carla@example.com")
		).thenReturn(
			_createUserAccount("carla@example.com", 2)
		);

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verify(
			_userAssignmentService
		).assignOrganization(
			_ORGANIZATION_ID, 2
		);

		Mockito.verify(
			_userAssignmentService
		).unassignOrganization(
			_ORGANIZATION_ID, 3
		);

		Mockito.verifyNoMoreInteractions(_userAssignmentService);
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

		Mockito.verifyNoInteractions(_oktaService, _userAssignmentService);
	}

	@Test
	public void testPostSyncFromOktaSkipsOktaUsersWithoutEmailAddress()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("ana@example.com", null);
		_setUpOrganizationUserAccounts(
			_createUserAccount("ana@example.com", 1));

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostSyncFromOktaSkipsOktaUsersWithoutUserAccount()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		_setUpOktaGroup("carla@example.com");
		_setUpOrganizationUserAccounts();

		organizationsRestController.postSyncFromOkta(null, _ORGANIZATION_ID);

		Mockito.verify(
			_userAccountService
		).fetchUserAccountByEmailAddress(
			"carla@example.com"
		);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostSyncToJSMChecksAdminPermission() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		_denyAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> organizationsRestController.postSyncToJSM(
				null, _ORGANIZATION_ID));

		Mockito.verifyNoInteractions(
			_organizationService, _organizationSynchronizer);
	}

	@Test
	public void testPostSyncToJSMPropagatesAnUnknownOrganization()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenThrow(
			new IllegalStateException("No organization " + _ORGANIZATION_ID)
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> organizationsRestController.postSyncToJSM(
				null, _ORGANIZATION_ID));

		Mockito.verifyNoInteractions(_organizationSynchronizer);
	}

	@Test
	public void testPostSyncToJSMSyncsTheOrganization() throws Exception {
		OrganizationsRestController organizationsRestController =
			_createController();

		com.liferay.headless.admin.user.client.dto.v1_0.Organization
			organization = _setUpOrganization();

		organizationsRestController.postSyncToJSM(null, _ORGANIZATION_ID);

		Mockito.verify(
			_organizationSynchronizer
		).syncOrganization(
			organization
		);
	}

	@Test
	public void testPostUserAccountsOrganizationRoleAssignsRole()
		throws Exception {

		OrganizationsRestController organizationsRestController =
			_createController();

		organizationsRestController.postUserAccountsOrganizationRole(
			null, _ORGANIZATION_ID, _USER_ID, _ROLE_ID);

		Mockito.verify(
			_userAssignmentService
		).assignOrganizationRole(
			_ORGANIZATION_ID, _ROLE_ID, _USER_ID
		);
	}

	private OrganizationsRestController _createController() {
		OrganizationsRestController organizationsRestController =
			new OrganizationsRestController();

		ReflectionTestUtils.setField(
			organizationsRestController, "_accountOrganizationSynchronizer",
			_accountOrganizationSynchronizer);
		ReflectionTestUtils.setField(
			organizationsRestController, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			organizationsRestController, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_organizationService",
			_organizationService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_organizationSynchronizer",
			_organizationSynchronizer);
		ReflectionTestUtils.setField(
			organizationsRestController, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			organizationsRestController, "_userAssignmentService",
			_userAssignmentService);

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

	private UserAccount _createUserAccount(String emailAddress, long id) {
		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(emailAddress);
		userAccount.setId(id);

		return userAccount;
	}

	private void _denyAdminPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			null
		);
	}

	private void _setUpAccountAndOrganization() throws Exception {
		Account account = new Account();

		account.setExternalReferenceCode(_ACCOUNT_ERC);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		_setUpOrganization();
	}

	private void _setUpOktaGroup(String... emailAddresses) throws Exception {
		Mockito.when(
			_propertyService.getPropertyValue(
				Organization.class.getName(), _ORGANIZATION_ID,
				PropertyConstants.NAME_OKTA_GROUP)
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

	private com.liferay.headless.admin.user.client.dto.v1_0.Organization
			_setUpOrganization()
		throws Exception {

		com.liferay.headless.admin.user.client.dto.v1_0.Organization
			organization =
				new com.liferay.headless.admin.user.client.dto.v1_0.
					Organization();

		organization.setExternalReferenceCode(_ORGANIZATION_ERC);

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenReturn(
			organization
		);

		return organization;
	}

	private void _setUpOrganizationUserAccounts(UserAccount... userAccounts)
		throws Exception {

		Mockito.when(
			_userAccountService.getOrganizationUserAccounts(_ORGANIZATION_ID)
		).thenReturn(
			Arrays.asList(userAccounts)
		);
	}

	private static final String _ACCOUNT_ERC = "ACCNT-1";

	private static final long _ACCOUNT_ID = 33333;

	private static final String _OKTA_GROUP_ID = "00g1abcd2efGHIJK3l4m";

	private static final String _ORGANIZATION_ERC = "ORG-1";

	private static final long _ORGANIZATION_ID = 44444;

	private static final long _ROLE_ID = 55555;

	private static final long _USER_ID = 22222;

	private final AccountOrganizationSynchronizer
		_accountOrganizationSynchronizer = Mockito.mock(
			AccountOrganizationSynchronizer.class);
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final OrganizationService _organizationService = Mockito.mock(
		OrganizationService.class);
	private final OrganizationSynchronizer _organizationSynchronizer =
		Mockito.mock(OrganizationSynchronizer.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAssignmentService _userAssignmentService = Mockito.mock(
		UserAssignmentService.class);

}