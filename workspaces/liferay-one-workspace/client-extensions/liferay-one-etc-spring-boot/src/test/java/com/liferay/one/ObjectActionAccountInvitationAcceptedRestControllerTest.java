/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Project;
import com.liferay.one.service.AccountInvitationAcceptanceService;
import com.liferay.one.service.AccountInvitationService;
import com.liferay.one.service.AccountRoleService;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserAssignmentService;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
public class ObjectActionAccountInvitationAcceptedRestControllerTest {

	@Test
	public void testPostAssignsAccountBeforeAccountRolesAndProjectRole()
		throws Exception {

		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(
			true, _PROJECT_EXTERNAL_REFERENCE_CODE,
			List.of("L_ACCOUNT_ADMINISTRATOR", "C_ACCOUNT_BUYER"));

		AccountRole administratorAccountRole = _mockAccountRole(
			"L_ACCOUNT_ADMINISTRATOR");
		AccountRole buyerAccountRole = _mockAccountRole("C_ACCOUNT_BUYER");

		Account account = _mockAccount();

		Project project = _mockProject();

		_mockUserAccount();

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		InOrder inOrder = Mockito.inOrder(_userAssignmentService);

		inOrder.verify(
			_userAssignmentService
		).assignAccount(
			account, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			account, administratorAccountRole, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			account, buyerAccountRole, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).assignProjectRole(
			project, _PROJECT_ROLE_ERC, _USER_ID
		);
	}

	@Test
	public void testPostCreatesUserAccountWithInvitedName() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(true, "", List.of());

		Account account = _mockAccount();

		Mockito.when(
			_userAccountService.addUserAccount(_EMAIL_ADDRESS, "Doe", "Jane")
		).thenReturn(
			_createUserAccount()
		);

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		InOrder inOrder = Mockito.inOrder(
			_userAccountService, _userAssignmentService);

		inOrder.verify(
			_userAccountService
		).addUserAccount(
			_EMAIL_ADDRESS, "Doe", "Jane"
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccount(
			account, _USER_ID
		);
	}

	@Test
	public void testPostPropagatesAssignmentFailure() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(
			true, _PROJECT_EXTERNAL_REFERENCE_CODE, List.of());

		Account account = _mockAccount();

		_mockProject();
		_mockUserAccount();

