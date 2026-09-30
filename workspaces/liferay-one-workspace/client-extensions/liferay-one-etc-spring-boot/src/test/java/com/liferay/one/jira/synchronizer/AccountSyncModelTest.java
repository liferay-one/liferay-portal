/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
public class AccountSyncModelTest {

	@BeforeEach
	public void setUp() {
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_jiraBusinessEventService = Mockito.mock(
			JiraBusinessEventService.class);
		_organizationService = Mockito.mock(OrganizationService.class);
		_projectService = Mockito.mock(ProjectService.class);
		_propertyService = Mockito.mock(PropertyService.class);
		_roleService = Mockito.mock(RoleService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		Account account = new Account();

		account.setExternalReferenceCode("test-external-reference-code");
		account.setId(1L);

		_accountSyncModel = new AccountSyncModel(
			account, _commerceOrderService, _entitlementService,
			Mockito.mock(ExternalLinkConverter.class),
			_jiraBusinessEventService, _organizationService, _projectService,
			_propertyService, _roleService, _userAccountService);
	}

	@Test
	public void testGetAccountOrganizationsWhenOrganizationFails()
		throws Exception {

		Mockito.when(
			_organizationService.getAccountOrganizations(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.getAccountOrganizations());
	}

	@Test
	public void testGetAccountRolesByExternalReferenceCodeWhenRoleFails()
		throws Exception {

		Mockito.when(
			_roleService.getAccountRoles()
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_accountSyncModel.getAccountRolesByExternalReferenceCode());
	}

	@Test
	public void testGetActiveEntitlementDefinitionsWhenEntitlementFails()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlementDefinitions(
				Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(
			_accountSyncModel.getActiveEntitlementDefinitions());
	}

	@Test
	public void testGetBusinessEventsFieldValueWhenJiraBusinessEventFails()
		throws Exception {

		Mockito.when(
			_jiraBusinessEventService.getJiraBusinessEvents(Mockito.any())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.getBusinessEventsFieldValue());
	}

	@Test
	public void testGetExternalLinkPropertiesWhenPropertyFails()
		throws Exception {

		Mockito.when(
			_propertyService.getAccountProperties(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.getExternalLinkProperties());
	}

	@Test
	public void testGetProjectsWhenProjectFails() throws Exception {
		Mockito.when(
			_projectService.getProjects(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.getProjects());
	}

	@Test
	public void testGetSupportLanguageWhenCommerceOrderFails()
		throws Exception {

		_whenCommerceOrderFails();

		Assertions.assertNull(_accountSyncModel.getSupportLanguage());
	}

	@Test
	public void testGetSupportRegionWhenCommerceOrderFails() throws Exception {
		_whenCommerceOrderFails();

		Assertions.assertNull(_accountSyncModel.getSupportRegion());
	}

	@Test
	public void testGetUserAccountsWhenUserAccountFails() throws Exception {
		Mockito.when(
			_userAccountService.getAccountUserAccounts(Mockito.anyLong())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.getAccountUserAccounts());
		Assertions.assertNull(_accountSyncModel.getCustomerUserAccounts());
		Assertions.assertNull(
			_accountSyncModel.getRoleExternalKeysByUserAccountExternalKey());
		Assertions.assertNull(_accountSyncModel.getWorkerUserAccounts());
	}

	private void _whenCommerceOrderFails() throws Exception {
		Mockito.when(
			_commerceOrderService.getAccountSupportInfo(
				Mockito.anyLong(), Mockito.any())
		).thenThrow(
			new RuntimeException()
		);
	}

	private AccountSyncModel _accountSyncModel;
	private CommerceOrderService _commerceOrderService;
	private EntitlementService _entitlementService;
	private JiraBusinessEventService _jiraBusinessEventService;
	private OrganizationService _organizationService;
	private ProjectService _projectService;
	private PropertyService _propertyService;
	private RoleService _roleService;
	private UserAccountService _userAccountService;

}