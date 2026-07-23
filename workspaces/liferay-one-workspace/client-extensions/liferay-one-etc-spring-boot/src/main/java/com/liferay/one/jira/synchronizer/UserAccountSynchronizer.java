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
import com.liferay.one.jira.constants.ContactConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.EntitlementConverter;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.converter.PhoneConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.AssetObjectUpsertService;
import com.liferay.one.jira.service.AssetReferenceObjectService;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Property;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.PropertyService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ListUtil;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class UserAccountSynchronizer {

	public void syncUserAccount(UserAccount userAccount) throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info(
				"Syncing user account " +
					userAccount.getExternalReferenceCode() + " to JSM");
		}

		List<AccountBrief> accountBriefs = ListUtil.fromArray(
			userAccount.getAccountBriefs());
		List<OrganizationBrief> organizationBriefs = ListUtil.fromArray(
			userAccount.getOrganizationBriefs());

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		List<RoleBrief> roleBriefs = new ArrayList<>(
			_getAccountRoleBriefs(accountBriefs));

		roleBriefs.addAll(_getOrganizationRoleBriefs(organizationBriefs));

		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_ACCOUNT,
			_assetReferenceObjectService.fetchReferenceObjectIds(
				_accountConverter, accountBriefs,
				AccountBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_CONTACT_ROLES,
			_assetReferenceObjectService.fetchReferenceObjectIds(
				_contactRoleConverter, roleBriefs,
				RoleBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_ENTITLEMENTS,
			_assetReferenceObjectService.getOrCreateReferenceObjectIds(
				_entitlementConverter,
				_getEntitlementDefinitions(accountBriefs),
				EntitlementDefinition::getDisplayName,
				_entitlementConverter::toAssetObject));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_EXTERNAL_LINKS,
			_assetReferenceObjectService.getOrCreateReferenceObjectIds(
				_externalLinkConverter, _getExternalLinkProperties(userAccount),
				Property::getExternalReferenceCode,
				_externalLinkConverter::toAssetObject));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_TEAMS,
			_assetReferenceObjectService.fetchReferenceObjectIds(
				_teamConverter, organizationBriefs,
				OrganizationBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_PHONES,
			_assetReferenceObjectService.getOrCreateReferenceObjectIds(
				_phoneConverter, _getTelephones(userAccount),
				Phone::getPhoneNumber, _phoneConverter::toAssetObject));

		_assetObjectUpsertService.upsert(_contactConverter, jiraAssetObject);

		_syncContactRoleAssignments(userAccount, accountBriefs);
		_syncOrganizationRoleAssignments(userAccount, organizationBriefs);
	}

	private List<RoleBrief> _getAccountRoleBriefs(
		List<AccountBrief> accountBriefs) {

		List<RoleBrief> roleBriefs = new ArrayList<>();

		for (AccountBrief accountBrief : accountBriefs) {
			RoleBrief[] accountRoleBriefs = accountBrief.getRoleBriefs();

			if (accountRoleBriefs != null) {
				Collections.addAll(roleBriefs, accountRoleBriefs);
			}
		}

		return roleBriefs;
	}

	private List<EntitlementDefinition> _getEntitlementDefinitions(
			List<AccountBrief> accountBriefs)
		throws Exception {

		List<EntitlementDefinition> entitlementDefinitions = new ArrayList<>();

		for (AccountBrief accountBrief : accountBriefs) {
			entitlementDefinitions.addAll(
				_entitlementService.getActiveEntitlementDefinitions(
					accountBrief.getId()));
		}

		return entitlementDefinitions;
	}

	private List<Property> _getExternalLinkProperties(UserAccount userAccount)
		throws Exception {

		List<Property> externalLinkProperties = new ArrayList<>();

		List<Property> properties = _propertyService.getUserAccountProperties(
			userAccount.getId());

		for (Property property : properties) {
			if (_externalLinkConverter.isExternalLinkProperty(property)) {
				externalLinkProperties.add(property);
			}
		}

		return externalLinkProperties;
	}

	private List<RoleBrief> _getOrganizationRoleBriefs(
		List<OrganizationBrief> organizationBriefs) {

		List<RoleBrief> roleBriefs = new ArrayList<>();

		for (OrganizationBrief organizationBrief : organizationBriefs) {
			RoleBrief[] organizationRoleBriefs =
				organizationBrief.getRoleBriefs();

			if (organizationRoleBriefs != null) {
				Collections.addAll(roleBriefs, organizationRoleBriefs);
			}
		}

		return roleBriefs;
	}

	private List<Phone> _getTelephones(UserAccount userAccount) {
		UserAccountContactInformation userAccountContactInformation =
			userAccount.getUserAccountContactInformation();

		if (userAccountContactInformation == null) {
			return Collections.emptyList();
		}

		return ListUtil.fromArray(
			userAccountContactInformation.getTelephones());
	}

	private void _syncContactRoleAssignments(
		UserAccount userAccount, List<AccountBrief> accountBriefs) {

		for (AccountBrief accountBrief : accountBriefs) {
			RoleBrief[] roleBriefs = accountBrief.getRoleBriefs();

			if (roleBriefs == null) {
				continue;
			}

			for (RoleBrief roleBrief : roleBriefs) {
				try {
					_accountUserAccountRoleSynchronizer.syncAssignRole(
						roleBrief.getExternalReferenceCode(),
						userAccount.getExternalReferenceCode(),
						accountBrief.getExternalReferenceCode());
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to sync account contact role assignment ",
							"for role ", roleBrief.getExternalReferenceCode()),
						exception);
				}
			}
		}
	}

	private void _syncOrganizationRoleAssignments(
		UserAccount userAccount, List<OrganizationBrief> organizationBriefs) {

		for (OrganizationBrief organizationBrief : organizationBriefs) {
			RoleBrief[] roleBriefs = organizationBrief.getRoleBriefs();

			if (roleBriefs == null) {
				continue;
			}

			for (RoleBrief roleBrief : roleBriefs) {
				try {
					_organizationUserAccountRoleSynchronizer.syncAssignRole(
						roleBrief.getExternalReferenceCode(),
						userAccount.getExternalReferenceCode(),
						organizationBrief.getExternalReferenceCode());
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to sync organization contact role ",
							"assignment for role ",
							roleBrief.getExternalReferenceCode()),
						exception);
				}
			}
		}
	}

	private static final Log _log = LogFactory.getLog(
		UserAccountSynchronizer.class);

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;

	@Autowired
	private AssetObjectUpsertService _assetObjectUpsertService;

	@Autowired
	private AssetReferenceObjectService _assetReferenceObjectService;

	@Autowired
	private ContactConverter _contactConverter;

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private EntitlementConverter _entitlementConverter;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ExternalLinkConverter _externalLinkConverter;

	@Autowired
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;

	@Autowired
	private PhoneConverter _phoneConverter;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private TeamConverter _teamConverter;

}