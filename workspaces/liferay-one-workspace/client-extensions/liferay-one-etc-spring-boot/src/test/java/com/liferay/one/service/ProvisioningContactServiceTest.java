/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.salesforce.model.SalesforceModelTestUtil;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
public class ProvisioningContactServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_provisioningContactService = new ProvisioningContactService();

		_accountRoleService = Mockito.mock(AccountRoleService.class);
		_emailAddressValidatorService = Mockito.mock(
			EmailAddressValidatorService.class);
		_projectService = Mockito.mock(ProjectService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);
		_userAssignmentService = Mockito.mock(UserAssignmentService.class);

		_account = new Account();

		_account.setId(_ACCOUNT_ID);

		_accountRole = _createAccountRole(_ACCOUNT_ROLE_ID);

		Mockito.when(
			_userAccountService.hasUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			true
		);

		ReflectionTestUtils.setField(
			_provisioningContactService, "_accountRoleService",
			_accountRoleService);
		ReflectionTestUtils.setField(
			_provisioningContactService, "_emailAddressValidatorService",
			_emailAddressValidatorService);
		ReflectionTestUtils.setField(
			_provisioningContactService, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_provisioningContactService, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			_provisioningContactService, "_userAssignmentService",
			_userAssignmentService);
	}

	@Test
	public void testAddProjectContactsAssignsProjectRoleWhenProjectPresent()
		throws Exception {

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		Project project = new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", "SF-PROJ-1"
			));

		Mockito.when(
			_projectService.fetchProject("SF-PROJ-1")
		).thenReturn(
			project
		);

		_provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)),
			_createSalesforceProject(), new ArrayList<>());

		Mockito.verify(
			_userAssignmentService
		).assignProjectRole(
			project, RoleConstants.ERC_PROJECT_USER, _USER_ID
		);
	}

	@Test
	public void testAddProjectContactsCreatesNewContact() throws Exception {
		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		List<String> warningMessages = new ArrayList<>();

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			warningMessages);

		Mockito.verify(
			_userAccountService
		).addUserAccount(
			_EMAIL_ADDRESS, _LAST_NAME, _FIRST_NAME
		);

		InOrder inOrder = Mockito.inOrder(_userAssignmentService);

		inOrder.verify(
			_userAssignmentService
		).assignAccount(
			_account, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, _accountRole, _USER_ID
		);

		Assertions.assertEquals(List.of(_USER_ID), userIds);
		Assertions.assertTrue(warningMessages.isEmpty());
	}

	@Test
	public void testAddProjectContactsIsolatesPerContactFailures()
		throws Exception {

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenThrow(
			new RuntimeException("Unable to fetch user account")
		);

		UserAccount secondUserAccount = new UserAccount();

		secondUserAccount.setId(_SECOND_USER_ID);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(
				_SECOND_EMAIL_ADDRESS)
		).thenReturn(
			secondUserAccount
		);

		_mockContactAccountRole();

		List<String> warningMessages = new ArrayList<>();

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account,
			List.of(
				_createContactRole(_CONTACT_ROLE),
				_createContactRole(
					_CONTACT_ROLE, _SECOND_EMAIL_ADDRESS, _FIRST_NAME,
					_LAST_NAME)),
			null, warningMessages);

		Assertions.assertEquals(List.of(_SECOND_USER_ID), userIds);

		Assertions.assertEquals(1, warningMessages.size());
	}

	@Test
	public void testAddProjectContactsPromotesFirstUserToAdministrator()
		throws Exception {

		Mockito.when(
			_userAccountService.hasUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			false
		);

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		AccountRole administratorAccountRole = _mockAdministratorAccountRole();

		_provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			new ArrayList<>());

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			_account, administratorAccountRole, _USER_ID
		);
	}

	@Test
	public void testAddProjectContactsSkipsAutoPromotionWhenDesignatedAdministratorPresent()
		throws Exception {

		Mockito.when(
			_userAccountService.hasUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			false
		);

		_mockContactAccountRole();
		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);

		AccountRole administratorAccountRole = _mockAdministratorAccountRole();

		_mockNewUserAccount(_SECOND_EMAIL_ADDRESS, _SECOND_USER_ID);

		_provisioningContactService.addProjectContacts(
			_account,
			List.of(
				_createContactRole(RoleConstants.NAME_ACCOUNT_ADMINISTRATOR),
				_createContactRole(
					_CONTACT_ROLE, _SECOND_EMAIL_ADDRESS, _FIRST_NAME,
					_LAST_NAME)),
			null, new ArrayList<>());

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignAccountRole(
			_account, administratorAccountRole, _SECOND_USER_ID
		);
	}

	@Test
	public void testAddProjectContactsSkipsExistingMember() throws Exception {
		UserAccount existingUserAccount = new UserAccount();

		existingUserAccount.setId(_USER_ID);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			existingUserAccount
		);

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			new ArrayList<>());

		Assertions.assertTrue(userIds.isEmpty());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testAddProjectContactsSkipsLiferayDomainEmail()
		throws Exception {

		Mockito.when(
			_emailAddressValidatorService.isLiferayDomain(_EMAIL_ADDRESS)
		).thenReturn(
			true
		);

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			new ArrayList<>());

		Assertions.assertTrue(userIds.isEmpty());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testAddProjectContactsSkipsProjectRoleWhenProjectIsMissing()
		throws Exception {

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)),
			_createSalesforceProject(), new ArrayList<>());

		Assertions.assertEquals(List.of(_USER_ID), userIds);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testAddProjectContactsWarnsOnUnknownContactRole()
		throws Exception {

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);

		List<String> warningMessages = new ArrayList<>();

		_provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			warningMessages);

		Assertions.assertEquals(1, warningMessages.size());
		Assertions.assertTrue(
			warningMessages.get(
				0
			).contains(
				"Unable to find account role"
			));

		Mockito.verify(
			_userAssignmentService
		).assignAccount(
			_account, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignAccountRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testAddProjectContactsWarnsWhenAdministratorRoleIsMissing()
		throws Exception {

		Mockito.when(
			_userAccountService.hasUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			false
		);

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		List<String> warningMessages = new ArrayList<>();

		_provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			warningMessages);

		Assertions.assertEquals(1, warningMessages.size());
		Assertions.assertTrue(
			warningMessages.get(
				0
			).contains(
				"Unable to find account role " +
					RoleConstants.NAME_ACCOUNT_ADMINISTRATOR
			));

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testAddProjectContactsWarnsWhenAssignmentFails()
		throws Exception {

		_mockNewUserAccount(_EMAIL_ADDRESS, _USER_ID);
		_mockContactAccountRole();

		Mockito.doThrow(
			new RuntimeException("Unable to assign account")
		).when(
			_userAssignmentService
		).assignAccount(
			_account, _USER_ID
		);

		List<String> warningMessages = new ArrayList<>();

		List<Long> userIds = _provisioningContactService.addProjectContacts(
			_account, List.of(_createContactRole(_CONTACT_ROLE)), null,
			warningMessages);

		Assertions.assertTrue(userIds.isEmpty());

		Assertions.assertEquals(1, warningMessages.size());

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignAccountRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	private AccountRole _createAccountRole(long accountRoleId) {
		AccountRole accountRole = new AccountRole();

		accountRole.setId(() -> accountRoleId);

		return accountRole;
	}

	private SalesforceProjectContactRole _createContactRole(
		String contactRole) {

		return _createContactRole(
			contactRole, _EMAIL_ADDRESS, _FIRST_NAME, _LAST_NAME);
	}

	private SalesforceProjectContactRole _createContactRole(
		String contactRole, String emailAddress, String firstName,
		String lastName) {

		JSONObject jsonObject =
			SalesforceModelTestUtil.createProjectContactRoleJSONObject(
				contactRole, emailAddress, firstName, lastName, _PROJECT_ID);

		return new SalesforceProjectContactRole(jsonObject);
	}

	private SalesforceProject _createSalesforceProject() {
		return new SalesforceProject(
			new JSONObject(
			).put(
				"Id", "SF-PROJ-1"
			));
	}

	private void _mockContactAccountRole() throws Exception {
		Mockito.when(
			_accountRoleService.fetchAccountRoleByName(_CONTACT_ROLE)
		).thenReturn(
			_accountRole
		);
	}

	private AccountRole _mockAdministratorAccountRole() throws Exception {
		AccountRole administratorAccountRole = _createAccountRole(
			_ADMINISTRATOR_ROLE_ID);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByName(
				RoleConstants.NAME_ACCOUNT_ADMINISTRATOR)
		).thenReturn(
			administratorAccountRole
		);

		return administratorAccountRole;
	}

	private void _mockNewUserAccount(String emailAddress, long userId)
		throws Exception {

		UserAccount userAccount = new UserAccount();

		userAccount.setId(userId);

		Mockito.when(
			_userAccountService.addUserAccount(
				emailAddress, _LAST_NAME, _FIRST_NAME)
		).thenReturn(
			userAccount
		);
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final long _ACCOUNT_ROLE_ID = 500L;

	private static final long _ADMINISTRATOR_ROLE_ID = 600L;

	private static final String _CONTACT_ROLE = "Member";

	private static final String _EMAIL_ADDRESS = "contact@example.com";

	private static final String _FIRST_NAME = "Jane";

	private static final String _LAST_NAME = "Doe";

	private static final String _PROJECT_ID = "PROJECT-1";

	private static final String _SECOND_EMAIL_ADDRESS =
		"other-contact@example.com";

	private static final long _SECOND_USER_ID = 200L;

	private static final long _USER_ID = 100L;

	private Account _account;
	private AccountRole _accountRole;
	private AccountRoleService _accountRoleService;
	private EmailAddressValidatorService _emailAddressValidatorService;
	private ProjectService _projectService;
	private ProvisioningContactService _provisioningContactService;
	private UserAccountService _userAccountService;
	private UserAssignmentService _userAssignmentService;

}