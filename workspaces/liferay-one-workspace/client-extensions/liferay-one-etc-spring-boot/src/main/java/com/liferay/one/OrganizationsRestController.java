/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.jira.synchronizer.AccountOrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.OrganizationUserAccountSynchronizer;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.HashSet;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Ricardo Mariz
 */
@RequestMapping("/organizations")
@RestController
public class OrganizationsRestController extends OneBaseRestController {

	@DeleteMapping("/{organizationId}/accounts/{accountId}")
	public void deleteAccount(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId,
			@PathVariable("accountId") long accountId)
		throws Exception {

		_adminPermission.check(jwt);

		_accountService.removeOrganizationAccount(accountId, organizationId);

		_unassignAccount(accountId, organizationId);
	}

	@DeleteMapping(
		"/{organizationId}/user-accounts/{userId}/organization-roles" +
			"/{organizationRoleId}"
	)
	public void deleteUserAccountsOrganizationRole(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId,
			@PathVariable("userId") long userId,
			@PathVariable("organizationRoleId") long organizationRoleId)
		throws Exception {

		_adminPermission.check(jwt);

		_roleService.removeOrganizationUserAccountRole(
			organizationId, organizationRoleId, userId);

		_unassignContactRole(organizationId, organizationRoleId, userId);

		_syncMembership(organizationId, userId);
	}

	@PostMapping("/{organizationId}/accounts/{accountId}")
	public void postAccount(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId,
			@PathVariable("accountId") long accountId)
		throws Exception {

		_adminPermission.check(jwt);

		_accountService.addOrganizationAccount(accountId, organizationId);

		_assignAccount(accountId, organizationId);
	}

	@PostMapping("/{organizationId}/sync-from-okta")
	public void postSyncFromOkta(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId)
		throws Exception {

		_adminPermission.check(jwt);

		String oktaGroupId = _propertyService.getPropertyValue(
			com.liferay.portal.kernel.model.Organization.class.getName(),
			organizationId, PropertyConstants.NAME_OKTA_GROUP);

		if (Validator.isNull(oktaGroupId)) {
			throw new ResponseStatusException(
				HttpStatus.NOT_FOUND,
				"Unable to find an Okta group for organization " +
					organizationId);
		}

		Set<String> oktaEmailAddresses = new HashSet<>();

		for (OktaUser oktaUser : _oktaService.getGroupContacts(oktaGroupId)) {
			String emailAddress = oktaUser.getEmail();

			if (Validator.isNotNull(emailAddress)) {
				oktaEmailAddresses.add(StringUtil.toLowerCase(emailAddress));
			}
		}

		Set<String> organizationEmailAddresses = new HashSet<>();

		for (UserAccount userAccount :
				_userAccountService.getOrganizationUserAccounts(
					organizationId)) {

			String emailAddress = userAccount.getEmailAddress();

			if (Validator.isNotNull(emailAddress)) {
				organizationEmailAddresses.add(
					StringUtil.toLowerCase(emailAddress));
			}
		}

		for (String emailAddress : oktaEmailAddresses) {
			if (!organizationEmailAddresses.contains(emailAddress)) {
				_organizationService.addOrganizationUserAccountByEmailAddress(
					emailAddress, organizationId);
			}
		}

		for (String emailAddress : organizationEmailAddresses) {
			if (!oktaEmailAddresses.contains(emailAddress)) {
				_organizationService.
					removeOrganizationUserAccountByEmailAddress(
						emailAddress, organizationId);
			}
		}
	}

	@PostMapping("/{organizationId}/sync-to-jsm")
	public void postSyncToJSM(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId)
		throws Exception {

		_adminPermission.check(jwt);

		_organizationSynchronizer.syncOrganization(
			_organizationService.getOrganization(organizationId));
	}

	@PostMapping(
		"/{organizationId}/user-accounts/{userId}/organization-roles" +
			"/{organizationRoleId}"
	)
	public void postUserAccountsOrganizationRole(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("organizationId") long organizationId,
			@PathVariable("userId") long userId,
			@PathVariable("organizationRoleId") long organizationRoleId)
		throws Exception {

		_adminPermission.check(jwt);

		_roleService.addOrganizationUserAccountRole(
			organizationId, organizationRoleId, userId);

		_assignContactRole(organizationId, organizationRoleId, userId);

		_syncMembership(organizationId, userId);
	}

	private void _assignAccount(long accountId, long organizationId) {
		try {
			Account account = _accountService.fetchAccount(accountId);

			if (account == null) {
				return;
			}

			Organization organization = _organizationService.getOrganization(
				organizationId);

			_accountOrganizationSynchronizer.syncAssignOrganization(
				organization.getExternalReferenceCode(),
				account.getExternalReferenceCode());
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync account team role assignment for account " +
					accountId,
				exception);
		}
	}

	private void _assignContactRole(
		long organizationId, long organizationRoleId, long userId) {

		try {
			Organization organization = _organizationService.getOrganization(
				organizationId);
			Role role = _roleService.getRole(organizationRoleId);
			UserAccount userAccount = _userAccountService.getUserAccount(
				userId);

			_organizationUserAccountRoleSynchronizer.syncAssignRole(
				role.getExternalReferenceCode(),
				userAccount.getExternalReferenceCode(),
				organization.getExternalReferenceCode());
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync organization contact role assignment for " +
					"user " + userId,
				exception);
		}
	}

	private void _syncMembership(long organizationId, long userId) {
		try {
			_organizationUserAccountSynchronizer.
				syncOrganizationUserAccountMembership(
					_organizationService.getOrganization(organizationId),
					_userAccountService.getUserAccount(userId));
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync membership for user " + userId, exception);
		}
	}

	private void _unassignAccount(long accountId, long organizationId) {
		try {
			Account account = _accountService.fetchAccount(accountId);

			if (account == null) {
				return;
			}

			Organization organization = _organizationService.getOrganization(
				organizationId);

			_accountOrganizationSynchronizer.syncUnassignOrganization(
				organization.getExternalReferenceCode(),
				account.getExternalReferenceCode());
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync account team role unassignment for account " +
					accountId,
				exception);
		}
	}

	private void _unassignContactRole(
		long organizationId, long organizationRoleId, long userId) {

		try {
			Organization organization = _organizationService.getOrganization(
				organizationId);
			Role role = _roleService.getRole(organizationRoleId);
			UserAccount userAccount = _userAccountService.getUserAccount(
				userId);

			_organizationUserAccountRoleSynchronizer.syncUnassignRole(
				role.getExternalReferenceCode(),
				userAccount.getExternalReferenceCode(),
				organization.getExternalReferenceCode());
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync organization contact role unassignment for " +
					"user " + userId,
				exception);
		}
	}

	private static final Log _log = LogFactory.getLog(
		OrganizationsRestController.class);

	@Autowired
	private AccountOrganizationSynchronizer _accountOrganizationSynchronizer;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private AdminPermission _adminPermission;

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
	private OrganizationUserAccountSynchronizer
		_organizationUserAccountSynchronizer;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private RoleService _roleService;

	@Autowired
	private UserAccountService _userAccountService;

}