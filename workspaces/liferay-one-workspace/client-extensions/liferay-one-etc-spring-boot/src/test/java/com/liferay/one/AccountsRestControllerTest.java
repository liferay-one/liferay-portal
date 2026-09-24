/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.exception.DuplicateAccountException;
import com.liferay.one.jira.service.AccountAssetService;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.model.AccountInvitation;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.permission.AccountPermission;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.AccountInvitationEmailService;
import com.liferay.one.service.AccountInvitationService;
import com.liferay.one.service.AccountRoleService;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.EmailAddressValidatorService;
import com.liferay.one.service.EntitlementDefinitionService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.ProvisioningEmailService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserAssignmentService;
import com.liferay.one.util.TermCountUtil;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.lang.reflect.Field;

import java.time.Instant;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.Jwt;
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
	public void testDeleteUserAccountsChecksAssignMembersPermission()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_denyAssignMembersPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.deleteUserAccounts(
				null, _EXTERNAL_REFERENCE_CODE, _USER_ID));

		Mockito.verifyNoInteractions(_accountService, _userAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsRejectsLastAccountManager()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();

		UserAccount userAccount = _createUserAccount(
			_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		Mockito.when(
			_userAccountService.getAccountUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			List.of(userAccount)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.deleteUserAccounts(
					null, _EXTERNAL_REFERENCE_CODE, _USER_ID));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsRejectsNonmember() throws Exception {
		AccountsRestController accountsRestController = _createController();

		_mockAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID + 1, "Account Member")
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.deleteUserAccounts(
					null, _EXTERNAL_REFERENCE_CODE, _USER_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testDeleteUserAccountsUnassignsAccount() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = _mockAccount();

		UserAccount managerUserAccount = _createUserAccount(
			_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		managerUserAccount.setId(_USER_ID + 1);

		UserAccount userAccount = _createUserAccount(
			_ACCOUNT_ID, RoleConstants.NAME_ACCOUNT_ADMINISTRATOR);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		Mockito.when(
			_userAccountService.getAccountUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			List.of(managerUserAccount, userAccount)
		);

		accountsRestController.deleteUserAccounts(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_accountPermission, _userAssignmentService);

		inOrder.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null
		);

		inOrder.verify(
			_userAssignmentService
		).unassignAccount(
			account, _USER_ID
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
			_createAccountRole(_ACCOUNT_ROLE_ID, "Account Administrator")
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
	public void testPostAccountsAssignsCreatorAsAdministrator()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = new Account();

		account.setId(() -> _ACCOUNT_ID);
		account.setName(() -> "Acme");

		PostalAddress postalAddress = new PostalAddress();

		postalAddress.setId(() -> _POSTAL_ADDRESS_ID);

		account.setPostalAddresses(() -> new PostalAddress[] {postalAddress});

		Mockito.when(
			_accountService.addAccount(ArgumentMatchers.any(Account.class))
		).thenReturn(
			account
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(() -> _EMAIL_ADDRESS);
		userAccount.setId(() -> _USER_ID);

		Jwt jwt = Mockito.mock(Jwt.class);

		Mockito.when(
			_userAccountService.getMyUserAccount(jwt)
		).thenReturn(
			userAccount
		);

		AccountRole accountRole = new AccountRole();

		accountRole.setId(() -> _ACCOUNT_ROLE_ID);

		Mockito.when(
			_accountRoleService.fetchAccountRoleByName(
				RoleConstants.NAME_ACCOUNT_ADMINISTRATOR)
		).thenReturn(
			accountRole
		);

		Account newAccount = accountsRestController.postAccounts(
			jwt, "{\"name\": \"Acme\"}", null);

		Assertions.assertEquals("Acme", newAccount.getName());

		Mockito.verify(
			_accountService
		).patchAccount(
			Mockito.eq(_ACCOUNT_ID),
			ArgumentMatchers.argThat(
				patchAccount -> Objects.equals(
					patchAccount.getDefaultBillingAddressId(),
					_POSTAL_ADDRESS_ID))
		);

		Mockito.verify(
			_accountService
		).addAccountUserAccountByEmailAddress(
			Mockito.eq(_ACCOUNT_ID), ArgumentMatchers.anyString(),
			Mockito.isNull()
		);

		Mockito.verify(
			_accountService
		).addAccountUserAccountRole(
			Mockito.eq(_ACCOUNT_ID), Mockito.eq(_ACCOUNT_ROLE_ID),
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testPostAccountsOnlyForwardsFormFields() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = new Account();

		account.setId(() -> _ACCOUNT_ID);
		account.setName(() -> "Acme");

		Mockito.when(
			_accountService.addAccount(ArgumentMatchers.any(Account.class))
		).thenReturn(
			account
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(() -> _EMAIL_ADDRESS);
		userAccount.setId(() -> _USER_ID);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			userAccount
		);

		JSONObject accountJSONObject = new JSONObject(
		).put(
			"customFields",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"customValue",
					new JSONObject(
					).put(
						"data", _EMAIL_ADDRESS
					)
				).put(
					"name", "Contact Email"
				)
			).put(
				new JSONObject(
				).put(
					"customValue",
					new JSONObject(
					).put(
						"data", "Platinum"
					)
				).put(
					"name", "accountTier"
				)
			)
		).put(
			"name", "Acme"
		).put(
			"organizationIds", new JSONArray(List.of(1))
		).put(
			"parentAccountId", 2
		).put(
			"taxId", "123"
		).put(
			"type", "business"
		);

		accountsRestController.postAccounts(
			null, accountJSONObject.toString(), null);

		ArgumentCaptor<Account> argumentCaptor = ArgumentCaptor.forClass(
			Account.class);

		Mockito.verify(
			_accountService
		).addAccount(
			argumentCaptor.capture()
		);

		Account capturedAccount = argumentCaptor.getValue();

		CustomField[] customFields = capturedAccount.getCustomFields();

		Assertions.assertEquals(1, customFields.length);
		Assertions.assertEquals("Contact Email", customFields[0].getName());

		Assertions.assertEquals("Acme", capturedAccount.getName());
		Assertions.assertNull(capturedAccount.getOrganizationIds());
		Assertions.assertNull(capturedAccount.getParentAccountId());
		Assertions.assertEquals("123", capturedAccount.getTaxId());
		Assertions.assertEquals(
			Account.Type.BUSINESS, capturedAccount.getType());
	}

	@Test
	public void testPostAccountsRejectsDuplicateName() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Mockito.when(
			_accountService.addAccount(ArgumentMatchers.any(Account.class))
		).thenThrow(
			new DuplicateAccountException(
				"An account already exists with the name Acme")
		);

		DuplicateAccountException duplicateAccountException =
			Assertions.assertThrows(
				DuplicateAccountException.class,
				() -> accountsRestController.postAccounts(
					null, "{\"name\": \"Acme\"}", null));

		Assertions.assertEquals(
			"An account already exists with the name Acme",
			duplicateAccountException.getMessage());

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccountUserAccountByEmailAddress(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any()
		);
	}

	@Test
	public void testPostAccountsRejectsSupplierType() throws Exception {
		AccountsRestController accountsRestController = _createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.postAccounts(
					null, "{\"name\": \"Acme\", \"type\": \"supplier\"}",
					null));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccount(
			ArgumentMatchers.any(Account.class)
		);
	}

	@Test
	public void testPostAccountsSetsLogoFromFile() throws Exception {
		AccountsRestController accountsRestController = _createController();

		Account account = new Account();

		account.setId(() -> _ACCOUNT_ID);
		account.setName(() -> "Acme");

		Mockito.when(
			_accountService.addAccount(ArgumentMatchers.any(Account.class))
		).thenReturn(
			account
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(() -> _EMAIL_ADDRESS);
		userAccount.setId(() -> _USER_ID);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			userAccount
		);

		accountsRestController.postAccounts(
			null, "{\"name\": \"Acme\"}",
			new MockMultipartFile(
				"file", "logo.png", "image/png", new byte[] {1, 2, 3}));

		ArgumentCaptor<Account> argumentCaptor = ArgumentCaptor.forClass(
			Account.class);

		Mockito.verify(
			_accountService
		).addAccount(
			argumentCaptor.capture()
		);

		Account capturedAccount = argumentCaptor.getValue();

		Assertions.assertEquals("AQID", capturedAccount.getLogoBase64());

		Mockito.verify(
			_accountService, Mockito.never()
		).patchAccount(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any(Account.class)
		);
	}

	@Test
	public void testPostAccountsWithoutAccountAdministratorRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = new Account();

		account.setId(() -> _ACCOUNT_ID);
		account.setName(() -> "Acme");

		Mockito.when(
			_accountService.addAccount(ArgumentMatchers.any(Account.class))
		).thenReturn(
			account
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(() -> _EMAIL_ADDRESS);
		userAccount.setId(() -> _USER_ID);

		Mockito.when(
			_userAccountService.getMyUserAccount(null)
		).thenReturn(
			userAccount
		);

		Account newAccount = accountsRestController.postAccounts(
			null, "{\"name\": \"Acme\"}", null);

		Assertions.assertEquals("Acme", newAccount.getName());

		Mockito.verify(
			_accountService
		).addAccountUserAccountByEmailAddress(
			Mockito.eq(_ACCOUNT_ID), ArgumentMatchers.anyString(),
			Mockito.isNull()
		);

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccountUserAccountRole(
			ArgumentMatchers.anyLong(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyLong()
		);
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
			_projectPermission
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
			_createAccountRole(_ACCOUNT_ROLE_ID, "Account Administrator")
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
			_projectPermission
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
			_createAccountRole(_ACCOUNT_ROLE_ID, "Account Administrator")
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
	public void testPostUserAccountsByEmailAddressAccountRolesAddsMemberWithoutRoles()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _mockAccount();

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount()
		);

		Mockito.when(
			_userAssignmentService.assignAccount(account, _USER_ID)
		).thenReturn(
			true
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "{}");

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).assignAccountRole(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);

		Mockito.verify(
			_provisioningEmailService
		).sendAssignedWelcomeEmail(
			account, _USER_ID
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesAddsNewUser()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _mockAccount();

		AccountRole accountRole = _mockAccountRole(
			_ACCOUNT_ROLE_ID, "Support Administrator");

		Mockito.when(
			_userAccountService.addUserAccount(_EMAIL_ADDRESS, "Doe", "Jane")
		).thenReturn(
			_createUserAccount()
		);

		Mockito.when(
			_userAssignmentService.assignAccount(account, _USER_ID)
		).thenReturn(
			true
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
			_createBodyJSON(_ACCOUNT_ROLE_ID, "Jane", "Doe"));

		InOrder inOrder = Mockito.inOrder(
			_adminPermission, _provisioningEmailService, _userAccountService,
			_userAssignmentService);

		inOrder.verify(
			_adminPermission
		).check(
			null
		);

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

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			account, accountRole, _USER_ID
		);

		inOrder.verify(
			_provisioningEmailService
		).sendAssignedWelcomeEmail(
			account, _USER_ID
		);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesChecksAdminPermission()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				accountsRestController.
					postUserAccountsByEmailAddressAccountRoles(
						null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, "{}"));

		Mockito.verifyNoInteractions(_accountService, _userAssignmentService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsAssignedRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();
		_mockAccountRole(_ACCOUNT_ROLE_ID, "Account Member");

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

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsMalformedBody()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();

		Assertions.assertThrows(
			JSONException.class,
			() ->
				accountsRestController.
					postUserAccountsByEmailAddressAccountRoles(
						null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
						"not json"));

		Mockito.verifyNoInteractions(_userAssignmentService);
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

		Mockito.verifyNoInteractions(_accountService, _userAssignmentService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRejectsUnknownAccountRole()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					accountsRestController.
						postUserAccountsByEmailAddressAccountRoles(
							null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
							_createBodyJSON(_ACCOUNT_ROLE_ID, "Jane", "Doe")));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_userAccountService, Mockito.never()
		).addUserAccount(
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesRequiresNamesForNewUser()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();

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

		Mockito.verify(
			_userAccountService, Mockito.never()
		).addUserAccount(
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostUserAccountsByEmailAddressAccountRolesSkipsEmailForMember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _mockAccount();

		AccountRole accountRole = _mockAccountRole(
			_ACCOUNT_ROLE_ID, "Support Administrator");

		Mockito.when(
			_userAccountService.fetchUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			_createUserAccount(_ACCOUNT_ID, "Account Member")
		);

		accountsRestController.postUserAccountsByEmailAddressAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
			_createBodyJSON(_ACCOUNT_ROLE_ID, null, null));

		Mockito.verify(
			_userAssignmentService
		).assignAccountRole(
			account, accountRole, _USER_ID
		);

		Mockito.verifyNoInteractions(_provisioningEmailService);
	}

	@Test
	public void testPutUserAccountsAccountRolesChecksAssignMembersPermission()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_denyAssignMembersPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> accountsRestController.putUserAccountsAccountRoles(
				null, _EXTERNAL_REFERENCE_CODE, _USER_ID,
				_createBodyJSON(_ACCOUNT_ROLE_ID, null, null)));

		Mockito.verifyNoInteractions(_accountService, _userAssignmentService);
	}

	@Test
	public void testPutUserAccountsAccountRolesRejectsLastAccountManager()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();
		_mockAccountRole(_ACCOUNT_ROLE_ID, "Support Administrator");

		UserAccount userAccount = _createUserAccount(
			_ACCOUNT_ID, RoleConstants.NAME_PARTNER_ACCOUNT_ADMIN);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		Mockito.when(
			_userAccountService.getAccountUserAccounts(_ACCOUNT_ID)
		).thenReturn(
			List.of(userAccount, _createUserAccount(_ACCOUNT_ID, "Member"))
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.putUserAccountsAccountRoles(
					null, _EXTERNAL_REFERENCE_CODE, _USER_ID,
					_createBodyJSON(_ACCOUNT_ROLE_ID, null, null)));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPutUserAccountsAccountRolesRejectsNonmember()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		_mockAccount();

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_createUserAccount()
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> accountsRestController.putUserAccountsAccountRoles(
					null, _EXTERNAL_REFERENCE_CODE, _USER_ID,
					_createBodyJSON(_ACCOUNT_ROLE_ID, null, null)));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPutUserAccountsAccountRolesReplacesAccountRoles()
		throws Exception {

		AccountsRestController accountsRestController = _createController();

		Account account = _mockAccount();

		AccountRole addedAccountRole = _mockAccountRole(
			_ACCOUNT_ROLE_ID, "Support Administrator");
		AccountRole removedAccountRole = _mockAccountRole(
			_OTHER_ACCOUNT_ROLE_ID, "Support User");

		UserAccount userAccount = _createUserAccount(
			_ACCOUNT_ID, "Support Administrator");

		AccountBrief accountBrief = userAccount.getAccountBriefs()[0];

		RoleBrief keptRoleBrief = accountBrief.getRoleBriefs()[0];

		keptRoleBrief.setId(_ACCOUNT_ROLE_ID);

		RoleBrief removedRoleBrief = new RoleBrief();

		removedRoleBrief.setId(_OTHER_ACCOUNT_ROLE_ID);
		removedRoleBrief.setName("Support User");

		accountBrief.setRoleBriefs(
			new RoleBrief[] {keptRoleBrief, removedRoleBrief});

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			userAccount
		);

		accountsRestController.putUserAccountsAccountRoles(
			null, _EXTERNAL_REFERENCE_CODE, _USER_ID,
			_createBodyJSON(_ACCOUNT_ROLE_ID, null, null));

		InOrder inOrder = Mockito.inOrder(
			_accountPermission, _userAssignmentService);

		inOrder.verify(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null
		);

		inOrder.verify(
			_userAssignmentService
		).assignAccountRole(
			account, addedAccountRole, _USER_ID
		);

		inOrder.verify(
			_userAssignmentService
		).unassignAccountRole(
			account, removedAccountRole, _USER_ID
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).unassignAccountRole(
			account, addedAccountRole, _USER_ID
		);
	}

	private Account _createAccount() {
		Account account = new Account();

		account.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		account.setId(_ACCOUNT_ID);

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

	private AccountRole _createAccountRole(long id, String name) {
		AccountRole accountRole = new AccountRole();

		accountRole.setExternalReferenceCode("L_ACCOUNT_ADMINISTRATOR");
		accountRole.setId(id);
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
			accountsRestController, "_licenseKeyCSVExporter",
			_licenseKeyCSVExporter);
		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyPermission",
			_licenseKeyPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_licenseKeyService", _licenseKeyService);
		ReflectionTestUtils.setField(
			accountsRestController, "_projectPermission", _projectPermission);
		ReflectionTestUtils.setField(
			accountsRestController, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			accountsRestController, "_provisioningEmailService",
			_provisioningEmailService);
		ReflectionTestUtils.setField(
			accountsRestController, "_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			accountsRestController, "_userAssignmentService",
			_userAssignmentService);

		return accountsRestController;
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

	private void _denyAssignMembersPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_accountPermission
		).check(
			_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS, null
		);
	}

	private Account _mockAccount() throws Exception {
		Account account = _createAccount();

		Mockito.when(
			_accountService.getAccount(_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			account
		);

		return account;
	}

	private AccountRole _mockAccountRole(long id, String name)
		throws Exception {

		AccountRole accountRole = _createAccountRole(id, name);

		Mockito.when(
			_accountRoleService.fetchAccountRole(id)
		).thenReturn(
			accountRole
		);

		return accountRole;
	}

	private static final long _ACCOUNT_ID = 11111;

	private static final long _ACCOUNT_INVITATION_ID = 44444;

	private static final long _ACCOUNT_ROLE_ID = 33333;

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final long _OTHER_ACCOUNT_ROLE_ID = 33334;

	private static final long _POSTAL_ADDRESS_ID = 77L;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final String _PROJECT_ROLE_ERC = "C_PROJECT_ADMIN";

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
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final ProvisioningEmailService _provisioningEmailService =
		Mockito.mock(ProvisioningEmailService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAssignmentService _userAssignmentService = Mockito.mock(
		UserAssignmentService.class);

}