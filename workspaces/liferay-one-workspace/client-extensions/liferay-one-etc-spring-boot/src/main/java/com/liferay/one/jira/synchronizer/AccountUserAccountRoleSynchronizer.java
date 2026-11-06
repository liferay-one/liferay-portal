/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.jira.constants.AccountContactRoleAssignmentConstants;
import com.liferay.one.jira.constants.ContactRoleConstants;
import com.liferay.one.jira.converter.AccountContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.FindUtil;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.LinkedHashMapBuilder;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiPredicate;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AccountUserAccountRoleSynchronizer {

	public void softDeleteByAccount(String accountExternalKey) {
		_jiraAssetService.softDeleteByAttribute(
			_accountContactRoleAssignmentConverter,
			AccountContactRoleAssignmentConstants.
				ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY,
			accountExternalKey);
	}

	public void softDeleteByUserAccount(String userAccountExternalKey) {
		_jiraAssetService.softDeleteByAttribute(
			_accountContactRoleAssignmentConverter,
			AccountContactRoleAssignmentConstants.
				ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY,
			userAccountExternalKey);
	}

	public void syncAssignRole(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey)
		throws Exception {

		syncAssignRole(
			roleExternalKey, userAccountExternalKey, accountExternalKey, null);
	}

	public void syncAssignRole(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey, Date startDate)
		throws Exception {

		BiPredicate<JiraAssetObject, JiraAssetObject> biPredicate = null;

		if (startDate != null) {
			biPredicate = (existingJiraAssetObject, newJiraAssetObject) ->
				_jiraAssetService.isUpdatedSince(
					_accountContactRoleAssignmentConverter, startDate,
					existingJiraAssetObject);
		}

		_syncAssignment(
			_getContactRoleExternalKey(roleExternalKey), userAccountExternalKey,
			accountExternalKey, false, biPredicate);
	}

	public void syncRoles(
		String accountExternalKey,
		Map<String, Set<String>> roleExternalKeysByUserAccountExternalKey,
		Date startDate) {

		for (Map.Entry<String, Set<String>> entry :
				roleExternalKeysByUserAccountExternalKey.entrySet()) {

			for (String roleExternalKey : entry.getValue()) {
				try {
					syncAssignRole(
						roleExternalKey, entry.getKey(), accountExternalKey,
						startDate);
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to assign role ",
							_getRoleDescription(
								_getContactRoleExternalKey(roleExternalKey)),
							" for user account ", entry.getKey(),
							" on account ", accountExternalKey),
						exception);
				}
			}
		}

		try {
			syncUnassignStaleRoles(
				accountExternalKey, roleExternalKeysByUserAccountExternalKey,
				startDate);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to unassign stale roles on account " +
					accountExternalKey,
				exception);
		}
	}

	public void syncUnassignRole(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey)
		throws Exception {

		_syncAssignment(
			_getContactRoleExternalKey(roleExternalKey), userAccountExternalKey,
			accountExternalKey, true, null);
	}

	public void syncUnassignStaleRoles(
		String accountExternalKey,
		Map<String, Set<String>> roleExternalKeysByUserAccountExternalKey,
		Date startDate) {

		Set<String> names = new LinkedHashSet<>();

		for (Map.Entry<String, Set<String>> entry :
				roleExternalKeysByUserAccountExternalKey.entrySet()) {

			for (String roleExternalKey : entry.getValue()) {
				names.add(
					_accountContactRoleAssignmentConverter.getName(
						accountExternalKey, entry.getKey(),
						_getContactRoleExternalKey(roleExternalKey)));
			}
		}

		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.getJiraAssetObjects(
				_accountContactRoleAssignmentConverter,
				aqlBuilder -> aqlBuilder.andEquals(
					accountExternalKey,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY
				).andEquals(
					false,
					AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_DELETED
				));

		for (JiraAssetObject jiraAssetObject : jiraAssetObjects) {
			String name = jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_NAME);

			if (FindUtil.containsIgnoreCase(names, name)) {
				continue;
			}

			String contactRoleExternalKey = jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_ROLE_EXTERNAL_KEY);
			String userAccountExternalKey = jiraAssetObject.getAttributeValue(
				AccountContactRoleAssignmentConstants.
					ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY);

			try {
				if (_isRoleAssigned(
						_getRoleExternalKey(contactRoleExternalKey),
						userAccountExternalKey, accountExternalKey)) {

					if (_log.isWarnEnabled()) {
						_log.warn(
							StringBundler.concat(
								"Skipping stale role ",
								_getRoleDescription(contactRoleExternalKey),
								" for user account ", userAccountExternalKey,
								" on account ", accountExternalKey,
								" because it is still assigned"));
					}

					continue;
				}

				_syncAssignment(
					contactRoleExternalKey, userAccountExternalKey,
					accountExternalKey, true,
					(existingJiraAssetObject, newJiraAssetObject) ->
						_jiraAssetService.isUpdatedSince(
							_accountContactRoleAssignmentConverter, startDate,
							existingJiraAssetObject));
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to unassign stale role ",
						_getRoleDescription(contactRoleExternalKey),
						" for user account ", userAccountExternalKey,
						" on account ", accountExternalKey),
					exception);
			}
		}
	}

	private String _getContactRoleExternalKey(String roleExternalKey) {
		for (Map.Entry<String, String> entry :
				_contactRoleExternalKeysByRoleExternalKey.entrySet()) {

			if (StringUtil.equalsIgnoreCase(entry.getKey(), roleExternalKey)) {
				return entry.getValue();
			}
		}

		return roleExternalKey;
	}

	private String _getRoleDescription(String contactRoleExternalKey) {
		String roleExternalKey = _getRoleExternalKey(contactRoleExternalKey);

		if (StringUtil.equalsIgnoreCase(
				roleExternalKey, contactRoleExternalKey)) {

			return contactRoleExternalKey;
		}

		return StringBundler.concat(
			roleExternalKey, " as contact role ", contactRoleExternalKey);
	}

	private String _getRoleExternalKey(String contactRoleExternalKey) {
		for (Map.Entry<String, String> entry :
				_contactRoleExternalKeysByRoleExternalKey.entrySet()) {

			if (StringUtil.equalsIgnoreCase(
					entry.getValue(), contactRoleExternalKey)) {

				return entry.getKey();
			}
		}

		return contactRoleExternalKey;
	}

	private boolean _isRoleAssigned(
			String roleExternalKey, String userAccountExternalKey,
			String accountExternalKey)
		throws Exception {

		UserAccount userAccount =
			_userAccountService.fetchUserAccountByExternalReferenceCode(
				userAccountExternalKey);

		if (userAccount == null) {
			return false;
		}

		AccountBrief accountBrief = FindUtil.findFirst(
			userAccount.getAccountBriefs(),
			accountBrief1 -> StringUtil.equalsIgnoreCase(
				accountExternalKey, accountBrief1.getExternalReferenceCode()));

		if (accountBrief != null) {
			RoleBrief roleBrief = FindUtil.findFirst(
				accountBrief.getRoleBriefs(),
				roleBrief1 -> StringUtil.equalsIgnoreCase(
					roleExternalKey, roleBrief1.getExternalReferenceCode()));

			if (roleBrief != null) {
				return true;
			}
		}

		ProjectMembership projectMembership =
			_projectMembershipService.fetchProjectMembership(
				accountExternalKey, roleExternalKey, userAccount.getId());

		if (projectMembership != null) {
			return true;
		}

		return false;
	}

	private void _syncAssignment(
			String contactRoleExternalKey, String userAccountExternalKey,
			String accountExternalKey, boolean deleted,
			BiPredicate<JiraAssetObject, JiraAssetObject>
				shouldSkipUpdateBiPredicate)
		throws Exception {

		_keyedLock.withLock(
			userAccountExternalKey,
			() -> _syncAssignmentWithinLock(
				contactRoleExternalKey, userAccountExternalKey,
				accountExternalKey, deleted, shouldSkipUpdateBiPredicate));
	}

	private void _syncAssignmentWithinLock(
		String contactRoleExternalKey, String userAccountExternalKey,
		String accountExternalKey, boolean deleted,
		BiPredicate<JiraAssetObject, JiraAssetObject>
			shouldSkipUpdateBiPredicate) {

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					deleted ? "Unassigning" : "Assigning", " role ",
					_getRoleDescription(contactRoleExternalKey),
					" for user account ", userAccountExternalKey,
					" on account ", accountExternalKey));
		}

		JiraAssetObject jiraAssetObject =
			_accountContactRoleAssignmentConverter.toAssetObject(
				contactRoleExternalKey, userAccountExternalKey,
				accountExternalKey, deleted, new Date());

		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_CONTACT_ROLE,
			_jiraAssetService.getReferenceObjectId(
				_contactRoleConverter, contactRoleExternalKey));
		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_CONTACT,
			_jiraAssetService.getReferenceObjectId(
				_contactConverter, userAccountExternalKey));
		jiraAssetObject.setAttributeValue(
			AccountContactRoleAssignmentConstants.ATTRIBUTE_NAME_ACCOUNT,
			_jiraAssetService.getReferenceObjectId(
				_accountConverter, accountExternalKey));

		_jiraAssetService.upsert(
			_accountContactRoleAssignmentConverter, jiraAssetObject,
			shouldSkipUpdateBiPredicate);
	}

	private static final Map<String, String>
		_contactRoleExternalKeysByRoleExternalKey = Collections.unmodifiableMap(
			LinkedHashMapBuilder.put(
				RoleConstants.ERC_PROJECT_ADMIN,
				ContactRoleConstants.EXTERNAL_KEY_SUPPORT_ADMINISTRATOR
			).put(
				RoleConstants.ERC_PROJECT_REQUESTER,
				ContactRoleConstants.EXTERNAL_KEY_SUPPORT_REQUESTER
			).put(
				RoleConstants.ERC_PROJECT_USER,
				ContactRoleConstants.EXTERNAL_KEY_SUPPORT_USER
			).build());
	private static final Log _log = LogFactory.getLog(
		AccountUserAccountRoleSynchronizer.class);

	@Autowired
	private AccountContactRoleAssignmentConverter
		_accountContactRoleAssignmentConverter;

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private ContactConverter _contactConverter;

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private UserAccountService _userAccountService;

}