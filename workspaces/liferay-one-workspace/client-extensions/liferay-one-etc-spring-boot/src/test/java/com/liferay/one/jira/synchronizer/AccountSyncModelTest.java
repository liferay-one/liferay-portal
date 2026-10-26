/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;

import java.util.Collections;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
@DisplayName("[SYNC-ACCOUNTSYNCMODEL] AccountSyncModel")
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
			_entitlementService.
				getActiveEntitlementDefinitionsExcludingSelfServiceTrials(
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
		Assertions.assertNull(_accountSyncModel.getSupportRegion());

		Mockito.verify(
			_commerceOrderService
		).getAccountSupportInfo(
			Mockito.anyLong(), Mockito.any()
		);
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

		Mockito.verify(
			_userAccountService
		).getAccountUserAccounts(
			Mockito.anyLong()
		);
	}

	@Test
	public void testIsSupportedWhenAccountHasUnassignedSupportEntitlement()
		throws Exception {

		_whenPartner(false);

		Mockito.when(
			_entitlementService.hasUnterminatedActiveUnassignedEntitlement(
				1L, EntitlementConstants.namesJSMProjects)
		).thenReturn(
			true
		);

		Assertions.assertTrue(_accountSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenAccountIsPartner() throws Exception {
		_whenPartner(true);

		Assertions.assertTrue(_accountSyncModel.isSupported());

		Mockito.verify(
			_entitlementService, Mockito.never()
		).hasUnterminatedActiveUnassignedEntitlement(
			Mockito.anyLong(), Mockito.anyList()
		);
	}

	@Test
	public void testIsSupportedWhenAccountIsUnsupported() throws Exception {
		_whenPartner(false);

		Assertions.assertFalse(_accountSyncModel.isSupported());
	}

	@Test
	public void testIsSupportedWhenEntitlementFails() throws Exception {
		Mockito.when(
			_entitlementService.hasUnterminatedActiveEntitlement(
				Mockito.anyCollection(), Mockito.anyList(),
				Mockito.anyCollection())
		).thenThrow(
			new RuntimeException()
		);

		Assertions.assertNull(_accountSyncModel.isSupported());
		Assertions.assertNull(_accountSyncModel.isSupported());

		Mockito.verify(
			_entitlementService
		).hasUnterminatedActiveEntitlement(
			Mockito.anyCollection(), Mockito.anyList(), Mockito.anyCollection()
		);
	}

	private void _whenCommerceOrderFails() throws Exception {
		Mockito.when(
			_commerceOrderService.getAccountSupportInfo(
				Mockito.anyLong(), Mockito.any())
		).thenThrow(
			new RuntimeException()
		);
	}

	private void _whenPartner(boolean partner) throws Exception {
		Mockito.when(
			_entitlementService.hasUnterminatedActiveEntitlement(
				Collections.singletonList(1L),
				Collections.singletonList(EntitlementConstants.NAME_PARTNER),
				Collections.emptyList())
		).thenReturn(
			partner
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