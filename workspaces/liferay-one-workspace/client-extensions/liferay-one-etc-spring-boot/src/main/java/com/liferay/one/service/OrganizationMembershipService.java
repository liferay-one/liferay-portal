/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.model.Property;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.util.FindUtil;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class OrganizationMembershipService {

	public void addOrganizationUserAccount(
			long organizationId, UserAccount userAccount)
		throws Exception {

		_organizationService.addOrganizationUserAccountByEmailAddress(
			userAccount.getEmailAddress(), organizationId);

		_syncToJSM(
			_organizationService.getOrganization(organizationId), userAccount);
	}

	public void removeOrganizationUserAccount(
			long organizationId, UserAccount userAccount)
		throws Exception {

		Organization organization = _organizationService.getOrganization(
			organizationId);

		unassignContactRoles(organization, userAccount);

		_organizationService.removeOrganizationUserAccountByEmailAddress(
			userAccount.getEmailAddress(), organizationId);

		_syncToJSM(organization, userAccount);
	}

	public void syncOktaGroupOrganizations(UserAccount userAccount)
		throws Exception {

		Set<String> groupIds = new HashSet<>(
			_oktaService.getContactGroupIds(userAccount.getEmailAddress()));

		Set<Long> userOrganizationIds = new HashSet<>();
		Set<Long> linkedOrganizationIds = new HashSet<>();

		for (Property property :
				_propertyService.getProperties(
					com.liferay.portal.kernel.model.Organization.class.
						getName(),
					PropertyConstants.NAME_OKTA_GROUP)) {

			linkedOrganizationIds.add(property.getClassPK());

			if (groupIds.contains(property.getValue())) {
				userOrganizationIds.add(property.getClassPK());
			}
		}

		Set<Long> curUserOrganizationIds = new HashSet<>();

		OrganizationBrief[] organizationBriefs =
			userAccount.getOrganizationBriefs();

		if (organizationBriefs != null) {
			for (OrganizationBrief organizationBrief : organizationBriefs) {
				curUserOrganizationIds.add(organizationBrief.getId());
			}
		}

		for (long organizationId : userOrganizationIds) {
			if (!curUserOrganizationIds.contains(organizationId)) {
				addOrganizationUserAccount(organizationId, userAccount);
			}
		}

		for (long organizationId : curUserOrganizationIds) {
			if (linkedOrganizationIds.contains(organizationId) &&
				!userOrganizationIds.contains(organizationId)) {

				removeOrganizationUserAccount(organizationId, userAccount);
			}
		}
	}

	public void unassignContactRoles(
		Organization organization, UserAccount userAccount) {

		OrganizationBrief organizationBrief = FindUtil.findFirst(
			userAccount.getOrganizationBriefs(),
			organizationBrief1 -> Objects.equals(
				organization.getExternalReferenceCode(),
				organizationBrief1.getExternalReferenceCode()));

		if (organizationBrief == null) {
			return;
		}

		RoleBrief[] roleBriefs = organizationBrief.getRoleBriefs();

		if (roleBriefs == null) {
			return;
		}

		for (RoleBrief roleBrief : roleBriefs) {
			try {
				_organizationUserAccountRoleSynchronizer.syncUnassignRole(
					roleBrief.getExternalReferenceCode(),
					userAccount.getExternalReferenceCode(),
					organization.getExternalReferenceCode());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to sync organization contact role unassignment " +
						"for role " + roleBrief.getExternalReferenceCode(),
					exception);
			}
		}
	}

	private void _syncToJSM(
		Organization organization, UserAccount userAccount) {

		try {
			UserAccount updatedUserAccount = _userAccountService.getUserAccount(
				userAccount.getId());

			_userAccountSynchronizer.syncUserAccountOrganizations(
				updatedUserAccount);
			_userAccountSynchronizer.syncUserAccountRoles(updatedUserAccount);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync user account " + userAccount.getEmailAddress() +
					" to JSM",
				exception);
		}

		try {
			_organizationSynchronizer.syncOrganizationUserAccounts(
				organization);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync user accounts for organization " +
					organization.getExternalReferenceCode(),
				exception);
		}
	}

	private static final Log _log = LogFactory.getLog(
		OrganizationMembershipService.class);

	@Autowired
	private OktaService _oktaService;

	@Autowired
	private OrganizationService _organizationService;

	@Autowired
	private OrganizationSynchronizer _organizationSynchronizer;

	@Autowired
	private OrganizationUserAccountRoleSynchronizer
		_organizationUserAccountRoleSynchronizer;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}