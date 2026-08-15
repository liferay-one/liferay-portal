/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.exception.GoogleCloudFunctionUnavailableException;
import com.liferay.one.exception.InvalidUsageProductException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.jira.service.AccountAssetService;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.jira.synchronizer.AccountUserAccountRoleSynchronizer;
import com.liferay.one.jira.synchronizer.UserAccountSynchronizer;
import com.liferay.one.model.BaseUsageStrategy;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.ExperienceUsageStrategy;
import com.liferay.one.model.Project;
import com.liferay.one.model.SaaSUsageStrategy;
import com.liferay.one.permission.BusinessEventPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.GoogleCloudFunctionService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UserAccountService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Amos Fong
 */
@RequestMapping("/projects")
@RestController
public class ProjectRestController extends OneBaseRestController {

	@DeleteMapping(
		"/{projectId}/user-accounts/{userId}/account-roles" +
			"/{accountRoleExternalReferenceCode}"
	)
	public void deleteProjectMemberships(
			@AuthenticationPrincipal Jwt jwt, @PathVariable String projectId,
			@PathVariable long userId,
			@PathVariable String accountRoleExternalReferenceCode)
		throws Exception {

		if (_projectMembershipService.deleteProjectMembership(
				jwt, projectId, accountRoleExternalReferenceCode, userId)) {

			_syncDeletedMembership(
				accountRoleExternalReferenceCode, projectId, userId);
		}
	}

