/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.one.jira.service.AccountAssetService;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountSynchronizer;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.license.LicenseKeyEntitlementValidator;
import com.liferay.one.license.LicenseKeyValidator;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.permission.AccountPermission;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.permission.ProjectMembershipPermission;
import com.liferay.one.service.AccountInvitationEmailService;
import com.liferay.one.service.AccountInvitationService;
import com.liferay.one.service.AccountRoleService;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.EmailAddressValidatorService;
import com.liferay.one.service.EntitlementDefinitionService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.ProvisioningAssignmentService;
import com.liferay.one.service.ProvisioningEmailService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.KeyedLock;
import com.liferay.one.util.TermCountUtil;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.lang.reflect.Field;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Ricardo Mariz
 */
public class AccountsRestControllerTest {

	@Test
	public void testDeleteInvitationsDeletesPendingInvitation()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(
				false, _EXTERNAL_REFERENCE_CODE, StringPool.BLANK)
		);

		accountsRestController.deleteInvitations(
			null, _EXTERNAL_REFERENCE_CODE, _ACCOUNT_INVITATION_ID);

		Mockito.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.UPDATE, null
		);

		Mockito.verify(
			_accountInvitationService
		).deleteAccountInvitation(
			_ACCOUNT_INVITATION_ID
		);
	}

	@Test
	public void testDeleteInvitationsRejectsInvitationFromAnotherAccount()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(false, "ACC-OTHER", StringPool.BLANK)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.deleteInvitations(
					null, _EXTERNAL_REFERENCE_CODE, _ACCOUNT_INVITATION_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountPermission);

		Mockito.verify(
			_accountInvitationService, Mockito.never()
		).deleteAccountInvitation(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testDeleteUserAccountsAccountRoleResolvesRoleNameBeforeRemoving()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Partner Manager")
		);

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		accountsRestController.deleteUserAccountsAccountRole(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID, _ACCOUNT_ROLE_ID);

		InOrder inOrder = Mockito.inOrder(_accountRoleService, _accountService);

		inOrder.verify(
			_accountRoleService
		).fetchAccountRole(
			_ACCOUNT_ROLE_ID
		);

		inOrder.verify(
			_accountService
		).removeAccountUserAccountRole(
			_ACCOUNT_ROLE_ID, _EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).unassignAccountRole(
			account, _USER_ID, "Partner Manager"
		);
	}

	@Test
	public void testDeleteUserAccountsAccountRoleSkipsSideEffectsForUnknownRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		accountsRestController.deleteUserAccountsAccountRole(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID, _ACCOUNT_ROLE_ID);

		Mockito.verify(
			_accountService
		).removeAccountUserAccountRole(
			_ACCOUNT_ROLE_ID, _EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verifyNoInteractions(_provisioningAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsAccountRoleWhenUserAccountIsNotMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			false
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.deleteUserAccountsAccountRole(
					null, _EXTERNAL_REFERENCE_CODE, _USER_ID,
					_ACCOUNT_ROLE_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(
			_accountRoleService, _provisioningAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsByEmailAddressAccountRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Support Administrator")
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID, "Support Administrator")
		);

		accountsRestController.deleteUserAccountsByEmailAddressAccountRole(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, _ACCOUNT_ROLE_ID);

		Mockito.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.UPDATE, null
		);

		Mockito.verify(
			_accountService
		).removeAccountUserAccountRole(
			_ACCOUNT_ROLE_ID, _EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).unassignAccountRole(
			account, _USER_ID, "Support Administrator"
		);
	}

	@Test
	public void testDeleteUserAccountsByEmailAddressAccountRoleWhenUserAccountIsNotMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID + 1, "Support Administrator")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						deleteUserAccountsByEmailAddressAccountRole(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							_ACCOUNT_ROLE_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(
			_accountRoleService, _provisioningAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsByEmailAddressAccountRoleWhenUserAccountIsNull()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			null
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						deleteUserAccountsByEmailAddressAccountRole(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							_ACCOUNT_ROLE_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_provisioningAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsUnassignsAccountMembership()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_createUserAccount()
		);

		accountsRestController.deleteUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		Mockito.verify(
			_accountService
		).removeAccountUserAccount(
			_EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).unassignAccountMembership(
			_ACCOUNT_ID, _USER_ID
		);
	}

	@Test
	public void testDeleteUserAccountsUnassignsContactRolesAndSyncsMembership()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		UserAccount userAccount = _createUserAccount(
			_ACCOUNT_ID, "Account Member");

		userAccount.setExternalReferenceCode("USER-ERC-1");

		AccountBrief accountBrief = userAccount.getAccountBriefs()[0];

		accountBrief.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);

		RoleBrief roleBrief = accountBrief.getRoleBriefs()[0];

		roleBrief.setExternalReferenceCode("ROLE-ERC-1");

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		accountsRestController.deleteUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncUnassignRole(
			"ROLE-ERC-1", "USER-ERC-1", _EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			account, userAccount
		);
	}

	@Test
	public void testGetInvitationsOmitsTokenAndResolvesRoleNames()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"L_ACCOUNT_ADMINISTRATOR")
		).thenReturn(
			_createAccountRole("Account Administrator")
		);

		Mockito.when(
			_accountInvitationService.getPendingAccountInvitations(
				_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createAccountInvitation(
					false, _EXTERNAL_REFERENCE_CODE, StringPool.BLANK,
					"L_ACCOUNT_ADMINISTRATOR", "C_UNKNOWN"))
		);

		ResponseEntity<String> responseEntity =
			accountsRestController.getInvitations(
				null, _EXTERNAL_REFERENCE_CODE);

		Mockito.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.VIEW, null
		);

		JSONArray jsonArray = new JSONArray(responseEntity.getBody());

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertFalse(jsonObject.has("token"));
		Assertions.assertEquals(
			_ACCOUNT_INVITATION_ID, jsonObject.getLong("id"));
		Assertions.assertEquals(
			_EMAIL_ADDRESS, jsonObject.getString("emailAddress"));

		JSONArray roleNamesJSONArray = jsonObject.getJSONArray("roleNames");

		Assertions.assertEquals(1, roleNamesJSONArray.length());
		Assertions.assertEquals(
			"Account Administrator", roleNamesJSONArray.getString(0));
	}

	@Test
	public void testGetLicenseKeys() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		List<LicenseKey> licenseKeys = Collections.singletonList(
			Mockito.mock(LicenseKey.class));

		Mockito.when(
			_licenseKeyService.getLicenseKeysByAccountEntryId(_ACCOUNT_ID)
		).thenReturn(
			licenseKeys
		);

		Assertions.assertSame(
			licenseKeys,
			accountsRestController.getLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);
	}

	@Test
	public void testGetLicenseKeysExport() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		List<LicenseKey> licenseKeys = Collections.singletonList(
			Mockito.mock(LicenseKey.class));

		Mockito.when(
			_licenseKeyService.getLicenseKeysByAccountEntryId(_ACCOUNT_ID)
		).thenReturn(
			licenseKeys
		);

		Mockito.when(
			_licenseKeyCSVExporter.getFileName()
		).thenReturn(
			"activation-key-details.csv"
		);

		Mockito.when(
			_licenseKeyCSVExporter.toCSV(licenseKeys)
		).thenReturn(
			"csv"
		);

		ResponseEntity<String> responseEntity =
			accountsRestController.getLicenseKeysExport(
				null, _EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals("csv", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key-details.csv\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);
	}

	@Test
	public void testGetProductUsage() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		EntitlementDefinition entitlementDefinition = Mockito.mock(
			EntitlementDefinition.class);

		Mockito.when(
			entitlementDefinition.getEntitlementDefinitionId()
		).thenReturn(
			99L
		);

		Mockito.when(
			_entitlementDefinitionService.fetchEntitlementDefinition(
				EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP)
		).thenReturn(
			entitlementDefinition
		);

		int currentYear = TermCountUtil.getYear(Instant.now());

		Instant endInstant = TermCountUtil.getStartOfYearInstant(
			currentYear + 1);
		Instant startInstant = TermCountUtil.getStartOfYearInstant(currentYear);

		Entitlement entitlement = Mockito.mock(Entitlement.class);

		Mockito.when(
			entitlement.getEndDateInstant()
		).thenReturn(
			endInstant
		);

		Mockito.when(
			entitlement.getEntitlementId()
		).thenReturn(
			7L
		);

		Mockito.when(
			entitlement.getQuantity()
		).thenReturn(
			5.0
		);

		Mockito.when(
			entitlement.getStartDateInstant()
		).thenReturn(
			startInstant
		);

		Mockito.when(
			_entitlementService.getEntitlements(_ACCOUNT_ID, 99L)
		).thenReturn(
			Collections.singletonList(entitlement)
		);

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getCustomExpirationDateInstant()
		).thenReturn(
			endInstant
		);

		Mockito.when(
			licenseKey.getEntitlementId()
		).thenReturn(
			7L
		);

		Mockito.when(
			licenseKey.getStartDateInstant()
		).thenReturn(
			startInstant
		);

		LicenseKey unrelatedLicenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			unrelatedLicenseKey.getEntitlementId()
		).thenReturn(
			8L
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByAccountEntryId(_ACCOUNT_ID)
		).thenReturn(
			List.of(licenseKey, unrelatedLicenseKey)
		);

		ResponseEntity<String> responseEntity =
			accountsRestController.getProductUsage(
				null, _EXTERNAL_REFERENCE_CODE,
				EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(1, jsonObject.getInt("currentConsumption"));

		JSONArray jsonArray = jsonObject.getJSONArray("annualSubscriptions");

		Assertions.assertEquals(3, jsonArray.length());

		JSONObject currentYearJSONObject = jsonArray.getJSONObject(1);

		Assertions.assertEquals(
			currentYear, currentYearJSONObject.getInt("year"));

		Assertions.assertEquals(
			1, currentYearJSONObject.getInt("maxConcurrentConsumption"));

		Assertions.assertEquals(
			5, currentYearJSONObject.getInt("maxConcurrentQuantity"));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);
	}

	@Test
	public void testGetProductUsageWhenProductIsNotSelfHosted()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.getProductUsage(
					null, _EXTERNAL_REFERENCE_CODE, "C_ENT_DEF_COMMERCE"));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_entitlementDefinitionService);
	}

	@Test
	public void testPostInvitationsCreatesProjectInvitation() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject(_EXTERNAL_REFERENCE_CODE)
		);

		AccountInvitation accountInvitation = _createAccountInvitation();

		Mockito.when(
			_accountInvitationService.addAccountInvitation(
				_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane",
				_PROJECT_EXTERNAL_REFERENCE_CODE, _PROJECT_ROLE_ERC, List.of())
		).thenReturn(
			accountInvitation
		);

		accountsRestController.postInvitations(
			null, _EXTERNAL_REFERENCE_CODE, _createProjectInvitationBodyJSON());

		Mockito.verify(
			_projectMembershipPermission
		).check(
			ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verifyNoInteractions(_accountPermission);

		Mockito.verify(
			_accountInvitationService
		).addAccountInvitation(
			_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane",
			_PROJECT_EXTERNAL_REFERENCE_CODE, _PROJECT_ROLE_ERC, List.of()
		);

		Mockito.verify(
			_accountInvitationEmailService
		).sendInvitationEmail(
			ArgumentMatchers.eq(account),
			ArgumentMatchers.eq(accountInvitation),
			ArgumentMatchers.eq("Inviter Name"), ArgumentMatchers.any()
		);
	}

	@Test
	public void testPostInvitationsLooksUpInviterBeforeCreatingInvitation()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		AccountInvitation accountInvitation = _createAccountInvitation();

		Mockito.when(
			_accountInvitationService.addAccountInvitation(
				_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane", "", "",
				List.of())
		).thenReturn(
			accountInvitation
		);

		accountsRestController.postInvitations(
			null, _EXTERNAL_REFERENCE_CODE, _createInvitationBodyJSON());

		InOrder inOrder = Mockito.inOrder(
			_userAccountService, _accountInvitationService,
			_accountInvitationEmailService);

		inOrder.verify(
			_userAccountService
		).getMyUserAccount(
			null
		);

		inOrder.verify(
			_accountInvitationService
		).addAccountInvitation(
			_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane", "", "",
			List.of()
		);

		inOrder.verify(
			_accountInvitationEmailService
		).sendInvitationEmail(
			account, accountInvitation, "Inviter Name"
		);
	}

	@Test
	public void testPostInvitationsRejectsExistingMember() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID, "Account Member")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postInvitations(
					null, _EXTERNAL_REFERENCE_CODE,
					_createInvitationBodyJSON()));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountInvitationService);
	}

	@Test
	public void testPostInvitationsRejectsInvalidEmailAddress()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postInvitations(
					null, _EXTERNAL_REFERENCE_CODE,
					new JSONObject(
					).put(
						"emailAddress", "jane"
					).put(
						"familyName", "Doe"
					).put(
						"givenName", "Jane"
					).toString()));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountInvitationService);
	}

	@Test
	public void testPostInvitationsRejectsMalformedBody() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Assertions.assertThrows(
			JSONException.class,
			() -> accountsRestController.postInvitations(
				null, _EXTERNAL_REFERENCE_CODE, "not json"));

		Mockito.verifyNoInteractions(_accountInvitationService);
	}

	@Test
	public void testPostInvitationsRejectsProjectFromAnotherAccount()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject("ACC-OTHER")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postInvitations(
					null, _EXTERNAL_REFERENCE_CODE,
					_createProjectInvitationBodyJSON()));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountInvitationService);
	}

	@Test
	public void testPostInvitationsRejectsUnknownRoleExternalReferenceCode()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"L_ACCOUNT_ADMINISTRATOR")
		).thenReturn(
			_createAccountRole("Account Administrator")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postInvitations(
					null, _EXTERNAL_REFERENCE_CODE,
					_createInvitationBodyJSON("C_NOT_A_ROLE")));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountInvitationService);
	}

	@Test
	public void testPostInvitationsResendChecksProjectPermission()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(
				false, _EXTERNAL_REFERENCE_CODE,
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		);

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject(_EXTERNAL_REFERENCE_CODE)
		);

		Mockito.when(
			_accountInvitationService.renewAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation()
		);

		accountsRestController.postInvitationsResend(
			null, _EXTERNAL_REFERENCE_CODE, _ACCOUNT_INVITATION_ID);

		Mockito.verify(
			_projectMembershipPermission
		).check(
			ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verifyNoInteractions(_accountPermission);

		Mockito.verify(
			_accountInvitationEmailService
		).sendInvitationEmail(
			ArgumentMatchers.any(), ArgumentMatchers.any(),
			ArgumentMatchers.eq("Inviter Name"), ArgumentMatchers.any()
		);
	}

	@Test
	public void testPostInvitationsResendRejectsAcceptedInvitation()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(
				true, _EXTERNAL_REFERENCE_CODE, StringPool.BLANK)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postInvitationsResend(
					null, _EXTERNAL_REFERENCE_CODE, _ACCOUNT_INVITATION_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verify(
			_accountInvitationService, Mockito.never()
		).renewAccountInvitation(
			ArgumentMatchers.anyLong()
		);

		Mockito.verifyNoInteractions(_accountInvitationEmailService);
	}

	@Test
	public void testPostInvitationsResendRenewsTokenAndSendsEmail()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountInvitationService.fetchAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			_createAccountInvitation(
				false, _EXTERNAL_REFERENCE_CODE, StringPool.BLANK)
		);

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		AccountInvitation renewedAccountInvitation = _createAccountInvitation();

		Mockito.when(
			_accountInvitationService.renewAccountInvitation(
				_ACCOUNT_INVITATION_ID)
		).thenReturn(
			renewedAccountInvitation
		);

		accountsRestController.postInvitationsResend(
			null, _EXTERNAL_REFERENCE_CODE, _ACCOUNT_INVITATION_ID);

		Mockito.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.UPDATE, null
		);

		InOrder inOrder = Mockito.inOrder(
			_accountInvitationService, _accountInvitationEmailService);

		inOrder.verify(
			_accountInvitationService
		).renewAccountInvitation(
			_ACCOUNT_INVITATION_ID
		);

		inOrder.verify(
			_accountInvitationEmailService
		).sendInvitationEmail(
			account, renewedAccountInvitation, "Inviter Name"
		);
	}

	@Test
	public void testPostInvitationsReusesPendingInvitation() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		AccountInvitation accountInvitation = _createAccountInvitation();

		Mockito.when(
			_accountInvitationService.fetchPendingAccountInvitation(
				_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "")
		).thenReturn(
			accountInvitation
		);

		Mockito.when(
			_accountInvitationService.updateAccountInvitation(
				_ACCOUNT_INVITATION_ID, "Doe", "Jane", "", List.of())
		).thenReturn(
			accountInvitation
		);

		accountsRestController.postInvitations(
			null, _EXTERNAL_REFERENCE_CODE, _createInvitationBodyJSON());

		Mockito.verify(
			_accountInvitationService
		).updateAccountInvitation(
			_ACCOUNT_INVITATION_ID, "Doe", "Jane", "", List.of()
		);

		Mockito.verify(
			_accountInvitationService, Mockito.never()
		).addAccountInvitation(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyList()
		);

		Mockito.verify(
			_accountInvitationEmailService
		).sendInvitationEmail(
			account, accountInvitation, "Inviter Name"
		);
	}

	@Test
	public void testPostInvitationsStoresRoleExternalReferenceCodes()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			_createInviterUserAccount()
		);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByExternalReferenceCode(
				"L_ACCOUNT_ADMINISTRATOR")
		).thenReturn(
			_createAccountRole("Account Administrator")
		);

		Mockito.when(
			_accountInvitationService.addAccountInvitation(
				_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane", "", "",
				List.of("L_ACCOUNT_ADMINISTRATOR"))
		).thenReturn(
			_createAccountInvitation()
		);

		accountsRestController.postInvitations(
			null, _EXTERNAL_REFERENCE_CODE,
			_createInvitationBodyJSON("L_ACCOUNT_ADMINISTRATOR"));

		Mockito.verify(
			_accountInvitationService
		).addAccountInvitation(
			_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "Doe", "Jane", "", "",
			List.of("L_ACCOUNT_ADMINISTRATOR")
		);
	}

	@Test
	public void testPostLicenseKeysAccumulatesQuotaAcrossTheBatch()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 1.0);

		Mockito.when(
			entitlement.getGrantType()
		).thenReturn(
			"metered"
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		accountsRestController.postLicenseKeys(
			null, _EXTERNAL_REFERENCE_CODE, _createLicenseKeysBodyJSON(1, 0));

		Mockito.reset(_licenseKeyService);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeysBodyJSON(2, 0)));
	}

	@Test
	public void testPostLicenseKeysAddsLicenseKey() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		List<LicenseKey> licenseKeys = accountsRestController.postLicenseKeys(
			null, _EXTERNAL_REFERENCE_CODE,
			_createLicenseKeyBodyJSON(0, "jane@example.com"));

		Assertions.assertEquals(1, licenseKeys.size());

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.UPDATE, null
		);

		Mockito.verify(
			_licenseKeyService
		).addLicenseKey(
			_ACCOUNT_ID, _ACCOUNT_NAME, true, StringPool.BLANK, false,
			"jane@example.com", StringPool.BLANK, _ENTITLEMENT_ID,
			Date.from(Instant.parse(_EXPIRATION_DATE)), "acme.example.com",
			StringPool.BLANK, StringPool.BLANK,
			LicenseConstants.TYPE_PRODUCTION, 6, StringPool.BLANK, 0, 0L, 0, 0,
			0L, _LICENSE_KEY_NAME, StringPool.BLANK, "jane@example.com",
			LicenseConstants.PRODUCT_ID_PORTAL, _PRODUCT_NAME, _PRODUCT_VERSION,
			StringPool.BLANK, StringPool.BLANK,
			Date.from(Instant.parse(_START_DATE))
		);
	}

	@Test
	public void testPostLicenseKeysDefaultsOwnerToAccountName()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		accountsRestController.postLicenseKeys(
			null, _EXTERNAL_REFERENCE_CODE,
			_createLicenseKeyBodyJSON(0, StringPool.BLANK));

		Mockito.verify(
			_licenseKeyService
		).addLicenseKey(
			_ACCOUNT_ID, _ACCOUNT_NAME, true, StringPool.BLANK, false,
			_ACCOUNT_NAME, StringPool.BLANK, _ENTITLEMENT_ID,
			Date.from(Instant.parse(_EXPIRATION_DATE)), "acme.example.com",
			StringPool.BLANK, StringPool.BLANK,
			LicenseConstants.TYPE_PRODUCTION, 6, StringPool.BLANK, 0, 0L, 0, 0,
			0L, _LICENSE_KEY_NAME, StringPool.BLANK, _ACCOUNT_NAME,
			LicenseConstants.PRODUCT_ID_PORTAL, _PRODUCT_NAME, _PRODUCT_VERSION,
			StringPool.BLANK, StringPool.BLANK,
			Date.from(Instant.parse(_START_DATE))
		);
	}

	@Test
	public void testPostLicenseKeysKeepsComplimentaryGrantWhenMetadataIsInvalid()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Instant startInstant = Instant.now();

		Assertions.assertThrows(
			LicenseKeyValidationException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				new JSONArray(
				).put(
					_toLicenseKeyJSONObject(
						0, "jane@example.com"
					).put(
						"complimentary", true
					).put(
						"expirationDate",
						String.valueOf(startInstant.plus(30, ChronoUnit.DAYS))
					).put(
						"productVersion", StringPool.BLANK
					).put(
						"startDate", String.valueOf(startInstant)
					)
				).toString()));

		Mockito.verify(
			_accountService, Mockito.never()
		).updateAllowComplimentary(
			Mockito.anyLong(), Mockito.anyBoolean()
		);
	}

	@Test
	public void testPostLicenseKeysReadsTheEntitlementQuotaOnce()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 10.0);

		Mockito.when(
			entitlement.getGrantType()
		).thenReturn(
			"metered"
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		accountsRestController.postLicenseKeys(
			null, _EXTERNAL_REFERENCE_CODE, _createLicenseKeysBodyJSON(3, 0));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).getLicenseKeys(
			true, false, _ENTITLEMENT_ID
		);
	}

	@Test
	public void testPostLicenseKeysRejectsComplimentaryFromMismatchedEntitlement()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement("C_ENT_DEF_SAAS", 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createComplimentaryLicenseKeyBodyJSON(30)));

		Mockito.verify(
			_accountService, Mockito.never()
		).updateAllowComplimentary(
			Mockito.anyLong(), Mockito.anyBoolean()
		);
	}

	@Test
	public void testPostLicenseKeysRejectsComplimentaryWhenNotAllowed()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createComplimentaryLicenseKeyBodyJSON(30)));
	}

	@Test
	public void testPostLicenseKeysRejectsComplimentaryWithInvalidTerm()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createComplimentaryLicenseKeyBodyJSON(60)));
	}

	@Test
	public void testPostLicenseKeysRejectsEmptyBody() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Assertions.assertThrows(
			ResponseStatusException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE, "[]"));

		Mockito.verifyNoInteractions(_entitlementService);

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPostLicenseKeysRejectsEntitlementFromAnotherAccount()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			entitlement.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID + 1
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPostLicenseKeysRejectsExhaustedEntitlement()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 2.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getMaxClusterNodes()
		).thenReturn(
			2
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(true, false, _ENTITLEMENT_ID)
		).thenReturn(
			List.of(licenseKey)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));
	}

	@Test
	public void testPostLicenseKeysRejectsExpirationDateBeyondEntitlement()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			entitlement.getEndDateInstant()
		).thenReturn(
			Instant.parse(_START_DATE)
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));
	}

	@Test
	public void testPostLicenseKeysRejectsMultipleComplimentary()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postLicenseKeys(
					null, _EXTERNAL_REFERENCE_CODE,
					_createComplimentaryLicenseKeysBodyJSON(2, 30)));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPostLicenseKeysRejectsOversizedComplimentaryClusterNodes()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Instant startInstant = Instant.now();

		Assertions.assertThrows(
			LicenseKeyValidationException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				new JSONArray(
				).put(
					_toLicenseKeyJSONObject(
						1000000, "jane@example.com"
					).put(
						"complimentary", true
					).put(
						"expirationDate",
						String.valueOf(startInstant.plus(30, ChronoUnit.DAYS))
					).put(
						"startDate", String.valueOf(startInstant)
					)
				).toString()));

		Mockito.verify(
			_accountService, Mockito.never()
		).updateAllowComplimentary(
			Mockito.anyLong(), Mockito.anyBoolean()
		);
	}

	@Test
	public void testPostLicenseKeysRejectsOversizedMaxClusterNodes()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getMaxClusterNodes()
		).thenReturn(
			1
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(true, false, _ENTITLEMENT_ID)
		).thenReturn(
			List.of(licenseKey)
		);

		Assertions.assertThrows(
			LicenseKeyValidationException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(
					Integer.MAX_VALUE, "jane@example.com")));
	}

	@Test
	public void testPostLicenseKeysRejectsPerpetualEntitlement()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowPermanentLicenses", false)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			entitlement.getEndDateInstant()
		).thenReturn(
			null
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));
	}

	@Test
	public void testPostLicenseKeysRejectsSelfHostedEntitlementMismatch()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement("C_ENT_DEF_SAAS", 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));
	}

	@Test
	public void testPostLicenseKeysRejectsSelfProvisioningDisabledAccount()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.doThrow(
			PrincipalException.class
		).when(
			_licenseKeyPermission
		).checkSelfProvisioning(
			Mockito.eq(_ACCOUNT_ID), Mockito.any()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				_createLicenseKeyBodyJSON(0, "jane@example.com")));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostLicenseKeysRejectsUnboundLicenseType()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			LicenseKeyValidationException.class,
			() -> accountsRestController.postLicenseKeys(
				null, _EXTERNAL_REFERENCE_CODE,
				new JSONArray(
				).put(
					_toLicenseKeyJSONObject(
						0, "jane@example.com"
					).put(
						"licenseType", LicenseConstants.TYPE_ENTERPRISE
					)
				).toString()));
	}

	@Test
	public void testPostLicenseKeysResetsAllowComplimentary() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		account.setCustomFields(
			() -> new CustomField[] {
				_createCustomField("allowComplimentary", true)
			});

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Entitlement entitlement = _createEntitlement(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP, 5.0);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		accountsRestController.postLicenseKeys(
			null, _EXTERNAL_REFERENCE_CODE,
			_createComplimentaryLicenseKeyBodyJSON(30));

		Mockito.verify(
			_accountService
		).updateAllowComplimentary(
			_ACCOUNT_ID, false
		);
	}

	@Test
	public void testPostSyncToJSMRejectsNonadministrator() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.doThrow(
			PrincipalException.class
		).when(
			_adminPermission
		).check(
			Mockito.any()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.postSyncToJSM(
				null, _EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_accountSynchronizer, Mockito.never()
		).syncAccount(
			Mockito.any()
		);
	}

	@Test
	public void testPostSyncToJSMSyncsAccountForAdministrator()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			account
		);

		ResponseEntity<Void> responseEntity =
			accountsRestController.postSyncToJSM(
				null, _EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_adminPermission
		).check(
			Mockito.any()
		);

		Mockito.verify(
			_accountSynchronizer
		).syncAccount(
			account
		);
	}

	@Test
	public void testPostUserAccountsAccountRoleAssignsAccountRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Support Administrator")
		);

		accountsRestController.postUserAccountsAccountRole(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID, _ACCOUNT_ROLE_ID);

		Mockito.verify(
			_accountService
		).addAccountUserAccountRole(
			_ACCOUNT_ROLE_ID, _EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).assignAccountRole(
			account, _USER_ID, "Support Administrator"
		);
	}

	@Test
	public void testPostUserAccountsAccountRoleSyncsMembershipToJSM()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		UserAccount userAccount = _createUserAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		accountsRestController.postUserAccountsAccountRole(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID, _ACCOUNT_ROLE_ID);

		Mockito.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			account, userAccount
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesAssignsCustomerGroup()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount()
		);

		Mockito.when(
			_oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			Mockito.mock(OktaUser.class)
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "{}");

		Mockito.verify(
			_accountService
		).addAccountUserAccountByEmailAddress(
			_ACCOUNT_ID, _EMAIL_ADDRESS, null
		);

		Mockito.verify(
			_provisioningAssignmentService
		).assignCustomerGroup(
			_USER_ID
		);

		Mockito.verify(
			_provisioningEmailService
		).sendAssignedWelcomeEmail(
			account, _USER_ID
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesCreatesOktaUser()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Support Administrator")
		);

		UserAccount userAccount = _createUserAccount();

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			null, userAccount
		);

		Mockito.when(
			_entitlementService.hasEntitlement(
				Mockito.eq(_ACCOUNT_ID), ArgumentMatchers.<String>any())
		).thenReturn(
			true
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
			_createBodyJSON(_ACCOUNT_ROLE_ID, "Jane", "Doe"));

		Mockito.verify(
			_oktaService
		).createContact(
			_EMAIL_ADDRESS, "Jane", StringPool.BLANK, "Doe"
		);

		Mockito.verify(
			_accountService
		).addAccountUserAccountByEmailAddress(
			_ACCOUNT_ID, _EMAIL_ADDRESS, null
		);

		Mockito.verify(
			_accountService
		).addAccountUserAccountRole(
			_ACCOUNT_ROLE_ID, _EXTERNAL_REFERENCE_CODE, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).assignAccountRole(
			account, _USER_ID, "Support Administrator"
		);

		Mockito.verify(
			_provisioningEmailService
		).sendAssignedWelcomeEmail(
			account, _USER_ID
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsAssignedRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Account Member")
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID, "Account Member")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						postUserAccountsByEmailAddressAccountRoles(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							_createBodyJSON(_ACCOUNT_ROLE_ID, null, null)));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsMalformedBody()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Assertions.assertThrows(
			JSONException.class,
			() ->
				accountsRestController.
					postUserAccountsByEmailAddressAccountRoles(
						null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
						"not json"));

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsReservedDomain()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_emailAddressValidatorService.isLiferayDomain(_EMAIL_ADDRESS)
		).thenReturn(
			true
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						postUserAccountsByEmailAddressAccountRoles(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							"{}"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_accountService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRequiresEntitlement()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						postUserAccountsByEmailAddressAccountRoles(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							"{}"));

		Assertions.assertEquals(
			HttpStatus.UNPROCESSABLE_ENTITY,
			responseStatusException.getStatusCode());

		Mockito.verify(
			_oktaService, Mockito.never()
		).createContact(
			Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
			Mockito.anyString()
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesSkipsEmailForMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountRoleService.fetchAccountRole(_ACCOUNT_ROLE_ID)
		).thenReturn(
			_createAccountRole("Support Administrator")
		);

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID, "Account Member")
		);

		Mockito.when(
			_oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			Mockito.mock(OktaUser.class)
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
			_createBodyJSON(_ACCOUNT_ROLE_ID, null, null));

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccountUserAccountByEmailAddress(
			Mockito.anyLong(), Mockito.anyString(), Mockito.any()
		);

		Mockito.verify(
			_provisioningAssignmentService
		).assignAccountRole(
			account, _USER_ID, "Support Administrator"
		);

		Mockito.verifyNoInteractions(_provisioningEmailService);
	}

	@Test
	public void testPostUserAccountsSendsWelcomeEmailForNewMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		accountsRestController.postUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		Mockito.verify(
			_accountService
		).addAccountUserAccount(
			_ACCOUNT_ID, null, _USER_ID
		);

		Mockito.verify(
			_provisioningAssignmentService
		).assignCustomerGroup(
			_USER_ID
		);

		Mockito.verify(
			_provisioningEmailService
		).sendAssignedWelcomeEmail(
			account, _USER_ID
		);
	}

	@Test
	public void testPostUserAccountsSkipsWelcomeEmailForExistingMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createAccount()
		);

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		accountsRestController.postUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		Mockito.verify(
			_provisioningAssignmentService
		).assignCustomerGroup(
			_USER_ID
		);

		Mockito.verifyNoInteractions(_provisioningEmailService);
	}

	@Test
	public void testPostUserAccountsSyncsMembershipToJSM() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		UserAccount userAccount = _createUserAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		accountsRestController.postUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		Mockito.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			account, userAccount
		);
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(_ACCOUNT_ID);
		account.setName(_ACCOUNT_NAME);

		return account;
	}

	private AccountInvitation _createAccountInvitation() {
		return new AccountInvitation(
			new JSONObject(
			).put(
				"emailAddress", _EMAIL_ADDRESS
			).put(
				"familyName", "Doe"
			).put(
				"givenName", "Jane"
			).put(
				"id", _ACCOUNT_INVITATION_ID
			));
	}

	private AccountInvitation _createAccountInvitation(
		boolean accepted, String accountExternalReferenceCode,
		String projectExternalReferenceCode,
		String... roleExternalReferenceCodes) {

		return new AccountInvitation(
			new JSONObject(
			).put(
				"accepted", accepted
			).put(
				"accountExternalReferenceCode", accountExternalReferenceCode
			).put(
				"emailAddress", _EMAIL_ADDRESS
			).put(
				"familyName", "Doe"
			).put(
				"givenName", "Jane"
			).put(
				"id", _ACCOUNT_INVITATION_ID
			).put(
				"projectExternalReferenceCode", projectExternalReferenceCode
			).put(
				"roleExternalReferenceCodes",
				new JSONArray(
					List.of(roleExternalReferenceCodes)
				).toString()
			));
	}

	private AccountRole _createAccountRole(String name) {
		AccountRole accountRole = new AccountRole();

		accountRole.setExternalReferenceCode("L_ACCOUNT_ADMINISTRATOR");
		accountRole.setId(_ACCOUNT_ROLE_ID);
		accountRole.setName(name);

		return accountRole;
	}

	private String _createBodyJSON(
		long accountRoleId, String firstName, String lastName) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"accountRoleIds",
			new JSONArray(
			).put(
				accountRoleId
			)
		);

		if (firstName != null) {
			jsonObject.put("firstName", firstName);
		}

		if (lastName != null) {
			jsonObject.put("lastName", lastName);
		}

		return jsonObject.toString();
	}

	private String _createComplimentaryLicenseKeyBodyJSON(int durationDays) {
		return _createComplimentaryLicenseKeysBodyJSON(1, durationDays);
	}

	private String _createComplimentaryLicenseKeysBodyJSON(
		int count, int durationDays) {

		Instant startInstant = Instant.now();

		JSONArray jsonArray = new JSONArray();

		for (int i = 0; i < count; i++) {
			jsonArray.put(
				_toLicenseKeyJSONObject(
					0, "jane@example.com"
				).put(
					"complimentary", true
				).put(
					"expirationDate",
					String.valueOf(
						startInstant.plus(durationDays, ChronoUnit.DAYS))
				).put(
					"startDate", String.valueOf(startInstant)
				));
		}

		return jsonArray.toString();
	}

	private AccountsRestController _createController() throws Exception {
		AccountsRestController accountsRestController =
			new AccountsRestController();

		Field field = OneBaseRestController.class.getDeclaredField(
			"_userAccountService");

		field.setAccessible(true);

		field.set(accountsRestController, _userAccountService);

		ReflectionTestUtils.setField(
			accountsRestController, "_accountAssetService",
			_accountAssetService);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountInvitationEmailService",
			_accountInvitationEmailService);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountInvitationService",
			_accountInvitationService);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountPermission", _accountPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountRoleService", _accountRoleService);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountSynchronizer",
			_accountSynchronizer);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountUserAccountRoleSynchronizer",
			_accountUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			accountsRestController, "_accountUserAccountSynchronizer",
			_accountUserAccountSynchronizer);
		ReflectionTestUtils.setField(
			accountsRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_emailAddressValidatorService",
			_emailAddressValidatorService);
		ReflectionTestUtils.setField(
			accountsRestController, "_entitlementDefinitionService",
			_entitlementDefinitionService);
		ReflectionTestUtils.setField(
			accountsRestController, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			accountsRestController, "_keyedLock", new KeyedLock());

		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyCSVExporter",
			_licenseKeyCSVExporter);

		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyValidator",
			new LicenseKeyValidator());

		LicenseKeyEntitlementValidator licenseKeyEntitlementValidator =
			new LicenseKeyEntitlementValidator();

		ReflectionTestUtils.setField(
			licenseKeyEntitlementValidator, "_licenseKeyService",
			_licenseKeyService);

		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyEntitlementValidator",
			licenseKeyEntitlementValidator);

		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyPermission",
			_licenseKeyPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyService", _licenseKeyService);
		ReflectionTestUtils.setField(
			accountsRestController, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			accountsRestController, "_projectMembershipPermission",
			_projectMembershipPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			accountsRestController, "_provisioningAssignmentService",
			_provisioningAssignmentService);
		ReflectionTestUtils.setField(
			accountsRestController, "_provisioningEmailService",
			_provisioningEmailService);
		ReflectionTestUtils.setField(
			accountsRestController, "_userAccountService", _userAccountService);

		return accountsRestController;
	}

	private CustomField _createCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(() -> name);

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> data);

		customField.setCustomValue(() -> customValue);

		return customField;
	}

	private Entitlement _createEntitlement(
		String externalReferenceCode, double quantity) {

		EntitlementDefinition entitlementDefinition = Mockito.mock(
			EntitlementDefinition.class);

		Mockito.when(
			entitlementDefinition.getDisplayName()
		).thenReturn(
			_PRODUCT_NAME
		);

		Mockito.when(
			entitlementDefinition.getExternalReferenceCode()
		).thenReturn(
			externalReferenceCode
		);

		Entitlement entitlement = Mockito.mock(Entitlement.class);

		Mockito.when(
			entitlement.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			entitlement.getEndDateInstant()
		).thenReturn(
			Instant.parse(_ENTITLEMENT_END_DATE)
		);

		Mockito.when(
			entitlement.getEntitlementDefinition()
		).thenReturn(
			entitlementDefinition
		);

		Mockito.when(
			entitlement.getEntitlementId()
		).thenReturn(
			_ENTITLEMENT_ID
		);

		Mockito.when(
			entitlement.getQuantity()
		).thenReturn(
			quantity
		);

		return entitlement;
	}

	private String _createInvitationBodyJSON(
		String... roleExternalReferenceCodes) {

		return new JSONObject(
		).put(
			"emailAddress", _EMAIL_ADDRESS
		).put(
			"familyName", "Doe"
		).put(
			"givenName", "Jane"
		).put(
			"roleExternalReferenceCodes",
			new JSONArray(List.of(roleExternalReferenceCodes))
		).toString();
	}

	private UserAccount _createInviterUserAccount() {
		UserAccount userAccount = new UserAccount();

		userAccount.setName("Inviter Name");

		return userAccount;
	}

	private String _createLicenseKeyBodyJSON(
		int maxClusterNodes, String owner) {

		return new JSONArray(
		).put(
			_toLicenseKeyJSONObject(maxClusterNodes, owner)
		).toString();
	}

	private String _createLicenseKeysBodyJSON(int count, int maxClusterNodes) {
		JSONArray jsonArray = new JSONArray();

		for (int i = 0; i < count; i++) {
			jsonArray.put(
				_toLicenseKeyJSONObject(maxClusterNodes, "jane@example.com"));
		}

		return jsonArray.toString();
	}

	private Project _createProject(String accountExternalReferenceCode) {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"name", "Project One"
			).put(
				"r_accountEntryToProject_accountEntryERC",
				accountExternalReferenceCode
			));
	}

	private String _createProjectInvitationBodyJSON() {
		return new JSONObject(
		).put(
			"emailAddress", _EMAIL_ADDRESS
		).put(
			"familyName", "Doe"
		).put(
			"givenName", "Jane"
		).put(
			"projectExternalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
		).put(
			"projectRoleExternalReferenceCode", _PROJECT_ROLE_ERC
		).put(
			"roleExternalReferenceCodes", new JSONArray()
		).toString();
	}

	private UserAccount _createUserAccount() {
		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(_EMAIL_ADDRESS);
		userAccount.setId(_USER_ID);

		return userAccount;
	}

	private UserAccount _createUserAccount(long accountId, String roleName) {
		UserAccount userAccount = _createUserAccount();

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(accountId);

		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setName(roleName);

		accountBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});

		return userAccount;
	}

	private JSONObject _toLicenseKeyJSONObject(
		int maxClusterNodes, String owner) {

		return new JSONObject(
		).put(
			"entitlementId", _ENTITLEMENT_ID
		).put(
			"expirationDate", _EXPIRATION_DATE
		).put(
			"hostName", "acme.example.com"
		).put(
			"licenseType", LicenseConstants.TYPE_PRODUCTION
		).put(
			"maxClusterNodes", maxClusterNodes
		).put(
			"name", _LICENSE_KEY_NAME
		).put(
			"owner", owner
		).put(
			"productVersion", _PRODUCT_VERSION
		).put(
			"startDate", _START_DATE
		);
	}

	private static final long _ACCOUNT_ID = 11111;

	private static final long _ACCOUNT_INVITATION_ID = 44444;

	private static final String _ACCOUNT_NAME = "Acme";

	private static final long _ACCOUNT_ROLE_ID = 33333;

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _ENTITLEMENT_END_DATE = "2027-06-01T00:00:00Z";

	private static final long _ENTITLEMENT_ID = 7777;

	private static final String _EXPIRATION_DATE = "2027-01-01T00:00:00Z";

	private static final String _EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final String _LICENSE_KEY_NAME = "Acme production";

	private static final String _PRODUCT_NAME = "Liferay DXP";

	private static final String _PRODUCT_VERSION = "7.4";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final String _PROJECT_ROLE_ERC = "C_PROJECT_ADMIN";

	private static final String _START_DATE = "2026-01-01T00:00:00Z";

	private static final long _USER_ID = 22222;

	private final AccountAssetService _accountAssetService = Mockito.mock(
		AccountAssetService.class);
	private final AccountInvitationEmailService _accountInvitationEmailService =
		Mockito.mock(AccountInvitationEmailService.class);
	private final AccountInvitationService _accountInvitationService =
		Mockito.mock(AccountInvitationService.class);
	private final AccountPermission _accountPermission = Mockito.mock(
		AccountPermission.class);
	private final AccountRoleService _accountRoleService = Mockito.mock(
		AccountRoleService.class);
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final AccountSynchronizer _accountSynchronizer = Mockito.mock(
		AccountSynchronizer.class);
	private final AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer = Mockito.mock(
			AccountUserAccountRoleSynchronizer.class);
	private final AccountUserAccountSynchronizer
		_accountUserAccountSynchronizer = Mockito.mock(
			AccountUserAccountSynchronizer.class);
	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final EmailAddressValidatorService _emailAddressValidatorService =
		Mockito.mock(EmailAddressValidatorService.class);
	private final EntitlementDefinitionService _entitlementDefinitionService =
		Mockito.mock(EntitlementDefinitionService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final LicenseKeyCSVExporter _licenseKeyCSVExporter = Mockito.mock(
		LicenseKeyCSVExporter.class);
	private final LicenseKeyPermission _licenseKeyPermission = Mockito.mock(
		LicenseKeyPermission.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private final ProjectMembershipPermission _projectMembershipPermission =
		Mockito.mock(ProjectMembershipPermission.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final ProvisioningAssignmentService _provisioningAssignmentService =
		Mockito.mock(ProvisioningAssignmentService.class);
	private final ProvisioningEmailService _provisioningEmailService =
		Mockito.mock(ProvisioningEmailService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}