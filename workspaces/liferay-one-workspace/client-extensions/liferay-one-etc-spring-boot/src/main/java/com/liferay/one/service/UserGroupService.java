/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.dto.v1_0.UserGroupBrief;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.UserAccountResource;
import com.liferay.headless.admin.user.client.resource.v1_0.UserGroupResource;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class UserGroupService extends OneBaseService {

	@Scheduled(cron = "${liferay.one.user.group.reconcile.cron}")
	public void reconcileUserGroups() {
		if (!_reconciling.compareAndSet(false, true)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping user group reconcile because another reconcile " +
						"is in progress");
			}

			return;
		}

		try {
			long startTime = System.currentTimeMillis();

			_syncedUserIds.clear();

			Set<Long> customerAccountIds = new LinkedHashSet<>();
			Set<String> customerProjectExternalReferenceCodes =
				new LinkedHashSet<>();
			Set<Long> partnerAccountIds = new LinkedHashSet<>();

			for (Entitlement entitlement :
					_entitlementService.getActiveEntitlementsByNames(
						_entitlementNames)) {

				if (EntitlementConstants.namesSLAs.contains(
						entitlement.getName())) {

					if (entitlement.getAccountEntryId() > 0) {
						customerAccountIds.add(entitlement.getAccountEntryId());
					}

					if (Validator.isNotNull(
							entitlement.getProjectExternalReferenceCode())) {

						customerProjectExternalReferenceCodes.add(
							entitlement.getProjectExternalReferenceCode());
					}
				}
				else if (Objects.equals(
							entitlement.getName(),
							EntitlementConstants.NAME_PARTNER) &&
						 (entitlement.getAccountEntryId() > 0)) {

					partnerAccountIds.add(entitlement.getAccountEntryId());
				}
			}

			Set<Long> accountEntryIds = new LinkedHashSet<>(customerAccountIds);

			accountEntryIds.addAll(partnerAccountIds);

			Set<Long> customerUserIds = new HashSet<>();
			Set<Long> partnerUserIds = new HashSet<>();

			for (long accountEntryId : accountEntryIds) {
				for (UserAccount userAccount :
						_userAccountService.getAccountUserAccounts(
							accountEntryId)) {

					if (customerAccountIds.contains(accountEntryId) &&
						UserAccountUtil.hasAccountRole(
							userAccount, accountEntryId,
							RoleConstants.namesCustomerAccountRoles)) {

						customerUserIds.add(userAccount.getId());
					}

					if (partnerAccountIds.contains(accountEntryId) &&
						UserAccountUtil.hasAccountRole(
							userAccount, accountEntryId,
							RoleConstants.namesPartnerAccountRoles)) {

						partnerUserIds.add(userAccount.getId());
					}
				}
			}

			for (ProjectMembership projectMembership :
					_projectMembershipService.getProjectMemberships(
						customerProjectExternalReferenceCodes)) {

				customerUserIds.add(projectMembership.getUserId());
			}

			Set<Long> currentCustomerUserIds = _getUserGroupUserIds(
				_EXTERNAL_REFERENCE_CODE_SUPPORT_CUSTOMERS);
			Set<Long> currentPartnerUserIds = _getUserGroupUserIds(
				_EXTERNAL_REFERENCE_CODE_PARTNERS);

			UserGroupResource userGroupResource = _buildUserGroupResource();

			_reconcileUserGroup(
				currentCustomerUserIds,
				_EXTERNAL_REFERENCE_CODE_SUPPORT_CUSTOMERS, customerUserIds,
				userGroupResource);
			_reconcileUserGroup(
				currentPartnerUserIds, _EXTERNAL_REFERENCE_CODE_PARTNERS,
				partnerUserIds, userGroupResource);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Reconciled user groups in ",
						System.currentTimeMillis() - startTime, " ms"));
			}
		}
		catch (Exception exception) {
			_log.error("Unable to reconcile user groups", exception);
		}
		finally {
			_reconciling.set(false);
		}
	}

	public void syncUserAccountUserGroups(long userId) throws Exception {
		_syncedUserIds.add(userId);

		UserAccount userAccount = _userAccountService.getUserAccount(userId);

		Set<Long> customerAccountIds = new HashSet<>();
		Set<Long> partnerAccountIds = new HashSet<>();

		AccountBrief[] accountBriefs = userAccount.getAccountBriefs();

		if (accountBriefs != null) {
			for (AccountBrief accountBrief : accountBriefs) {
				long accountId = accountBrief.getId();

				if (UserAccountUtil.hasAccountRole(
						userAccount, accountId,
						RoleConstants.namesCustomerAccountRoles)) {

					customerAccountIds.add(accountId);
				}

				if (UserAccountUtil.hasAccountRole(
						userAccount, accountId,
						RoleConstants.namesPartnerAccountRoles)) {

					partnerAccountIds.add(accountId);
				}
			}
		}

		Set<String> projectExternalReferenceCodes = new HashSet<>();

		for (ProjectMembership projectMembership :
				_projectMembershipService.getProjectMembershipsByUserId(
					userId)) {

			projectExternalReferenceCodes.add(
				projectMembership.getProjectExternalReferenceCode());
		}

		Set<Long> accountEntryIds = new HashSet<>(customerAccountIds);

		accountEntryIds.addAll(partnerAccountIds);

		boolean customer = false;
		boolean partner = false;

		for (Entitlement entitlement :
				_entitlementService.getActiveEntitlements(
					accountEntryIds, _entitlementNames,
					projectExternalReferenceCodes)) {

			if (EntitlementConstants.namesSLAs.contains(
					entitlement.getName())) {

				if (customerAccountIds.contains(
						entitlement.getAccountEntryId()) ||
					projectExternalReferenceCodes.contains(
						entitlement.getProjectExternalReferenceCode())) {

					customer = true;
				}
			}
			else if (Objects.equals(
						entitlement.getName(),
						EntitlementConstants.NAME_PARTNER) &&
					 partnerAccountIds.contains(
						 entitlement.getAccountEntryId())) {

				partner = true;
			}
		}

		Set<String> userGroupExternalReferenceCodes = new HashSet<>();

		UserGroupBrief[] userGroupBriefs = userAccount.getUserGroupBriefs();

		if (userGroupBriefs != null) {
			for (UserGroupBrief userGroupBrief : userGroupBriefs) {
				userGroupExternalReferenceCodes.add(
					userGroupBrief.getExternalReferenceCode());
			}
		}

		UserGroupResource userGroupResource = _buildUserGroupResource();

		_updateUserGroupUserAccount(
			_EXTERNAL_REFERENCE_CODE_PARTNERS, partner,
			userGroupExternalReferenceCodes, userGroupResource, userId);
		_updateUserGroupUserAccount(
			_EXTERNAL_REFERENCE_CODE_SUPPORT_CUSTOMERS, customer,
			userGroupExternalReferenceCodes, userGroupResource, userId);
	}

	@Scheduled(cron = "${liferay.one.user.group.sync.cron}")
	public void syncUserGroups() {
		if (!_syncing.compareAndSet(false, true)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping user group sync because another sync is in " +
						"progress");
			}

			return;
		}

		try {
			Instant endInstant = Instant.now(
			).truncatedTo(
				ChronoUnit.MILLIS
			);

			Instant startInstant = endInstant.minus(
				_LOOK_BACK_MINUTES, ChronoUnit.MINUTES);

			for (long userId :
					_getChangedEntitlementUserIds(endInstant, startInstant)) {

				try {
					syncUserAccountUserGroups(userId);
				}
				catch (Exception exception) {
					_log.error(
						"Unable to sync user groups for user " + userId,
						exception);
				}
			}
		}
		catch (Exception exception) {
			_log.error("Unable to sync user groups", exception);
		}
		finally {
			_syncing.set(false);
		}
	}

	private void _addUserGroupUserAccounts(
		String externalReferenceCode, UserGroupResource userGroupResource,
		Set<Long> userIds) {

		List<Long> userIdsList = new ArrayList<>(userIds);

		int count = 0;

		for (int i = 0; i < userIdsList.size(); i += _WRITE_BATCH_SIZE) {
			List<Long> batchUserIds = userIdsList.subList(
				i, Math.min(i + _WRITE_BATCH_SIZE, userIdsList.size()));

			try {
				userGroupResource.postUserGroupByExternalReferenceCodeUsers(
					externalReferenceCode, batchUserIds.toArray(new Long[0]));

				count += batchUserIds.size();
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to add ", batchUserIds.size(),
						" users to user group ", externalReferenceCode),
					exception);
			}
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Added ", count, " users to user group ",
					externalReferenceCode));
		}
	}

	private UserAccountResource _buildUserAccountResource() {
		return UserAccountResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameters(
			"fields", "alternateName,id"
		).build();
	}

	private UserGroupResource _buildUserGroupResource() {
		return UserGroupResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();
	}

	private Set<Long> _getChangedEntitlementUserIds(
			Instant endInstant, Instant startInstant)
		throws Exception {

		Set<Long> accountEntryIds = new LinkedHashSet<>();
		Set<String> projectExternalReferenceCodes = new LinkedHashSet<>();

		for (Entitlement entitlement :
				_entitlementService.getChangedEntitlements(
					endInstant, _entitlementNames, startInstant)) {

			if (entitlement.getAccountEntryId() > 0) {
				accountEntryIds.add(entitlement.getAccountEntryId());
			}

			if (Validator.isNotNull(
					entitlement.getProjectExternalReferenceCode())) {

				projectExternalReferenceCodes.add(
					entitlement.getProjectExternalReferenceCode());
			}
		}

		Set<Long> userIds = new LinkedHashSet<>();

		for (long accountEntryId : accountEntryIds) {
			for (UserAccount userAccount :
					_userAccountService.getAccountUserAccounts(
						accountEntryId)) {

				userIds.add(userAccount.getId());
			}
		}

		for (ProjectMembership projectMembership :
				_projectMembershipService.getProjectMemberships(
					projectExternalReferenceCodes)) {

			userIds.add(projectMembership.getUserId());
		}

		return userIds;
	}

	private Set<Long> _getUserGroupUserIds(String externalReferenceCode)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		Set<Long> userIds = new HashSet<>();

		String filterString = null;

		while (true) {
			Page<UserAccount> page =
				userAccountResource.
					getUserGroupByExternalReferenceCodeUsersPage(
						externalReferenceCode, null, filterString,
						Pagination.of(1, _PAGE_SIZE), "alternateName:asc");

			Collection<UserAccount> userAccounts = page.getItems();

			String lastAlternateName = null;

			for (UserAccount userAccount : userAccounts) {
				userIds.add(userAccount.getId());

				lastAlternateName = userAccount.getAlternateName();
			}

			if (userAccounts.size() < _PAGE_SIZE) {
				return userIds;
			}

			filterString = StringBundler.concat(
				"alternateName gt '", escapeODataString(lastAlternateName),
				"'");
		}
	}

	private void _reconcileUserGroup(
		Set<Long> currentUserIds, String externalReferenceCode,
		Set<Long> targetUserIds, UserGroupResource userGroupResource) {

		Set<Long> addUserIds = new HashSet<>(targetUserIds);

		addUserIds.removeAll(currentUserIds);
		addUserIds.removeAll(_syncedUserIds);

		Set<Long> removeUserIds = new HashSet<>(currentUserIds);

		removeUserIds.removeAll(targetUserIds);
		removeUserIds.removeAll(_syncedUserIds);

		_addUserGroupUserAccounts(
			externalReferenceCode, userGroupResource, addUserIds);
		_removeUserGroupUserAccounts(
			externalReferenceCode, userGroupResource, removeUserIds);
	}

	private void _removeUserGroupUserAccounts(
		String externalReferenceCode, UserGroupResource userGroupResource,
		Set<Long> userIds) {

		List<Long> userIdsList = new ArrayList<>(userIds);

		int count = 0;

		for (int i = 0; i < userIdsList.size(); i += _WRITE_BATCH_SIZE) {
			List<Long> batchUserIds = userIdsList.subList(
				i, Math.min(i + _WRITE_BATCH_SIZE, userIdsList.size()));

			try {
				userGroupResource.deleteUserGroupByExternalReferenceCodeUsers(
					externalReferenceCode, batchUserIds.toArray(new Long[0]));

				count += batchUserIds.size();
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to remove ", batchUserIds.size(),
						" users from user group ", externalReferenceCode),
					exception);
			}
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Removed ", count, " users from user group ",
					externalReferenceCode));
		}
	}

	private void _updateUserGroupUserAccount(
			String externalReferenceCode, boolean member,
			Set<String> userGroupExternalReferenceCodes,
			UserGroupResource userGroupResource, long userId)
		throws Exception {

		boolean present = userGroupExternalReferenceCodes.contains(
			externalReferenceCode);

		if (member && !present) {
			userGroupResource.postUserGroupByExternalReferenceCodeUsers(
				externalReferenceCode, new Long[] {userId});

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Added user ", userId, " to user group ",
						externalReferenceCode));
			}
		}
		else if (!member && present) {
			userGroupResource.deleteUserGroupByExternalReferenceCodeUsers(
				externalReferenceCode, new Long[] {userId});

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Removed user ", userId, " from user group ",
						externalReferenceCode));
			}
		}
	}

	private static final String _EXTERNAL_REFERENCE_CODE_PARTNERS =
		"C_PARTNERS";

	private static final String _EXTERNAL_REFERENCE_CODE_SUPPORT_CUSTOMERS =
		"C_SUPPORT_CUSTOMERS";

	private static final long _LOOK_BACK_MINUTES = 15;

	private static final int _PAGE_SIZE = 500;

	private static final int _WRITE_BATCH_SIZE = 100;

	private static final Log _log = LogFactory.getLog(UserGroupService.class);

	private static final List<String> _entitlementNames;

	static {
		List<String> entitlementNames = new ArrayList<>(
			EntitlementConstants.namesSLAs);

		entitlementNames.add(EntitlementConstants.NAME_PARTNER);

		_entitlementNames = Collections.unmodifiableList(entitlementNames);
	}

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	private final AtomicBoolean _reconciling = new AtomicBoolean();
	private final Set<Long> _syncedUserIds = ConcurrentHashMap.newKeySet();
	private final AtomicBoolean _syncing = new AtomicBoolean();

	@Autowired
	private UserAccountService _userAccountService;

}