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
import com.liferay.one.jira.constants.ContactConstants;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.EntitlementConverter;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.converter.PhoneConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Property;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringBundler;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class UserAccountSynchronizer {

	public void deleteUserAccount(String externalReferenceCode) {
		_keyedLock.withLock(
			externalReferenceCode,
			() -> {
				if (_log.isInfoEnabled()) {
					_log.info(
						"Deleting user account " + externalReferenceCode +
							" from JSM");
				}

				try {
					_accountUserAccountRoleSynchronizer.softDeleteByUserAccount(
						externalReferenceCode);
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to soft delete account contact role ",
							"assignments for user account ",
							externalReferenceCode),
						exception);
				}

				try {
					_organizationUserAccountRoleSynchronizer.
						softDeleteByUserAccount(externalReferenceCode);
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to soft delete team contact role ",
							"assignments for user account ",
							externalReferenceCode),
						exception);
				}

				_jiraAssetService.delete(
					_contactConverter, externalReferenceCode);
			});
	}

	public void syncUserAccount(UserAccount userAccount) throws Exception {
		_keyedLock.withLock(
			userAccount.getExternalReferenceCode(),
			() -> _syncUserAccount(_createUserAccountSyncModel(userAccount)));
	}

	public void syncUserAccountAccounts(UserAccount userAccount) {
		if (_log.isInfoEnabled()) {
			_log.info(
				"Syncing accounts for user account " +
					userAccount.getExternalReferenceCode() + " to JSM");
		}

		UserAccountSyncModel userAccountSyncModel = _createUserAccountSyncModel(
			userAccount);

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_ACCOUNT,
			_jiraAssetService.fetchReferenceObjectIds(
				_accountConverter, userAccountSyncModel.getAccountBriefs(),
				AccountBrief::getExternalReferenceCode));

		_keyedLock.withLock(
			userAccount.getExternalReferenceCode(),
			() -> _jiraAssetService.upsert(_contactConverter, jiraAssetObject));
	}

	public void syncUserAccountOrganizations(UserAccount userAccount) {
		if (_log.isInfoEnabled()) {
			_log.info(
				"Syncing organizations for user account " +
					userAccount.getExternalReferenceCode() + " to JSM");
		}

		UserAccountSyncModel userAccountSyncModel = _createUserAccountSyncModel(
			userAccount);

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_TEAMS,
			_jiraAssetService.fetchReferenceObjectIds(
				_teamConverter, userAccountSyncModel.getOrganizationBriefs(),
				OrganizationBrief::getExternalReferenceCode));

		_keyedLock.withLock(
			userAccount.getExternalReferenceCode(),
			() -> _jiraAssetService.upsert(_contactConverter, jiraAssetObject));
	}

	public void syncUserAccountRoles(UserAccount userAccount) {
		if (_log.isInfoEnabled()) {
			_log.info(
				"Syncing roles for user account " +
					userAccount.getExternalReferenceCode() + " to JSM");
		}

		UserAccountSyncModel userAccountSyncModel = _createUserAccountSyncModel(
			userAccount);

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_CONTACT_ROLES,
			_jiraAssetService.fetchReferenceObjectIds(
				_contactRoleConverter, userAccountSyncModel.getRoleBriefs(),
				RoleBrief::getExternalReferenceCode));

		_keyedLock.withLock(
			userAccount.getExternalReferenceCode(),
			() -> _jiraAssetService.upsert(_contactConverter, jiraAssetObject));
	}

	private UserAccountSyncModel _createUserAccountSyncModel(
		UserAccount userAccount) {

		return new UserAccountSyncModel(
			_entitlementService, _externalLinkConverter, _propertyService,
			userAccount);
	}

	private void _syncContactRoleAssignments(
		UserAccountSyncModel userAccountSyncModel) {

		for (AccountBrief accountBrief :
				userAccountSyncModel.getAccountBriefs()) {

			RoleBrief[] roleBriefs = accountBrief.getRoleBriefs();

			if (roleBriefs == null) {
				continue;
			}

			for (RoleBrief roleBrief : roleBriefs) {
				try {
					_accountUserAccountRoleSynchronizer.syncAssignRole(
						roleBrief.getExternalReferenceCode(),
						userAccountSyncModel.getExternalReferenceCode(),
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
		UserAccountSyncModel userAccountSyncModel) {

		for (OrganizationBrief organizationBrief :
				userAccountSyncModel.getOrganizationBriefs()) {

			RoleBrief[] roleBriefs = organizationBrief.getRoleBriefs();

			if (roleBriefs == null) {
				continue;
			}

			for (RoleBrief roleBrief : roleBriefs) {
				try {
					_organizationUserAccountRoleSynchronizer.syncAssignRole(
						roleBrief.getExternalReferenceCode(),
						userAccountSyncModel.getExternalReferenceCode(),
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

	private void _syncUserAccount(UserAccountSyncModel userAccountSyncModel)
		throws Exception {

		UserAccount userAccount = userAccountSyncModel.getUserAccount();

		if (_log.isInfoEnabled()) {
			_log.info(
				"Syncing user account " +
					userAccount.getExternalReferenceCode() + " to JSM");
		}

		JiraAssetObject jiraAssetObject = _contactConverter.toAssetObject(
			userAccount);

		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_ACCOUNT,
			_jiraAssetService.fetchReferenceObjectIds(
				_accountConverter, userAccountSyncModel.getAccountBriefs(),
				AccountBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_CONTACT_ROLES,
			_jiraAssetService.fetchReferenceObjectIds(
				_contactRoleConverter, userAccountSyncModel.getRoleBriefs(),
				RoleBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_ENTITLEMENTS,
			_jiraAssetService.getOrCreateReferenceObjectIds(
				_entitlementConverter,
				userAccountSyncModel.getEntitlementDefinitions(),
				EntitlementDefinition::getDisplayName,
				_entitlementConverter::toAssetObject));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_EXTERNAL_LINKS,
			_jiraAssetService.getOrCreateReferenceObjectIds(
				_externalLinkConverter,
				userAccountSyncModel.getExternalLinkProperties(),
				Property::getExternalReferenceCode,
				_externalLinkConverter::toAssetObject));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_TEAMS,
			_jiraAssetService.fetchReferenceObjectIds(
				_teamConverter, userAccountSyncModel.getOrganizationBriefs(),
				OrganizationBrief::getExternalReferenceCode));
		jiraAssetObject.setAttributeValue(
			ContactConstants.ATTRIBUTE_NAME_PHONES,
			_jiraAssetService.getOrCreateReferenceObjectIds(
				_phoneConverter, userAccountSyncModel.getTelephones(),
				Phone::getPhoneNumber, _phoneConverter::toAssetObject));

		_jiraAssetService.upsert(_contactConverter, jiraAssetObject);

		_syncContactRoleAssignments(userAccountSyncModel);
		_syncOrganizationRoleAssignments(userAccountSyncModel);
	}

	private static final Log _log = LogFactory.getLog(
		UserAccountSynchronizer.class);

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;

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
	private JiraAssetService _jiraAssetService;

	@Autowired
	private KeyedLock _keyedLock;

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