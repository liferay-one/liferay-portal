/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.problem.Problem;
import com.liferay.headless.admin.user.client.resource.v1_0.UserAccountResource;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import jakarta.servlet.http.HttpServletRequest;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * @author Amos Fong
 */
@Component
public class UserAccountService extends OneBaseService {

	public UserAccount addUserAccount(
			String emailAddress, String familyName, String givenName)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		UserAccount userAccount = new UserAccount();

		userAccount.setEmailAddress(() -> emailAddress);

		if (Validator.isNotNull(familyName)) {
			userAccount.setFamilyName(() -> familyName);
		}

		if (Validator.isNotNull(givenName)) {
			userAccount.setGivenName(() -> givenName);
		}

		try {
			return userAccountResource.postUserAccount(null, null, userAccount);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) &&
				Objects.equals(
					problem.getStatus(), HttpStatus.CONFLICT.name())) {

				return getUserAccountByEmailAddress(emailAddress);
			}

			throw problemException;
		}
	}

	public UserAccount fetchUserAccountByEmailAddress(String emailAddress)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource(
			"nestedFields", "accountBriefs,customFields,organizationBriefs");

		try {
			return userAccountResource.getUserAccountByEmailAddress(
				emailAddress);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	public UserAccount fetchUserAccountByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource(
			"nestedFields", "accountBriefs");

		try {
			return userAccountResource.getUserAccountByExternalReferenceCode(
				externalReferenceCode);
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return null;
			}

			throw problemException;
		}
	}

	public List<UserAccount> getAccountUserAccounts(long accountId)
		throws Exception {

		return _getAccountUserAccounts(
			accountId,
			_buildUserAccountResource("nestedFields", "customFields"));
	}

	public List<UserAccount> getAccountUserAccounts(
			long accountId, String fields)
		throws Exception {

		return _getAccountUserAccounts(
			accountId, _buildUserAccountResource("fields", fields));
	}

	public UserAccount getMyUserAccount(Jwt jwt) throws Exception {
		UserAccountResource userAccountResource = _buildUserAccountResource(
			jwt);

		HttpServletRequest httpServletRequest = _getHttpServletRequest();

		if (httpServletRequest == null) {
			return userAccountResource.getMyUserAccount();
		}

		long doAsUserId = GetterUtil.getLong(
			httpServletRequest.getParameter("doAsUserId"));

		if (doAsUserId <= 0) {
			return userAccountResource.getMyUserAccount();
		}

		UserAccount userAccount = (UserAccount)httpServletRequest.getAttribute(
			_ATTRIBUTE_MY_USER_ACCOUNT);

		if (userAccount != null) {
			return userAccount;
		}

		userAccount = userAccountResource.getMyUserAccount();

		if (!Objects.equals(doAsUserId, userAccount.getId())) {
			if (!UserAccountUtil.hasRole(
					userAccount, RoleConstants.NAME_ADMINISTRATOR)) {

				throw new PrincipalException(
					StringBundler.concat(
						"User ", userAccount.getId(),
						" does not have permission to impersonate user ",
						doAsUserId));
			}

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"User ", userAccount.getId(), " impersonates user ",
						doAsUserId, " for ",
						httpServletRequest.getRequestURI()));
			}

			userAccount = getUserAccount(doAsUserId);
		}

		httpServletRequest.setAttribute(
			_ATTRIBUTE_MY_USER_ACCOUNT, userAccount);

		return userAccount;
	}

	public List<UserAccount> getOrganizationUserAccounts(long organizationId)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		List<UserAccount> userAccounts = new ArrayList<>();

		int page = 1;

		while (true) {
			Page<UserAccount> userAccountsPage =
				userAccountResource.getOrganizationUserAccountsPage(
					String.valueOf(organizationId), null, null,
					Pagination.of(page, _PAGE_SIZE), null);

			userAccounts.addAll(userAccountsPage.getItems());

			if (page >= userAccountsPage.getLastPage()) {
				break;
			}

			page++;
		}

		return userAccounts;
	}

	public UserAccount getUserAccount(long userId) throws Exception {
		UserAccountResource userAccountResource = _buildUserAccountResource();

		return userAccountResource.getUserAccount(userId);
	}

	public UserAccount getUserAccountByEmailAddress(String emailAddress)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		return userAccountResource.getUserAccountByEmailAddress(emailAddress);
	}

	public List<UserAccount> getUserAccounts(Collection<Long> userIds)
		throws Exception {

		return _getUserAccounts(
			_buildUserAccountResource("nestedFields", "customFields"), userIds);
	}

	public List<UserAccount> getUserAccounts(
			Collection<Long> userIds, String fields)
		throws Exception {

		return _getUserAccounts(
			_buildUserAccountResource("fields", fields), userIds);
	}

	public boolean hasAccountUserAccount(long accountId, long userId)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		try {
			userAccountResource.getAccountUserAccount(accountId, userId);

			return true;
		}
		catch (Problem.ProblemException problemException) {
			Problem problem = problemException.getProblem();

			if ((problem != null) && isNotFound(problem.getStatus())) {
				return false;
			}

			throw problemException;
		}
	}

	public boolean hasUserAccounts(long accountId) throws Exception {
		UserAccountResource userAccountResource = _buildUserAccountResource();

		Page<UserAccount> userAccountsPage =
			userAccountResource.getAccountUserAccountsPage(
				accountId, null, null, Pagination.of(1, 1), null);

		if (userAccountsPage.getTotalCount() > 0) {
			return true;
		}

		return false;
	}

	public void setVerified(long userId) throws Exception {
		UserAccountResource userAccountResource = _buildUserAccountResource();

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> Boolean.TRUE);

		CustomField customField = new CustomField();

		customField.setCustomValue(() -> customValue);
		customField.setName(() -> "verified");

		UserAccount userAccount = new UserAccount();

		userAccount.setCustomFields(() -> new CustomField[] {customField});

		userAccountResource.patchUserAccount(userId, userAccount);
	}

	public void updateUser(
			String familyName, String givenName, long userId, String uuid)
		throws Exception {

		UserAccountResource userAccountResource = _buildUserAccountResource();

		UserAccount userAccount = new UserAccount();

		if (Validator.isNotNull(uuid)) {
			CustomValue customValue = new CustomValue();

			customValue.setData(() -> uuid);

			CustomField customField = new CustomField();

			customField.setCustomValue(() -> customValue);
			customField.setName(() -> "uuid_");

			userAccount.setCustomFields(() -> new CustomField[] {customField});
		}

		userAccount.setFamilyName(() -> familyName);
		userAccount.setGivenName(() -> givenName);

		userAccountResource.patchUserAccount(userId, userAccount);
	}

	private UserAccountResource _buildUserAccountResource(
		Jwt jwt, String... parameters) {

		return UserAccountResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization(jwt)
		).parameters(
			parameters
		).build();
	}

	private UserAccountResource _buildUserAccountResource(
		String... parameters) {

		return UserAccountResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameters(
			parameters
		).build();
	}

	private List<UserAccount> _getAccountUserAccounts(
			long accountId, UserAccountResource userAccountResource)
		throws Exception {

		List<UserAccount> userAccounts = new ArrayList<>();

		int page = 1;

		while (true) {
			Page<UserAccount> userAccountsPage =
				userAccountResource.getAccountUserAccountsPage(
					accountId, null, null, Pagination.of(page, _PAGE_SIZE),
					null);

			userAccounts.addAll(userAccountsPage.getItems());

			if (page >= userAccountsPage.getLastPage()) {
				break;
			}

			page++;
		}

		return userAccounts;
	}

	private HttpServletRequest _getHttpServletRequest() {
		RequestAttributes requestAttributes =
			RequestContextHolder.getRequestAttributes();

		if (requestAttributes instanceof
				ServletRequestAttributes servletRequestAttributes) {

			return servletRequestAttributes.getRequest();
		}

		return null;
	}

	private List<UserAccount> _getUserAccounts(
			UserAccountResource userAccountResource, Collection<Long> userIds)
		throws Exception {

		if ((userIds == null) || userIds.isEmpty()) {
			return Collections.emptyList();
		}

		List<Long> uniqueUserIds = new ArrayList<>(
			new LinkedHashSet<>(userIds));

		List<UserAccount> userAccounts = new ArrayList<>();

		for (int i = 0; i < uniqueUserIds.size(); i += _FILTER_BATCH_SIZE) {
			List<Long> batchUserIds = uniqueUserIds.subList(
				i, Math.min(i + _FILTER_BATCH_SIZE, uniqueUserIds.size()));

			Page<UserAccount> userAccountsPage =
				userAccountResource.getUserAccountsPage(
					null,
					StringBundler.concat(
						"id in ('", StringUtil.merge(batchUserIds, "','"),
						"')"),
					Pagination.of(1, batchUserIds.size()), null);

			userAccounts.addAll(userAccountsPage.getItems());
		}

		return userAccounts;
	}

	private static final String _ATTRIBUTE_MY_USER_ACCOUNT =
		UserAccountService.class.getName() + ".myUserAccount";

	private static final int _FILTER_BATCH_SIZE = 100;

	private static final int _PAGE_SIZE = 500;

	private static final Log _log = LogFactory.getLog(UserAccountService.class);

}