		Mockito.doThrow(
			new RuntimeException("Okta is unavailable")
		).when(
			_userAssignmentService
		).assignAccount(
			account, _USER_ID
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> objectActionAccountInvitationAcceptedRestController.post(
				null, _createPayload()));

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testPostRejectsUnknownAccountRole() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(true, "", List.of("C_UNKNOWN"));

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> objectActionAccountInvitationAcceptedRestController.post(
				null, _createPayload()));

		Mockito.verifyNoInteractions(
			_accountService, _userAccountService, _userAssignmentService);
	}

	@Test
	public void testPostSkipsMissingInvitation() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			null
		);

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		Mockito.verifyNoInteractions(
			_accountService, _userAccountService, _userAssignmentService);
	}

	@Test
	public void testPostSkipsMissingProject() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(
			true, _PROJECT_EXTERNAL_REFERENCE_CODE, List.of());

		Account account = _mockAccount();

		_mockUserAccount();

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		Mockito.verify(
			_userAssignmentService
		).assignAccount(
			account, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testPostSkipsProjectRoleForAccountInvitation()
		throws Exception {

		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(true, "", List.of());
		_mockAccount();
		_mockUserAccount();

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		Mockito.verifyNoInteractions(_projectService);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignProjectRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);
	}

	@Test
	public void testPostSkipsUnacceptedInvitation() throws Exception {
		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				_createController();

		_mockAccountInvitation(false, "", List.of());

		objectActionAccountInvitationAcceptedRestController.post(
			null, _createPayload());

		Mockito.verifyNoInteractions(
			_accountService, _userAccountService, _userAssignmentService);
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(_ACCOUNT_ID);

		return account;
	}

	private AccountInvitation _createAccountInvitation(
		boolean accepted, String projectExternalReferenceCode,
		List<String> roleExternalReferenceCodes) {

		return new AccountInvitation(
			new JSONObject(
			).put(
				"accepted", accepted
			).put(
				"accountExternalReferenceCode", _EXTERNAL_REFERENCE_CODE
			).put(
				"customExpirationDate", "2999-01-01T00:00:00Z"
			).put(
				"emailAddress", _EMAIL_ADDRESS
			).put(
				"externalReferenceCode", "INV-1"
			).put(
				"familyName", "Doe"
			).put(
				"givenName", "Jane"
			).put(
				"id", _ACCOUNT_INVITATION_ID
			).put(
				"projectExternalReferenceCode", projectExternalReferenceCode
			).put(
				"projectRoleExternalReferenceCode", _PROJECT_ROLE_ERC
			).put(
				"roleExternalReferenceCodes",
				new JSONArray(
					roleExternalReferenceCodes
				).toString()
			).put(
				"token", "11111111-2222-3333-4444-555555555555"
			));
	}

	private ObjectActionAccountInvitationAcceptedRestController
		_createController() {

		AccountInvitationAcceptanceService accountInvitationAcceptanceService =
			new AccountInvitationAcceptanceService();

		ReflectionTestUtils.setField(
			accountInvitationAcceptanceService, "_accountRoleService",
			_accountRoleService);
		ReflectionTestUtils.setField(
			accountInvitationAcceptanceService, "_accountService",
			_accountService);
		ReflectionTestUtils.setField(
			accountInvitationAcceptanceService, "_projectService",
			_projectService);
		ReflectionTestUtils.setField(
			accountInvitationAcceptanceService, "_userAccountService",
			_userAccountService);
		ReflectionTestUtils.setField(
			accountInvitationAcceptanceService, "_userAssignmentService",
			_userAssignmentService);

		ObjectActionAccountInvitationAcceptedRestController
			objectActionAccountInvitationAcceptedRestController =
				new ObjectActionAccountInvitationAcceptedRestController();

		ReflectionTestUtils.setField(
			objectActionAccountInvitationAcceptedRestController,
			"_accountInvitationAcceptanceService",
			accountInvitationAcceptanceService);
		ReflectionTestUtils.setField(
			objectActionAccountInvitationAcceptedRestController,
			"_accountInvitationService", _accountInvitationService);

		return objectActionAccountInvitationAcceptedRestController;
	}

	private String _createPayload() {
		JSONObject jsonObject = new JSONObject();

		jsonObject.put(
			"objectEntry",
			new JSONObject(
			).put(
				"id", _ACCOUNT_INVITATION_ID
			));

		return jsonObject.toString();
	}

	private UserAccount _createUserAccount() {
		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(_EMAIL_ADDRESS);
		userAccount.setId(_USER_ID);

		return userAccount;
	}

	private Account _mockAccount() throws Exception {
		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			account
		);

		return account;
	}

	private void _mockAccountInvitation(
			boolean accepted, String projectExternalReferenceCode,
			List<String> roleExternalReferenceCodes)
		throws Exception {

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(
				accepted, projectExternalReferenceCode,
				roleExternalReferenceCodes)
		);
	}

	private AccountRole _mockAccountRole(String externalReferenceCode)
		throws Exception {

		AccountRole accountRole = new AccountRole();

		accountRole.setExternalReferenceCode(externalReferenceCode);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				externalReferenceCode)
		).thenReturn(
			accountRole
		);

		return accountRole;
	}

	private Project _mockProject() throws Exception {
		Project project = new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			));

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			project
		);

		return project;
	}

	private void _mockUserAccount() throws Exception {
		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount()
		);
	}

	private static final long _ACCOUNT_ID = 11111;

	private static final long _ACCOUNT_INVITATION_ID = 44444;

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final String _PROJECT_ROLE_ERC = "C_PROJECT_ADMIN";

	private static final long _USER_ID = 22222;

	private final AccountInvitationService _accountInvitationService =
		Mockito.mock(AccountInvitationService.class);
	private final AccountRoleService _accountRoleService = Mockito.mock(
		AccountRoleService.class);
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAssignmentService _userAssignmentService = Mockito.mock(
		UserAssignmentService.class);

}