	@GetMapping("/{externalReferenceCode}/jira/object-key")
	public ResponseEntity<String> getJiraObjectKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode)
		throws Exception {

		_businessEventPermission.check(
			ActionKeys.VIEW, jwt, externalReferenceCode);

		return new ResponseEntity<>(
			_accountAssetService.getAccountObjectKey(externalReferenceCode),
			HttpStatus.OK);
	}

	@GetMapping("/{externalReferenceCode}/usage")
	public ResponseEntity<String> getUsage(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode,
			@RequestParam(
				name = "productExternalReferenceCode", required = false
			)
			String productExternalReferenceCode)
		throws Exception {

		_businessEventPermission.check(
			ActionKeys.VIEW, jwt, externalReferenceCode);

		JSONObject jsonObject = new JSONObject(
		).put(
			"metrics",
			_getMetricsJSONObject(
				productExternalReferenceCode, externalReferenceCode)
		);

		return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
	}

	@ExceptionHandler(GoogleCloudFunctionUnavailableException.class)
	public ResponseEntity<ProblemDetail> handleException(
		GoogleCloudFunctionUnavailableException
			googleCloudFunctionUnavailableException) {

		_log.error(
			"Unable to reach the DataOps usage API",
			googleCloudFunctionUnavailableException);

		return new ResponseEntity<>(
			ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_GATEWAY,
				"The usage service is temporarily unavailable"),
			HttpStatus.BAD_GATEWAY);
	}

	@ExceptionHandler(InvalidUsageProductException.class)
	public ResponseEntity<ProblemDetail> handleException(
		InvalidUsageProductException invalidUsageProductException) {

		if (_log.isWarnEnabled()) {
			_log.warn(
				"Unable to resolve a usage dashboard for the product",
				invalidUsageProductException);
		}

		return new ResponseEntity<>(
			ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				invalidUsageProductException.getMessage()),
			HttpStatus.BAD_REQUEST);
	}

	@PostMapping(
		"/{projectId}/user-accounts/{userId}/account-roles" +
			"/{accountRoleExternalReferenceCode}"
	)
	public void postProjectMemberships(
			@AuthenticationPrincipal Jwt jwt, @PathVariable String projectId,
			@PathVariable long userId,
			@PathVariable String accountRoleExternalReferenceCode)
		throws Exception {

		if (_projectMembershipService.addProjectMembership(
				jwt, projectId, accountRoleExternalReferenceCode, userId)) {

			_syncAddedMembership(
				accountRoleExternalReferenceCode, projectId, userId);
		}
	}

	@PostMapping("/{externalReferenceCode}/sync-to-jsm")
	public ResponseEntity<Void> postSyncToJSM(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("externalReferenceCode") String externalReferenceCode)
		throws Exception {

		_businessEventPermission.check(
			ActionKeys.UPDATE, jwt, externalReferenceCode);

		_accountSynchronizer.syncProject(
			_projectService.getProject(externalReferenceCode));

		return new ResponseEntity<>(HttpStatus.OK);
	}

	private UserAccount _fetchUserAccount(long userId) {
		try {
			return _userAccountService.getUserAccount(userId);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to get user account for user " + userId, exception);

			return null;
		}
	}

	private String _getAccountKey(Project project) throws Exception {
		long accountId = project.getAccountId();

		if (accountId > 0) {
			String value = _propertyService.getPropertyValue(
				accountId, PropertyConstants.NAME_KORONEIKI_ACCOUNT_KEY);

			if (Validator.isNotNull(value)) {
				return value;
			}
		}

		return project.getAccountExternalReferenceCode();
	}

	private JSONObject _getMetricsJSONObject(
			String productExternalReferenceCode,
			String projectExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(productExternalReferenceCode)) {
			throw new InvalidUsageProductException(
				"Product external reference code is required");
		}

		String productName = _commerceProductService.fetchProductName(
			productExternalReferenceCode);

		if (Validator.isNull(productName)) {
			throw new InvalidUsageProductException(
				"Unable to find product " + productExternalReferenceCode);
		}

		if (!ArrayUtil.contains(
				CommerceProductConstants.NAMES_EXPERIENCE_PRODUCTS,
				productName) &&
			!ArrayUtil.contains(
				CommerceProductConstants.NAMES_SAAS_PLAN_PRODUCTS,
				productName)) {

			throw new InvalidUsageProductException(
				StringBundler.concat(
					"Product ", productExternalReferenceCode,
					" has no usage dashboard: ", productName));
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(
				"Unable to find project " + projectExternalReferenceCode);
		}

		boolean experienceProduct = ArrayUtil.contains(
			CommerceProductConstants.NAMES_EXPERIENCE_PRODUCTS, productName);

		List<Entitlement> entitlements = _getUsageDashboardEntitlements(
			experienceProduct, projectExternalReferenceCode);

		BaseUsageStrategy usageStrategy = null;

		if (experienceProduct) {
			LocalDate localDate = LocalDate.now(ZoneOffset.UTC);

			usageStrategy = new ExperienceUsageStrategy(
				_googleCloudFunctionService.fetchComposableAccountUsage(
					_getAccountKey(project),
					localDate.format(_BILLING_PERIOD_DATE_TIME_FORMATTER)),
				entitlements);
		}
		else {
			usageStrategy = new SaaSUsageStrategy(
				_googleCloudFunctionService.fetchCustomerAccountUsage(
					_getAccountKey(project)),
				entitlements);
		}

		if (usageStrategy.hasUsage()) {
			return usageStrategy.toJSONObject();
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				"Unable to find DataOps usage data for project " +
					projectExternalReferenceCode);
		}

		return new JSONObject();
	}

	private List<Entitlement> _getUsageDashboardEntitlements(
			boolean experienceProduct, String projectExternalReferenceCode)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode);

		if (entitlements.isEmpty() && _log.isWarnEnabled()) {
			_log.warn(
				"Unable to find active entitlements for project " +
					projectExternalReferenceCode);
		}

		List<Entitlement> usageDashboardEntitlements = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			if (_isUsageDashboardEntitlement(entitlement, experienceProduct)) {
				usageDashboardEntitlements.add(entitlement);
			}
		}

		return usageDashboardEntitlements;
	}

	private boolean _isUsageDashboardEntitlement(
			Entitlement entitlement, boolean experienceProduct)
		throws Exception {

		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return false;
		}

		String productName = _commerceProductService.fetchProductName(
			entitlementDefinition.getCProductId());

		if (Validator.isNull(productName)) {
			return false;
		}

		if (experienceProduct) {
			return ArrayUtil.contains(
				CommerceProductConstants.NAMES_EXPERIENCE_ENTITLEMENT_PRODUCTS,
				productName);
		}

		if (ArrayUtil.contains(
				CommerceProductConstants.NAMES_SAAS_PLAN_ENTITLEMENT_PRODUCTS,
				productName) ||
			productName.startsWith(
				CommerceProductConstants.
					NAME_PREFIX_LIFERAY_SAAS_ENTITLEMENTS)) {

			return true;
		}

		return false;
	}

	private void _syncAddedMembership(
		String accountRoleExternalReferenceCode,
		String projectExternalReferenceCode, long userId) {

		UserAccount userAccount = _fetchUserAccount(userId);

		if (userAccount == null) {
			return;
		}

		_syncMembership(projectExternalReferenceCode, userAccount);

		try {
			_accountUserAccountRoleSynchronizer.syncAssignRole(
				accountRoleExternalReferenceCode,
				userAccount.getExternalReferenceCode(),
				projectExternalReferenceCode);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync contact role ",
					accountRoleExternalReferenceCode, " for user ",
					userAccount.getId()),
				exception);
		}
	}

	private void _syncDeletedMembership(
		String accountRoleExternalReferenceCode,
		String projectExternalReferenceCode, long userId) {

		UserAccount userAccount = _fetchUserAccount(userId);

		if (userAccount == null) {
			return;
		}

		_syncMembership(projectExternalReferenceCode, userAccount);

		try {
			_accountUserAccountRoleSynchronizer.syncUnassignRole(
				accountRoleExternalReferenceCode,
				userAccount.getExternalReferenceCode(),
				projectExternalReferenceCode);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to sync contact role ",
					accountRoleExternalReferenceCode, " for user ",
					userAccount.getId()),
				exception);
		}
	}

	private void _syncMembership(
		String projectExternalReferenceCode, UserAccount userAccount) {

		_syncProjectAndAccountUserAccounts(projectExternalReferenceCode);

		try {
			_userAccountSynchronizer.syncUserAccountAccounts(userAccount);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync accounts for user " + userAccount.getId(),
				exception);
		}

		try {
			_userAccountSynchronizer.syncUserAccountRoles(userAccount);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync roles for user " + userAccount.getId(),
				exception);
		}
	}

	private void _syncProjectAndAccountUserAccounts(
		String projectExternalReferenceCode) {

		Project project = null;

		try {
			project = _projectService.getProject(projectExternalReferenceCode);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to get project " + projectExternalReferenceCode,
				exception);

			return;
		}

		try {
			_accountSynchronizer.syncProjectUserAccounts(project);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync users for project " +
					projectExternalReferenceCode,
				exception);
		}

		String accountExternalReferenceCode =
			project.getAccountExternalReferenceCode();

		try {
			_accountSynchronizer.syncAccountUserAccounts(
				_accountService.getAccount(accountExternalReferenceCode));
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync users for account " +
					accountExternalReferenceCode,
				exception);
		}
	}

	private static final DateTimeFormatter _BILLING_PERIOD_DATE_TIME_FORMATTER =
		DateTimeFormatter.ofPattern("yyyy-MM");

	private static final Log _log = LogFactory.getLog(
		ProjectRestController.class);

	@Autowired
	private AccountAssetService _accountAssetService;

	@Autowired
	private AccountService _accountService;

	@Autowired
	private AccountSynchronizer _accountSynchronizer;

	@Autowired
	private AccountUserAccountRoleSynchronizer
		_accountUserAccountRoleSynchronizer;

	@Autowired
	private BusinessEventPermission _businessEventPermission;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private GoogleCloudFunctionService _googleCloudFunctionService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAccountSynchronizer _userAccountSynchronizer;

}