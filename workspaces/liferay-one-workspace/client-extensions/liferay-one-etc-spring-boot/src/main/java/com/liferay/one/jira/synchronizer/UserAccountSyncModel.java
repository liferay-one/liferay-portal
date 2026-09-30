/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Phone;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccountContactInformation;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.model.Property;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.util.MemoizedValue;
import com.liferay.portal.kernel.util.ListUtil;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Drew Brokke
 */
public class UserAccountSyncModel {

	public UserAccountSyncModel(
		EntitlementService entitlementService,
		ExternalLinkConverter externalLinkConverter,
		ProjectMembershipService projectMembershipService,
		PropertyService propertyService, UserAccount userAccount) {

		_entitlementService = entitlementService;
		_externalLinkConverter = externalLinkConverter;
		_projectMembershipService = projectMembershipService;
		_propertyService = propertyService;
		_userAccount = userAccount;

		_accountBriefs = ListUtil.fromArray(userAccount.getAccountBriefs());

		String externalReferenceCode = getExternalReferenceCode();

		_accountExternalReferenceCodes = new MemoizedValue<>(
			"accounts for user account " + externalReferenceCode, _log,
			this::_toAccountExternalReferenceCodes);
		_entitlementDefinitions = new MemoizedValue<>(
			"entitlements for user account " + externalReferenceCode, _log,
			this::_toEntitlementDefinitions);
		_externalLinkProperties = new MemoizedValue<>(
			"external links for user account " + externalReferenceCode, _log,
			this::_toExternalLinkProperties);

		_organizationBriefs = ListUtil.fromArray(
			userAccount.getOrganizationBriefs());
		_roleBriefs = _toRoleBriefs();
		_telephones = _toTelephones();
	}

	public List<AccountBrief> getAccountBriefs() {
		return _accountBriefs;
	}

	public List<String> getAccountExternalReferenceCodes() {
		return _accountExternalReferenceCodes.get();
	}

	public List<EntitlementDefinition> getEntitlementDefinitions() {
		return _entitlementDefinitions.get();
	}

	public List<Property> getExternalLinkProperties() {
		return _externalLinkProperties.get();
	}

	public String getExternalReferenceCode() {
		return _userAccount.getExternalReferenceCode();
	}

	public List<OrganizationBrief> getOrganizationBriefs() {
		return _organizationBriefs;
	}

	public List<RoleBrief> getRoleBriefs() {
		return _roleBriefs;
	}

	public List<Phone> getTelephones() {
		return _telephones;
	}

	public UserAccount getUserAccount() {
		return _userAccount;
	}

	private List<String> _toAccountExternalReferenceCodes() throws Exception {
		List<String> accountExternalReferenceCodes = new ArrayList<>();

		for (AccountBrief accountBrief : _accountBriefs) {
			accountExternalReferenceCodes.add(
				accountBrief.getExternalReferenceCode());
		}

		List<ProjectMembership> projectMemberships =
			_projectMembershipService.getProjectMembershipsByUserId(
				_userAccount.getId());

		for (ProjectMembership projectMembership : projectMemberships) {
			accountExternalReferenceCodes.add(
				projectMembership.getProjectExternalReferenceCode());
		}

		return accountExternalReferenceCodes;
	}

	private List<EntitlementDefinition> _toEntitlementDefinitions()
		throws Exception {

		List<EntitlementDefinition> entitlementDefinitions = new ArrayList<>();

		for (AccountBrief accountBrief : _accountBriefs) {
			entitlementDefinitions.addAll(
				_entitlementService.getActiveEntitlementDefinitions(
					accountBrief.getId()));
		}

		return entitlementDefinitions;
	}

	private List<Property> _toExternalLinkProperties() throws Exception {
		List<Property> externalLinkProperties = new ArrayList<>();

		List<Property> properties = _propertyService.getUserAccountProperties(
			_userAccount.getId());

		for (Property property : properties) {
			if (_externalLinkConverter.isExternalLinkProperty(property)) {
				externalLinkProperties.add(property);
			}
		}

		return externalLinkProperties;
	}

	private List<RoleBrief> _toRoleBriefs() {
		List<RoleBrief> roleBriefs = new ArrayList<>();

		for (AccountBrief accountBrief : _accountBriefs) {
			RoleBrief[] accountRoleBriefs = accountBrief.getRoleBriefs();

			if (accountRoleBriefs != null) {
				Collections.addAll(roleBriefs, accountRoleBriefs);
			}
		}

		for (OrganizationBrief organizationBrief : _organizationBriefs) {
			RoleBrief[] organizationRoleBriefs =
				organizationBrief.getRoleBriefs();

			if (organizationRoleBriefs != null) {
				Collections.addAll(roleBriefs, organizationRoleBriefs);
			}
		}

		return roleBriefs;
	}

	private List<Phone> _toTelephones() {
		UserAccountContactInformation userAccountContactInformation =
			_userAccount.getUserAccountContactInformation();

		if (userAccountContactInformation == null) {
			return Collections.emptyList();
		}

		return ListUtil.fromArray(
			userAccountContactInformation.getTelephones());
	}

	private static final Log _log = LogFactory.getLog(
		UserAccountSyncModel.class);

	private final List<AccountBrief> _accountBriefs;
	private final MemoizedValue<List<String>> _accountExternalReferenceCodes;
	private final MemoizedValue<List<EntitlementDefinition>>
		_entitlementDefinitions;
	private final EntitlementService _entitlementService;
	private final ExternalLinkConverter _externalLinkConverter;
	private final MemoizedValue<List<Property>> _externalLinkProperties;
	private final List<OrganizationBrief> _organizationBriefs;
	private final ProjectMembershipService _projectMembershipService;
	private final PropertyService _propertyService;
	private final List<RoleBrief> _roleBriefs;
	private final List<Phone> _telephones;
	private final UserAccount _userAccount;

}