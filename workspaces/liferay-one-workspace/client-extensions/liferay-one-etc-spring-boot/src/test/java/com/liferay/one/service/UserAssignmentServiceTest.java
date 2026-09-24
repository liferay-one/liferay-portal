/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountSynchronizer;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
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
public class UserAssignmentServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_userAssignmentService = new UserAssignmentService();

		ReflectionTestUtils.setField(
			_userAssignmentService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_accountSynchronizer",
			_accountSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_accountUserAccountRoleSynchronizer",
			_accountUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_accountUserAccountSynchronizer",
			_accountUserAccountSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_oktaService", _oktaService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_organizationService",
			_organizationService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_organizationSynchronizer",
			_organizationSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_organizationUserAccountRoleSynchronizer",
			_organizationUserAccountRoleSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_organizationUserAccountSynchronizer",
			_organizationUserAccountSynchronizer);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_provisioningEmailService",
			_provisioningEmailService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_roleService", _roleService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_subscriptionEntryService",
			_subscriptionEntryService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			_userAssignmentService, "_userAccountSynchronizer",
			_userAccountSynchronizer);

		_account = new Account();

		_account.setExternalReferenceCode(_ACCOUNT_EXTERNAL_REFERENCE_CODE);
		_account.setId(_ACCOUNT_ID);

		_organization = new Organization();

		_organization.setExternalReferenceCode(
			_ORGANIZATION_EXTERNAL_REFERENCE_CODE);
		_organization.setId(String.valueOf(_ORGANIZATION_ID));

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenReturn(
			_organization
		);

		_project = new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryId", _ACCOUNT_ID
			));

		_userAccount = new UserAccount();

		_userAccount.setEmailAddress(_EMAIL_ADDRESS);
		_userAccount.setExternalReferenceCode(_USER_EXTERNAL_REFERENCE_CODE);
		_userAccount.setId(_USER_ID);

		Mockito.when(
			_userAccountService.getUserAccount(_USER_ID)
		).thenReturn(
			_userAccount
		);
	}

	@Test
	public void testAssignAccountActivatesContactBeforeAddingMembership()
		throws Exception {

		Assertions.assertTrue(
			_userAssignmentService.assignAccount(_account, _USER_ID));

		InOrder inOrder = Mockito.inOrder(
			_accountService, _accountUserAccountSynchronizer, _oktaService);

		inOrder.verify(
			_oktaService
		).activateContact(
			_USER_ID
		);

		inOrder.verify(
			_accountService
		).addAccountUserAccount(
			_ACCOUNT_ID, _USER_ID
		);

		inOrder.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			_account, _userAccount
		);
	}

	@Test
	public void testAssignAccountRoleAddsMembershipWhenMissing()
		throws Exception {

		AccountRole accountRole = _createAccountRole("Support Administrator");

		_userAssignmentService.assignAccountRole(
			_account, accountRole, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_accountService, _accountUserAccountSynchronizer, _oktaService);

		inOrder.verify(
			_oktaService
		).activateContact(
			_USER_ID
		);

		inOrder.verify(
			_accountService
		).addAccountUserAccount(
			_ACCOUNT_ID, _USER_ID
		);

		inOrder.verify(
			_accountService
		).addAccountUserAccountRole(
			_ACCOUNT_ID, _ACCOUNT_ROLE_ID, _USER_ID
		);

		inOrder.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			_account, _userAccount
		);
	}

	@Test
	public void testAssignAccountRoleAssignsCloudNativeOktaApplication()
		throws Exception {

		_addAccountBrief("Account Member");

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_OKTA_APPLICATION)
		).thenReturn(
			_OKTA_APPLICATION_ID
		);

		_userAssignmentService.assignAccountRole(
			_account,
			_createAccountRole(RoleConstants.NAME_CLOUD_NATIVE_CONTACT),
			_USER_ID);

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccountUserAccount(
			Mockito.anyLong(), Mockito.anyLong()
		);

		Mockito.verify(
			_oktaService, Mockito.never()
		).activateContact(
			Mockito.anyLong()
		);

		Mockito.verify(
			_oktaService
		).assignUserToApplication(
			_OKTA_APPLICATION_ID, _EMAIL_ADDRESS
		);
	}

	@Test
	public void testAssignAccountRoleSendsPartnerEmail() throws Exception {
		String accountRoleName = RoleConstants.NAMES_PARTNER_ACCOUNT_ROLES[0];

		_userAssignmentService.assignAccountRole(
			_account, _createAccountRole(accountRoleName), _USER_ID);

		Mockito.verify(
			_provisioningEmailService
		).sendPartnerUserUpdateEmail(
			_account, _userAccount, accountRoleName, "Assigned"
		);
	}

	@Test
	public void testAssignAccountRoleSkipsHeldRole() throws Exception {
		_addAccountBrief("Support Administrator");

		_userAssignmentService.assignAccountRole(
			_account, _createAccountRole("Support Administrator"), _USER_ID);

		Mockito.verifyNoInteractions(
			_accountService, _accountUserAccountSynchronizer, _oktaService,
			_provisioningEmailService);
	}

	@Test
	public void testAssignAccountRoleSwallowsOktaApplicationFailure()
		throws Exception {

		_addAccountBrief("Account Member");

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_OKTA_APPLICATION)
		).thenReturn(
			_OKTA_APPLICATION_ID
		);

		Mockito.doThrow(
			new RuntimeException("Unable to reach Okta")
		).when(
			_oktaService
		).assignUserToApplication(
			_OKTA_APPLICATION_ID, _EMAIL_ADDRESS
		);

		Assertions.assertDoesNotThrow(
			() -> _userAssignmentService.assignAccountRole(
				_account,
				_createAccountRole(RoleConstants.NAME_CLOUD_NATIVE_CONTACT),
				_USER_ID));

		Mockito.verify(
			_accountService
		).addAccountUserAccountRole(
			_ACCOUNT_ID, _ACCOUNT_ROLE_ID, _USER_ID
		);
	}

	@Test
	public void testAssignAccountRoleSwallowsPartnerEmailFailure()
		throws Exception {

		String accountRoleName = RoleConstants.NAMES_PARTNER_ACCOUNT_ROLES[0];

		Mockito.doThrow(
			new RuntimeException("Unable to send email")
		).when(
			_provisioningEmailService
		).sendPartnerUserUpdateEmail(
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);

		Assertions.assertDoesNotThrow(
			() -> _userAssignmentService.assignAccountRole(
				_account, _createAccountRole(accountRoleName), _USER_ID));

		Mockito.verify(
			_accountService
		).addAccountUserAccountRole(
			_ACCOUNT_ID, _ACCOUNT_ROLE_ID, _USER_ID
		);
	}

	@Test
	public void testAssignAccountSkipsExistingMember() throws Exception {
		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		Assertions.assertFalse(
			_userAssignmentService.assignAccount(_account, _USER_ID));

		Mockito.verifyNoInteractions(
			_accountService, _accountUserAccountSynchronizer, _oktaService);
	}

	@Test
	public void testAssignAccountSwallowsJSMSyncFailure() throws Exception {
		Mockito.doThrow(
			new RuntimeException("Unable to reach JSM")
		).when(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			_account, _userAccount
		);

		Assertions.assertTrue(
			_userAssignmentService.assignAccount(_account, _USER_ID));
	}

	@Test
	public void testAssignOrganizationAddsMemberAndSyncsToJSM()
		throws Exception {

		_userAssignmentService.assignOrganization(_ORGANIZATION_ID, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_oktaService, _organizationService, _organizationSynchronizer,
			_userAccountSynchronizer);

		inOrder.verify(
			_oktaService
		).activateContact(
			_USER_ID
		);

		inOrder.verify(
			_organizationService
		).addOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccountOrganizations(
			_userAccount
		);

		inOrder.verify(
			_userAccountSynchronizer
		).syncUserAccountRoles(
			_userAccount
		);

		inOrder.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			_organization
		);
	}

	@Test
	public void testAssignOrganizationRoleSyncsToJSM() throws Exception {
		_mockOrganizationRole();

		_userAssignmentService.assignOrganizationRole(
			_ORGANIZATION_ID, _ORGANIZATION_ROLE_ID, _USER_ID);

		Mockito.verify(
			_roleService
		).addOrganizationUserAccountRole(
			_ORGANIZATION_ID, _ORGANIZATION_ROLE_ID, _USER_ID
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncAssignRole(
			_ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE,
			_USER_EXTERNAL_REFERENCE_CODE, _ORGANIZATION_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_organizationUserAccountSynchronizer
		).syncOrganizationUserAccountMembership(
			_organization, _userAccount
		);
	}

	@Test
	public void testAssignOrganizationSkipsExistingMember() throws Exception {
		_addOrganizationBrief(_ORGANIZATION_ID);

		_userAssignmentService.assignOrganization(_ORGANIZATION_ID, _USER_ID);

		Mockito.verify(
			_organizationService, Mockito.never()
		).addOrganizationUserAccountByEmailAddress(
			Mockito.any(), Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(
			_oktaService, _organizationSynchronizer, _userAccountSynchronizer);
	}

	@Test
	public void testAssignProjectRoleActivatesContactAndAddsAccountMembership()
		throws Exception {

		Mockito.when(
			_accountService.getAccount(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_account
		);

		_userAssignmentService.assignProjectRole(
			_project, RoleConstants.ERC_PROJECT_ADMIN, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_accountService, _accountUserAccountRoleSynchronizer, _oktaService,
			_projectMembershipService);

		inOrder.verify(
			_oktaService
		).activateContact(
			_USER_ID
		);

		inOrder.verify(
			_accountService
		).addAccountUserAccount(
			_ACCOUNT_ID, _USER_ID
		);

		inOrder.verify(
			_projectMembershipService
		).addProjectMembership(
			_PROJECT_EXTERNAL_REFERENCE_CODE, RoleConstants.ERC_PROJECT_ADMIN,
			_USER_ID
		);

		inOrder.verify(
			_accountUserAccountRoleSynchronizer
		).syncAssignRole(
			RoleConstants.ERC_PROJECT_ADMIN, _USER_EXTERNAL_REFERENCE_CODE,
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_accountSynchronizer
		).syncProjectUserAccounts(
			_project
		);

		Mockito.verify(
			_accountSynchronizer
		).syncAccountUserAccounts(
			_account
		);

		Mockito.verify(
			_userAccountSynchronizer
		).syncUserAccountAccounts(
			_userAccount
		);
	}

	@Test
	public void testAssignProjectRoleSkipsActivationForAccountMember()
		throws Exception {

		Mockito.when(
			_userAccountService.hasAccountUserAccount(_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			true
		);

		_userAssignmentService.assignProjectRole(
			_project, RoleConstants.ERC_PROJECT_ADMIN, _USER_ID);

		Mockito.verify(
			_projectMembershipService
		).addProjectMembership(
			_PROJECT_EXTERNAL_REFERENCE_CODE, RoleConstants.ERC_PROJECT_ADMIN,
			_USER_ID
		);

		Mockito.verify(
			_accountService, Mockito.never()
		).addAccountUserAccount(
			Mockito.anyLong(), Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(_oktaService);
	}

	@Test
	public void testAssignProjectRoleSkipsExistingProjectMembership()
		throws Exception {

		Mockito.when(
			_projectMembershipService.fetchProjectMembership(
				_PROJECT_EXTERNAL_REFERENCE_CODE,
				RoleConstants.ERC_PROJECT_ADMIN, _USER_ID)
		).thenReturn(
			_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN)
		);

		_userAssignmentService.assignProjectRole(
			_project, RoleConstants.ERC_PROJECT_ADMIN, _USER_ID);

		Mockito.verify(
			_projectMembershipService, Mockito.never()
		).addProjectMembership(
			Mockito.any(), Mockito.any(), Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(
			_accountService, _accountSynchronizer, _oktaService);
	}

	@Test
	public void testSyncOktaGroupOrganizationsReconcilesLinkedOrganizations()
		throws Exception {

		_addOrganizationBrief(_OTHER_ORGANIZATION_ID);
		_addOrganizationBrief(_UNLINKED_ORGANIZATION_ID);

		Organization otherOrganization = new Organization();

		otherOrganization.setExternalReferenceCode("ORG-2");

		Mockito.when(
			_organizationService.getOrganization(_OTHER_ORGANIZATION_ID)
		).thenReturn(
			otherOrganization
		);

		Mockito.when(
			_oktaService.getContactGroupIds(_EMAIL_ADDRESS)
		).thenReturn(
			List.of(_OKTA_GROUP_ID)
		);

		Mockito.when(
			_propertyService.getProperties(
				com.liferay.portal.kernel.model.Organization.class.getName(),
				PropertyConstants.NAME_OKTA_GROUP)
		).thenReturn(
			List.of(
				_createProperty(_ORGANIZATION_ID, _OKTA_GROUP_ID),
				_createProperty(_OTHER_ORGANIZATION_ID, "00g-other"))
		);

		_userAssignmentService.syncOktaGroupOrganizations(_USER_ID);

		Mockito.verify(
			_organizationService
		).addOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		Mockito.verify(
			_organizationService
		).removeOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _OTHER_ORGANIZATION_ID
		);

		Mockito.verify(
			_organizationService, Mockito.never()
		).removeOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _UNLINKED_ORGANIZATION_ID
		);
	}

	@Test
	public void testUnassignAccountRemovesProjectMembershipsAndAccountRoles()
		throws Exception {

		String accountRoleName = RoleConstants.NAMES_PARTNER_ACCOUNT_ROLES[0];

		_addAccountBrief(accountRoleName);

		Mockito.when(
			_accountService.getAccount(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_account
		);

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_ACCOUNT_ID, _USER_ID)
		).thenReturn(
			List.of(_createProjectMembership(RoleConstants.ERC_PROJECT_USER))
		);

		Mockito.when(
			_projectMembershipService.deleteProjectMembership(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				RoleConstants.ERC_PROJECT_USER, _USER_ID)
		).thenReturn(
			true
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_project
		);

		_userAssignmentService.unassignAccount(_account, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_accountService, _accountUserAccountRoleSynchronizer,
			_accountUserAccountSynchronizer, _projectMembershipService,
			_subscriptionEntryService);

		inOrder.verify(
			_projectMembershipService
		).deleteProjectMembership(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE,
			RoleConstants.ERC_PROJECT_USER, _USER_ID
		);

		inOrder.verify(
			_accountService
		).removeAccountUserAccount(
			_ACCOUNT_ID, _USER_ID
		);

		inOrder.verify(
			_accountUserAccountRoleSynchronizer
		).syncUnassignRole(
			_ACCOUNT_ROLE_EXTERNAL_REFERENCE_CODE,
			_USER_EXTERNAL_REFERENCE_CODE, _ACCOUNT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_subscriptionEntryService
		).deleteAccountLicenseKeySubscriptionEntries(
			_ACCOUNT_ID, _USER_ID
		);

		inOrder.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			_account, _userAccount
		);

		Mockito.verify(
			_provisioningEmailService
		).sendPartnerUserUpdateEmail(
			_account, _userAccount, accountRoleName, "Unassigned"
		);
	}

	@Test
	public void testUnassignAccountRoleRemovesRoleAndSyncsToJSM()
		throws Exception {

		_addAccountBrief("Support Administrator");

		_userAssignmentService.unassignAccountRole(
			_account, _createAccountRole("Support Administrator"), _USER_ID);

		Mockito.verify(
			_accountService
		).removeAccountUserAccountRole(
			_ACCOUNT_ID, _ACCOUNT_ROLE_ID, _USER_ID
		);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncUnassignRole(
			_ACCOUNT_ROLE_EXTERNAL_REFERENCE_CODE,
			_USER_EXTERNAL_REFERENCE_CODE, _ACCOUNT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_accountUserAccountSynchronizer
		).syncAccountUserAccountMembership(
			_account, _userAccount
		);
	}

	@Test
	public void testUnassignAccountRoleSkipsUnheldRole() throws Exception {
		_addAccountBrief("Account Member");

		_userAssignmentService.unassignAccountRole(
			_account, _createAccountRole("Support Administrator"), _USER_ID);

		Mockito.verifyNoInteractions(
			_accountService, _accountUserAccountRoleSynchronizer,
			_accountUserAccountSynchronizer);
	}

	@Test
	public void testUnassignAccountSkipsNonmember() throws Exception {
		_userAssignmentService.unassignAccount(_account, _USER_ID);

		Mockito.verifyNoInteractions(
			_accountService, _accountUserAccountSynchronizer,
			_projectMembershipService, _subscriptionEntryService);
	}

	@Test
	public void testUnassignOrganizationRoleSyncsToJSM() throws Exception {
		_mockOrganizationRole();

		_userAssignmentService.unassignOrganizationRole(
			_ORGANIZATION_ID, _ORGANIZATION_ROLE_ID, _USER_ID);

		Mockito.verify(
			_roleService
		).removeOrganizationUserAccountRole(
			_ORGANIZATION_ID, _ORGANIZATION_ROLE_ID, _USER_ID
		);

		Mockito.verify(
			_organizationUserAccountRoleSynchronizer
		).syncUnassignRole(
			_ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE,
			_USER_EXTERNAL_REFERENCE_CODE, _ORGANIZATION_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_organizationUserAccountSynchronizer
		).syncOrganizationUserAccountMembership(
			_organization, _userAccount
		);
	}

	@Test
	public void testUnassignOrganizationSkipsNonmember() throws Exception {
		_userAssignmentService.unassignOrganization(_ORGANIZATION_ID, _USER_ID);

		Mockito.verifyNoInteractions(
			_organizationService, _organizationSynchronizer,
			_organizationUserAccountRoleSynchronizer, _userAccountSynchronizer);
	}

	@Test
	public void testUnassignOrganizationSyncsRolesToJSM() throws Exception {
		OrganizationBrief organizationBrief = _addOrganizationBrief(
			_ORGANIZATION_ID);

		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setExternalReferenceCode(
			_ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE);

		organizationBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		_userAssignmentService.unassignOrganization(_ORGANIZATION_ID, _USER_ID);

		InOrder inOrder = Mockito.inOrder(
			_organizationService, _organizationSynchronizer,
			_organizationUserAccountRoleSynchronizer);

		inOrder.verify(
			_organizationService
		).removeOrganizationUserAccountByEmailAddress(
			_EMAIL_ADDRESS, _ORGANIZATION_ID
		);

		inOrder.verify(
			_organizationUserAccountRoleSynchronizer
		).syncUnassignRole(
			_ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE,
			_USER_EXTERNAL_REFERENCE_CODE, _ORGANIZATION_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_organizationSynchronizer
		).syncOrganizationUserAccounts(
			_organization
		);
	}

	@Test
	public void testUnassignProjectRoleSkipsSyncWhenNothingDeleted()
		throws Exception {

		_userAssignmentService.unassignProjectRole(
			_project, RoleConstants.ERC_PROJECT_ADMIN, _USER_ID);

		Mockito.verifyNoInteractions(
			_accountSynchronizer, _accountUserAccountRoleSynchronizer,
			_userAccountSynchronizer);
	}

	@Test
	public void testUnassignProjectRoleSyncsToJSM() throws Exception {
		Mockito.when(
			_projectMembershipService.deleteProjectMembership(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				RoleConstants.ERC_PROJECT_ADMIN, _USER_ID)
		).thenReturn(
			true
		);

		_userAssignmentService.unassignProjectRole(
			_project, RoleConstants.ERC_PROJECT_ADMIN, _USER_ID);

		Mockito.verify(
			_accountSynchronizer
		).syncProjectUserAccounts(
			_project
		);

		Mockito.verify(
			_accountUserAccountRoleSynchronizer
		).syncUnassignRole(
			RoleConstants.ERC_PROJECT_ADMIN, _USER_EXTERNAL_REFERENCE_CODE,
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	private void _addAccountBrief(String accountRoleName) {
		RoleBrief roleBrief = new RoleBrief();

		roleBrief.setExternalReferenceCode(
			_ACCOUNT_ROLE_EXTERNAL_REFERENCE_CODE);
		roleBrief.setId(_ACCOUNT_ROLE_ID);
		roleBrief.setName(accountRoleName);

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setExternalReferenceCode(_ACCOUNT_EXTERNAL_REFERENCE_CODE);
		accountBrief.setId(_ACCOUNT_ID);
		accountBrief.setRoleBriefs(new RoleBrief[] {roleBrief});

		_userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
	}

	private OrganizationBrief _addOrganizationBrief(long organizationId) {
		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setExternalReferenceCode(
			_ORGANIZATION_EXTERNAL_REFERENCE_CODE);
		organizationBrief.setId(organizationId);

		OrganizationBrief[] organizationBriefs =
			_userAccount.getOrganizationBriefs();

		if (organizationBriefs == null) {
			_userAccount.setOrganizationBriefs(
				new OrganizationBrief[] {organizationBrief});
		}
		else {
			OrganizationBrief[] newOrganizationBriefs =
				new OrganizationBrief[organizationBriefs.length + 1];

			System.arraycopy(
				organizationBriefs, 0, newOrganizationBriefs, 0,
				organizationBriefs.length);

			newOrganizationBriefs[organizationBriefs.length] =
				organizationBrief;

			_userAccount.setOrganizationBriefs(newOrganizationBriefs);
		}

		return organizationBrief;
	}

	private AccountRole _createAccountRole(String name) {
		AccountRole accountRole = new AccountRole();

		accountRole.setExternalReferenceCode(
			_ACCOUNT_ROLE_EXTERNAL_REFERENCE_CODE);
		accountRole.setId(_ACCOUNT_ROLE_ID);
		accountRole.setName(name);

		return accountRole;
	}

	private ProjectMembership _createProjectMembership(
		String roleExternalReferenceCode) {

		return new ProjectMembership(
			new JSONObject(
			).put(
				"r_accountEntryToProjectMembership_accountEntryId", _ACCOUNT_ID
			).put(
				"r_projectToProjectMembership_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_userToProjectMembership_userId", _USER_ID
			).put(
				"roleExternalReferenceCode", roleExternalReferenceCode
			));
	}

	private Property _createProperty(long classPK, String value) {
		return new Property(
			new JSONObject(
			).put(
				"classPK", classPK
			).put(
				"id", classPK
			).put(
				"name", PropertyConstants.NAME_OKTA_GROUP
			).put(
				"value", value
			));
	}

	private void _mockOrganizationRole() throws Exception {
		Role role = new Role();

		role.setExternalReferenceCode(
			_ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE);

		Mockito.when(
			_roleService.getRole(_ORGANIZATION_ROLE_ID)
		).thenReturn(
			role
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final long _ACCOUNT_ID = 11111;

	private static final String _ACCOUNT_ROLE_EXTERNAL_REFERENCE_CODE =
		"ROLE-ERC-1";

	private static final long _ACCOUNT_ROLE_ID = 33333;

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _OKTA_APPLICATION_ID = "0oa-cloud-native";

	private static final String _OKTA_GROUP_ID = "00g-account-access-us";

	private static final String _ORGANIZATION_EXTERNAL_REFERENCE_CODE = "ORG-1";

	private static final long _ORGANIZATION_ID = 44444;

	private static final String _ORGANIZATION_ROLE_EXTERNAL_REFERENCE_CODE =
		"ORG-ROLE-ERC-1";

	private static final long _ORGANIZATION_ROLE_ID = 55555;

	private static final long _OTHER_ORGANIZATION_ID = 44445;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final long _UNLINKED_ORGANIZATION_ID = 44446;

	private static final String _USER_EXTERNAL_REFERENCE_CODE = "USER-ERC-1";

	private static final long _USER_ID = 22222;

	private Account _account;
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
	private final OktaService _oktaService = Mockito.mock(OktaService.class);
	private Organization _organization;
	private final OrganizationService _organizationService = Mockito.mock(
		OrganizationService.class);
	private final OrganizationSynchronizer _organizationSynchronizer =
		Mockito.mock(OrganizationSynchronizer.class);
	private final OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer = Mockito.mock(
			OrganizationUserAccountRoleSynchronizer.class);
	private final OrganizationUserAccountSynchronizer
		_organizationUserAccountSynchronizer = Mockito.mock(
			OrganizationUserAccountSynchronizer.class);
	private Project _project;
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);
	private final ProvisioningEmailService _provisioningEmailService =
		Mockito.mock(ProvisioningEmailService.class);
	private final RoleService _roleService = Mockito.mock(RoleService.class);
	private final SubscriptionEntryService _subscriptionEntryService =
		Mockito.mock(SubscriptionEntryService.class);
	private UserAccount _userAccount;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAccountSynchronizer _userAccountSynchronizer =
		Mockito.mock(UserAccountSynchronizer.class);
	private UserAssignmentService _userAssignmentService;

}