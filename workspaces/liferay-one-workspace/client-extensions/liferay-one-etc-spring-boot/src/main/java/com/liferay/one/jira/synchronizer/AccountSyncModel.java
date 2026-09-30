/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountContactInformation;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.one.jira.service.JiraBusinessEventService;
import com.liferay.one.model.AccountSupportInfo;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Project;
import com.liferay.one.model.Property;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.OrganizationService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.RoleService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.FindUtil;
import com.liferay.one.util.MemoizedValue;
import com.liferay.one.util.role.EmployeeRoles;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.ListUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Drew Brokke
 */
public class AccountSyncModel {

	public AccountSyncModel(
		Account account, CommerceOrderService commerceOrderService,
		EntitlementService entitlementService,
		ExternalLinkConverter externalLinkConverter,
		JiraBusinessEventService jiraBusinessEventService,
		OrganizationService organizationService, ProjectService projectService,
		PropertyService propertyService, RoleService roleService,
		UserAccountService userAccountService) {

		_account = account;
		_externalLinkConverter = externalLinkConverter;
		_jiraBusinessEventService = jiraBusinessEventService;
		_propertyService = propertyService;
		_roleService = roleService;

		String externalReferenceCode = account.getExternalReferenceCode();

		_accountOrganizations = new MemoizedValue<>(
			"organizations for account " + externalReferenceCode, _log,
			() -> organizationService.getAccountOrganizations(account.getId()));
		_accountRolesByExternalReferenceCode = new MemoizedValue<>(
			"account roles for account " + externalReferenceCode, _log,
			this::_toAccountRolesByExternalReferenceCode);
		_accountSupportInfo = new MemoizedValue<>(
			"support info for account " + externalReferenceCode, _log,
			() -> commerceOrderService.getAccountSupportInfo(
				account.getId(), account.getDefaultBillingAddressId()));
		_accountUserAccounts = new MemoizedValue<>(
			"user accounts for account " + externalReferenceCode, _log,
			() -> userAccountService.getAccountUserAccounts(account.getId()));
		_activeEntitlementDefinitions = new MemoizedValue<>(
			"entitlements for account " + externalReferenceCode, _log,
			() -> entitlementService.getActiveEntitlementDefinitions(
				account.getId()));
		_businessEventsFieldValue = new MemoizedValue<>(
			"business events for account " + externalReferenceCode, _log,
			this::_toBusinessEventsFieldValue);
		_externalLinkProperties = new MemoizedValue<>(
			"external links for account " + externalReferenceCode, _log,
			this::_toExternalLinkProperties);
		_projects = new MemoizedValue<>(
			"projects for account " + externalReferenceCode, _log,
			() -> projectService.getProjects(account.getId()));
		_roleExternalKeysByUserAccountExternalKey = new MemoizedValue<>(
			"role external keys for account " + externalReferenceCode, _log,
			this::_toRoleExternalKeysByUserAccountExternalKey);
		_userAccountBucket = new MemoizedValue<>(
			"user account bucket for account " + externalReferenceCode, _log,
			this::_toUserAccountBucket);
	}

	public Account getAccount() {
		return _account;
	}

	public List<Organization> getAccountOrganizations() {
		return _accountOrganizations.get();
	}

	public Map<String, Role> getAccountRolesByExternalReferenceCode() {
		return _accountRolesByExternalReferenceCode.get();
	}

	public List<UserAccount> getAccountUserAccounts() {
		return _accountUserAccounts.get();
	}

	public List<EntitlementDefinition> getActiveEntitlementDefinitions() {
		return _activeEntitlementDefinitions.get();
	}

	public String getBusinessEventsFieldValue() {
		return _businessEventsFieldValue.get();
	}

	public List<UserAccount> getCustomerUserAccounts() {
		UserAccountBucket userAccountBucket = _userAccountBucket.get();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getCustomerUserAccounts();
	}

	public List<Property> getExternalLinkProperties() {
		return _externalLinkProperties.get();
	}

	public String getExternalReferenceCode() {
		return _account.getExternalReferenceCode();
	}

	public List<PostalAddress> getPostalAddresses() {
		AccountContactInformation accountContactInformation =
			_account.getAccountContactInformation();

		if (accountContactInformation == null) {
			return null;
		}

		return ListUtil.fromArray(
			accountContactInformation.getPostalAddresses());
	}

	public List<Project> getProjects() {
		return _projects.get();
	}

	public Map<String, Set<String>>
		getRoleExternalKeysByUserAccountExternalKey() {

		return _roleExternalKeysByUserAccountExternalKey.get();
	}

	public String getSupportLanguage() {
		AccountSupportInfo accountSupportInfo = _accountSupportInfo.get();

		if (accountSupportInfo == null) {
			return null;
		}

		return GetterUtil.getString(accountSupportInfo.getSupportLanguage());
	}

	public String getSupportRegion() {
		AccountSupportInfo accountSupportInfo = _accountSupportInfo.get();

		if (accountSupportInfo == null) {
			return null;
		}

		return GetterUtil.getString(accountSupportInfo.getSupportRegion());
	}

	public List<UserAccount> getWorkerUserAccounts() {
		UserAccountBucket userAccountBucket = _userAccountBucket.get();

		if (userAccountBucket == null) {
			return null;
		}

		return userAccountBucket.getWorkerUserAccounts();
	}

	private void _addJiraBusinessEventLine(
		List<String> lines, String fieldName, String value) {

		if (Validator.isNull(value)) {
			return;
		}

		lines.add(fieldName + ": " + value);
	}

	private Map<String, Role> _toAccountRolesByExternalReferenceCode()
		throws Exception {

		Map<String, Role> accountRolesByExternalReferenceCode =
			new LinkedHashMap<>();

		for (Role role : _roleService.getAccountRoles()) {
			accountRolesByExternalReferenceCode.put(
				role.getExternalReferenceCode(), role);
		}

		return accountRolesByExternalReferenceCode;
	}

