/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Objects;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Franca
 */
@DisplayName(
	"[PERM-ENVIRONMENTACTIVATIONPERMISSION] EnvironmentActivationPermission"
)
public class EnvironmentActivationPermissionTest {

	@BeforeEach
	public void setUp() throws Exception {
		Account account = Mockito.mock(Account.class);

		Mockito.when(
			account.getExternalReferenceCode()
		).thenReturn(
			_ACCOUNT_ERC
		);

		Mockito.when(
			account.getId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_accountService.fetchAccountByExternalReferenceCode(_ACCOUNT_ERC)
		).thenReturn(
			account
		);
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsAccountAdministrator()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				null, null);

		Account account =
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_ACCOUNT_ERC, null);

		Assertions.assertEquals(_ACCOUNT_ID, account.getId());
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsAdministratorForMissingAccount()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_ADMINISTRATOR}, null,
					new String[0]),
				null, null);

		Assertions.assertNull(
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_OTHER_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsLicenseKeyManager()
		throws Exception {

		UserAccount userAccount = _createUserAccount(
			new String[0], _ACCOUNT_ERC,
			new String[] {RoleConstants.NAME_LIFERAY_SALES});

		Mockito.when(
			_licenseKeyPermission.contains(
				userAccount, _ACCOUNT_ID, ActionKeys.UPDATE)
		).thenReturn(
			true
		);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(userAccount, null, null);

		Assertions.assertNotNull(
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsLiferayStaff()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_LIFERAY_STAFF}, null,
					new String[0]),
				null, null);

		Assertions.assertNotNull(
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsPartnerManager()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_PARTNER_MANAGER}),
				null, null);

		Assertions.assertNotNull(
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationGrantsProvisioningAdministrator()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[] {
						RoleConstants.NAME_PROVISIONING_ADMINISTRATOR
					},
					null, new String[0]),
				null, null);

		Assertions.assertNotNull(
			environmentActivationPermission.checkAccountLicenseKeyActivation(
				_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationThrowsForAccountMember()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], _ACCOUNT_ERC, new String[0]),
				null, null);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				environmentActivationPermission.
					checkAccountLicenseKeyActivation(_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationThrowsForAdministratorOfOtherAccount()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _OTHER_ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				null, null);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				environmentActivationPermission.
					checkAccountLicenseKeyActivation(_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckAccountLicenseKeyActivationThrowsForMissingAccount()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _OTHER_ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				null, null);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				environmentActivationPermission.
					checkAccountLicenseKeyActivation(_OTHER_ACCOUNT_ERC, null));
	}

	@Test
	public void testCheckGrantsAccountAdministrator() throws Exception {
		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				project, null);

		Assertions.assertSame(
			project, environmentActivationPermission.check(null, _PROJECT_ERC));

		Mockito.verify(
			_projectService, Mockito.times(1)
		).fetchProject(
			_PROJECT_ERC
		);
	}

	@Test
	public void testCheckGrantsAccountAdministratorWithNullRoleBriefs()
		throws Exception {

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					null, _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				project, null);

		Assertions.assertSame(
			project, environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckGrantsAdministrator() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_ADMINISTRATOR}, null,
					new String[0]),
				null, null);

		Assertions.assertNull(
			environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckGrantsLiferayStaff() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[] {RoleConstants.NAME_LIFERAY_STAFF}, null,
					new String[0]),
				null, null);

		environmentActivationPermission.check(null, _PROJECT_ERC);
	}

	@Test
	public void testCheckGrantsProjectAdminMembership() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]),
				_createProject(_ACCOUNT_ERC),
				_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN));

		environmentActivationPermission.check(null, _PROJECT_ERC);
	}

	@Test
	public void testCheckGrantsProjectAdminMembershipWithNullAccountRoleBriefs()
		throws Exception {

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], _ACCOUNT_ERC, null), project,
				_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN));

		Assertions.assertSame(
			project, environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckLicenseKeyActivationGrantsPartnerManager()
		throws Exception {

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_PARTNER_MANAGER}),
				project, null);

		Assertions.assertSame(
			project,
			environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC));
	}

	@Test
	public void testCheckLicenseKeyActivationThrowsForPartnerManagerOfOtherAccount()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _OTHER_ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_PARTNER_MANAGER}),
				_createProject(_ACCOUNT_ERC), null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC));
	}

	@Test
	public void testCheckSelfProvisioningThrowsWhenDisabled() throws Exception {
		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", false));

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				null, null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.checkSelfProvisioning(
				_ACCOUNT_ID, null));
	}

	@Test
	public void testCheckThrowsForNullAccountBriefs() throws Exception {
		UserAccount userAccount = _createUserAccount(
			new String[0], null, new String[0]);

		Mockito.when(
			userAccount.getAccountBriefs()
		).thenReturn(
			null
		);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(userAccount, _createProject(_ACCOUNT_ERC), null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckThrowsForNullProject() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), null,
				null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckThrowsForPartnerManager() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_PARTNER_MANAGER}),
				_createProject(_ACCOUNT_ERC), null);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testCheckThrowsForRequesterMembership() throws Exception {
		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]),
				_createProject(_ACCOUNT_ERC),
				_createProjectMembership(RoleConstants.ERC_PROJECT_REQUESTER));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> environmentActivationPermission.check(null, _PROJECT_ERC));
	}

	@Test
	public void testContainsProvisioningDeniesProjectAdminWhenDisabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", false));

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), project,
				_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN));

		Assertions.assertFalse(
			environmentActivationPermission.containsProvisioning(
				null, project));
	}

	@Test
	public void testContainsProvisioningDeniesProjectMemberWhenEnabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", true));

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), project,
				_createProjectMembership(RoleConstants.ERC_PROJECT_REQUESTER));

		Assertions.assertFalse(
			environmentActivationPermission.containsProvisioning(
				null, project));
	}

	@Test
	public void testContainsProvisioningGrantsProjectAdminWhenEnabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", true));

		Project project = _createProject(_ACCOUNT_ERC);

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), project,
				_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN));

		Assertions.assertTrue(
			environmentActivationPermission.containsProvisioning(
				null, project));
	}

	@Test
	public void testContainsSelfProvisioningAllowsMissingAccount()
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), null,
				null);

		Assertions.assertTrue(
			environmentActivationPermission.containsSelfProvisioning(
				_ACCOUNT_ID, null));
	}

	@Test
	public void testContainsSelfProvisioningAllowsMissingCustomField()
		throws Exception {

		_stubAccountCustomFields();

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), null,
				null);

		Assertions.assertTrue(
			environmentActivationPermission.containsSelfProvisioning(
				_ACCOUNT_ID, null));
	}

	@Test
	public void testContainsSelfProvisioningAllowsWhenEnabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", true));

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(new String[0], null, new String[0]), null,
				null);

		Assertions.assertTrue(
			environmentActivationPermission.containsSelfProvisioning(
				_ACCOUNT_ID, null));
	}

	@Test
	public void testContainsSelfProvisioningDeniesWhenDisabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", false));

		EnvironmentActivationPermission environmentActivationPermission =
			_createPermission(
				_createUserAccount(
					new String[0], _ACCOUNT_ERC,
					new String[] {RoleConstants.NAME_ACCOUNT_ADMINISTRATOR}),
				null, null);

		Assertions.assertFalse(
			environmentActivationPermission.containsSelfProvisioning(
				_ACCOUNT_ID, null));
	}

	@Test
	public void testContainsSelfProvisioningGrantsGlobalRolesWhenDisabled()
		throws Exception {

		_stubAccountCustomFields(
			_createCustomField("allowSelfProvisioning", false));

		for (String roleName :
				new String[] {
					RoleConstants.NAME_ADMINISTRATOR,
					RoleConstants.NAME_LIFERAY_STAFF,
					RoleConstants.NAME_PROVISIONING_ADMINISTRATOR
				}) {

			EnvironmentActivationPermission environmentActivationPermission =
				_createPermission(
					_createUserAccount(
						new String[] {roleName}, null, new String[0]),
					null, null);

			Assertions.assertTrue(
				environmentActivationPermission.containsSelfProvisioning(
					_ACCOUNT_ID, null),
				roleName);
		}
	}

	private CustomField _createCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(() -> name);

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> data);

		customField.setCustomValue(() -> customValue);

		return customField;
	}

	private EnvironmentActivationPermission _createPermission(
			UserAccount userAccount, Project project,
			ProjectMembership projectMembership)
		throws Exception {

		EnvironmentActivationPermission environmentActivationPermission =
			new EnvironmentActivationPermission();

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_ERC)
		).thenReturn(
			project
		);

		ProjectMembershipService projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);

		ProjectMembership projectAdminMembership = null;

		if ((projectMembership != null) &&
			Objects.equals(
				RoleConstants.ERC_PROJECT_ADMIN,
				projectMembership.getRoleExternalReferenceCode())) {

			projectAdminMembership = projectMembership;
		}

		Mockito.when(
			projectMembershipService.fetchProjectMembership(
				_PROJECT_ERC, RoleConstants.ERC_PROJECT_ADMIN,
				userAccount.getId())
		).thenReturn(
			projectAdminMembership
		);

		ReflectionTestUtils.setField(
			environmentActivationPermission, "_accountService",
			_accountService);

		ReflectionTestUtils.setField(
			environmentActivationPermission, "_licenseKeyPermission",
			_licenseKeyPermission);

		ReflectionTestUtils.setField(
			environmentActivationPermission, "_projectMembershipService",
			projectMembershipService);

		ReflectionTestUtils.setField(
			environmentActivationPermission, "_projectService",
			_projectService);

		ReflectionTestUtils.setField(
			environmentActivationPermission, "_userAccountService",
			userAccountService);

		return environmentActivationPermission;
	}

	private Project _createProject(String accountExternalReferenceCode) {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_ERC
			).put(
				"r_accountEntryToProject_accountEntryERC",
				accountExternalReferenceCode
			).put(
				"r_accountEntryToProject_accountEntryId", _ACCOUNT_ID
			));
	}

	private ProjectMembership _createProjectMembership(
		String roleExternalReferenceCode) {

		return new ProjectMembership(
			new JSONObject(
			).put(
				"r_projectToProjectMembership_c_projectERC", _PROJECT_ERC
			).put(
				"r_userToProjectMembership_userId", _USER_ID
			).put(
				"roleExternalReferenceCode", roleExternalReferenceCode
			));
	}

	private RoleBrief[] _createRoleBriefs(String[] roleNames) {
		if (roleNames == null) {
			return null;
		}

		RoleBrief[] roleBriefs = new RoleBrief[roleNames.length];

		for (int i = 0; i < roleNames.length; i++) {
			RoleBrief roleBrief = Mockito.mock(RoleBrief.class);

			Mockito.when(
				roleBrief.getName()
			).thenReturn(
				roleNames[i]
			);

			roleBriefs[i] = roleBrief;
		}

		return roleBriefs;
	}

	private UserAccount _createUserAccount(
		String[] globalRoleNames, String accountExternalReferenceCode,
		String[] accountRoleNames) {

		UserAccount userAccount = Mockito.mock(UserAccount.class);

		Mockito.when(
			userAccount.getId()
		).thenReturn(
			_USER_ID
		);

		RoleBrief[] roleBriefs = _createRoleBriefs(globalRoleNames);

		Mockito.when(
			userAccount.getRoleBriefs()
		).thenReturn(
			roleBriefs
		);

		if (accountExternalReferenceCode == null) {
			Mockito.when(
				userAccount.getAccountBriefs()
			).thenReturn(
				new AccountBrief[0]
			);

			return userAccount;
		}

		RoleBrief[] accountRoleBriefs = _createRoleBriefs(accountRoleNames);

		AccountBrief accountBrief = Mockito.mock(AccountBrief.class);

		Mockito.when(
			accountBrief.getExternalReferenceCode()
		).thenReturn(
			accountExternalReferenceCode
		);

		Mockito.when(
			accountBrief.getRoleBriefs()
		).thenReturn(
			accountRoleBriefs
		);

		Mockito.when(
			userAccount.getAccountBriefs()
		).thenReturn(
			new AccountBrief[] {accountBrief}
		);

		return userAccount;
	}

	private void _stubAccountCustomFields(CustomField... customFields)
		throws Exception {

		Account account = Mockito.mock(Account.class);

		Mockito.when(
			account.getCustomFields()
		).thenReturn(
			customFields
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);
	}

	private static final String _ACCOUNT_ERC = "ACCOUNT-1";

	private static final long _ACCOUNT_ID = 77L;

	private static final String _OTHER_ACCOUNT_ERC = "ACCOUNT-2";

	private static final String _PROJECT_ERC = "PRJCT-001";

	private static final long _USER_ID = 1000L;

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final LicenseKeyPermission _licenseKeyPermission = Mockito.mock(
		LicenseKeyPermission.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);

}