	private String _toBusinessEventFieldValuePart(
		JiraBusinessEvent jiraBusinessEvent) {

		List<String> lines = new ArrayList<>();

		_addJiraBusinessEventLine(lines, "name", jiraBusinessEvent.getName());
		_addJiraBusinessEventLine(
			lines, "targetGoLiveDateTime",
			jiraBusinessEvent.getPlannedEventDate());
		_addJiraBusinessEventLine(
			lines, "description", jiraBusinessEvent.getDescription());
		_addJiraBusinessEventLine(
			lines, "type", jiraBusinessEvent.getEventTypeName());
		_addJiraBusinessEventLine(
			lines, "currentVersion",
			jiraBusinessEvent.getCurrentLiferayVersionName());
		_addJiraBusinessEventLine(
			lines, "newVersion", jiraBusinessEvent.getNewLiferayVersionName());

		return StringUtil.merge(lines, ",\n");
	}

	private String _toBusinessEventsFieldValue() throws Exception {
		List<String> parts = new ArrayList<>();

		List<JiraBusinessEvent> jiraBusinessEvents =
			_jiraBusinessEventService.getJiraBusinessEvents(
				_account.getExternalReferenceCode());

		for (JiraBusinessEvent jiraBusinessEvent : jiraBusinessEvents) {
			String part = _toBusinessEventFieldValuePart(jiraBusinessEvent);

			if (Validator.isNotNull(part)) {
				parts.add(part);
			}
		}

		return StringUtil.merge(parts, "\n\n");
	}

	private List<Property> _toExternalLinkProperties() throws Exception {
		List<Property> externalLinkProperties = new ArrayList<>();

		List<Property> properties = _propertyService.getAccountProperties(
			_account.getId());

		for (Property property : properties) {
			if (_externalLinkConverter.isExternalLinkProperty(property)) {
				externalLinkProperties.add(property);
			}
		}

		return externalLinkProperties;
	}

	private Map<String, Set<String>>
		_toRoleExternalKeysByUserAccountExternalKey() {

		List<UserAccount> accountUserAccounts = _accountUserAccounts.get();

		if (accountUserAccounts == null) {
			return null;
		}

		Map<String, Set<String>> roleExternalKeysByUserAccountExternalKey =
			new LinkedHashMap<>();

		for (UserAccount accountUserAccount : accountUserAccounts) {
			AccountBrief accountBrief = FindUtil.findFirst(
				accountUserAccount.getAccountBriefs(),
				accountBrief1 -> Objects.equals(
					getExternalReferenceCode(),
					accountBrief1.getExternalReferenceCode()));

			if (accountBrief == null) {
				continue;
			}

			RoleBrief[] roleBriefs = accountBrief.getRoleBriefs();

			if (roleBriefs == null) {
				continue;
			}

			Set<String> roleExternalKeys = new LinkedHashSet<>();

			for (RoleBrief roleBrief : roleBriefs) {
				roleExternalKeys.add(roleBrief.getExternalReferenceCode());
			}

			roleExternalKeysByUserAccountExternalKey.put(
				accountUserAccount.getExternalReferenceCode(),
				roleExternalKeys);
		}

		return roleExternalKeysByUserAccountExternalKey;
	}

	private UserAccountBucket _toUserAccountBucket() {
		List<UserAccount> accountUserAccounts = _accountUserAccounts.get();

		if (accountUserAccounts == null) {
			return null;
		}

		UserAccountBucket userAccountBucket = new UserAccountBucket();

		for (UserAccount accountUserAccount : accountUserAccounts) {
			AccountBrief accountBrief = FindUtil.findFirst(
				accountUserAccount.getAccountBriefs(),
				accountBrief1 -> Objects.equals(
					_account.getExternalReferenceCode(),
					accountBrief1.getExternalReferenceCode()));

			if (accountBrief == null) {
				_log.error(
					"accountBrief is null for user account = " +
						accountUserAccount);

				continue;
			}

			RoleBrief roleBrief = FindUtil.findFirst(
				accountBrief.getRoleBriefs(),
				roleBrief1 -> _employeeRoleNames.contains(
					roleBrief1.getName()));

			if (roleBrief != null) {
				userAccountBucket.addWorkerUserAccount(accountUserAccount);
			}
			else {
				userAccountBucket.addCustomerUserAccount(accountUserAccount);
			}
		}

		return userAccountBucket;
	}

	private static final Log _log = LogFactory.getLog(AccountSyncModel.class);

	private final Account _account;
	private final MemoizedValue<List<Organization>> _accountOrganizations;
	private final MemoizedValue<Map<String, Role>>
		_accountRolesByExternalReferenceCode;
	private final MemoizedValue<AccountSupportInfo> _accountSupportInfo;
	private final MemoizedValue<List<UserAccount>> _accountUserAccounts;
	private final MemoizedValue<List<EntitlementDefinition>>
		_activeEntitlementDefinitions;
	private final MemoizedValue<String> _businessEventsFieldValue;
	private final List<String> _employeeRoleNames = EmployeeRoles.getNames();
	private final ExternalLinkConverter _externalLinkConverter;
	private final MemoizedValue<List<Property>> _externalLinkProperties;
	private final JiraBusinessEventService _jiraBusinessEventService;
	private final MemoizedValue<List<Project>> _projects;
	private final PropertyService _propertyService;
	private final MemoizedValue<Map<String, Set<String>>>
		_roleExternalKeysByUserAccountExternalKey;
	private final RoleService _roleService;
	private final MemoizedValue<UserAccountBucket> _userAccountBucket;

}