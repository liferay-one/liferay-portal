/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.exception.NoSuchAccountException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyType;
import com.liferay.one.license.LicenseKeyTypeService;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.ActivationKeyService;
import com.liferay.one.service.AppLicenseKeyGenerationService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Pedro Oliveira
 */
@RequestMapping("/activation-keys")
@RestController
public class ActivationKeysRestController extends OneBaseRestController {

	@DeleteMapping("/subscriptions")
	public void deleteSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("activationKeyIds") long[] activationKeyIds)
		throws Exception {

		for (long activationKeyId : activationKeyIds) {
			_getActivationKey(jwt, activationKeyId);
		}

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long activationKeyId : activationKeyIds) {
			_subscriptionEntryService.deleteSubscriptionEntry(
				jwt, ClassNameConstants.ACTIVATION_KEY, activationKeyId,
				userAccount.getId());
		}
	}

	@GetMapping("/{activationKeyId}")
	public ActivationKey getActivationKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("activationKeyId") long activationKeyId)
		throws Exception {

		return _getActivationKey(jwt, activationKeyId);
	}

	@GetMapping("/{activationKeyId}/download")
	public ResponseEntity<String> getActivationKeysDownload(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("activationKeyId") long activationKeyId)
		throws Exception {

		_getActivationKey(jwt, activationKeyId);

		List<LicenseKey> licenseKeys = _getActiveLicenseKeys(activationKeyId);

		if (licenseKeys.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		String fileName = _licenseKeyExporter.getFileName(licenseKeys);

		return ResponseEntity.ok(
		).contentType(
			MediaType.TEXT_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + fileName + "\""
		).body(
			_licenseKeyExporter.toXML(licenseKeys)
		);
	}

	@GetMapping("/generate-form")
	public ResponseEntity<String> getActivationKeysGenerateForm(
			@RequestParam(
				name = "accountExternalReferenceCode", required = false
			)
			String accountExternalReferenceCode,
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam(
				name = "projectExternalReferenceCode", required = false
			)
			String projectExternalReferenceCode,
			@RequestParam(
				name = "renewedActivationKeyExternalReferenceCode",
				required = false
			)
			String renewedActivationKeyExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(projectExternalReferenceCode)) {
			Account account = _getAccount(accountExternalReferenceCode, jwt);

			return ResponseEntity.ok(
			).contentType(
				MediaType.APPLICATION_JSON
			).body(
				_toGenerateFormJSONObject(
					_appLicenseKeyGenerationService.getGenerateForm(
						account.getId()),
					_fetchSelfServiceTrialGenerateFormJSONObject(account, jwt)
				).toString()
			);
		}

		Project project = _getProject(jwt, projectExternalReferenceCode);

		_checkRenewedActivationKey(
			jwt, project, renewedActivationKeyExternalReferenceCode);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			_licenseKeyGenerateFormService.getGenerateForm(
				_adminPermission.contains(jwt), project,
				_environmentActivationPermission.containsProvisioning(
					jwt, project),
				renewedActivationKeyExternalReferenceCode
			).toString()
		);
	}

	@GetMapping("/summary")
	public ResponseEntity<String> getActivationKeysSummary(
			@RequestParam(
				name = "accountExternalReferenceCode", required = false
			)
			String accountExternalReferenceCode,
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam(
				name = "projectExternalReferenceCode", required = false
			)
			String projectExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(projectExternalReferenceCode)) {
			Account account = _getAccount(accountExternalReferenceCode, jwt);

			boolean provisionable =
				_environmentActivationPermission.containsSelfProvisioning(
					account.getId(), jwt);

			return ResponseEntity.ok(
			).contentType(
				MediaType.APPLICATION_JSON
			).body(
				_toSummaryJSONObject(
					_appLicenseKeyGenerationService.getSummary(
						account.getId(), provisionable),
					_fetchSelfServiceTrialSummaryJSONObject(
						account, jwt, provisionable)
				).toString()
			);
		}

		Project project = _getProject(jwt, projectExternalReferenceCode);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			_licenseKeyGenerateFormService.getSummary(
				_adminPermission.contains(jwt), project,
				_environmentActivationPermission.containsProvisioning(
					jwt, project)
			).toString()
		);
	}

	@GetMapping("/subscriptions")
	public ResponseEntity<String> getSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("activationKeyId") long activationKeyId)
		throws Exception {

		_getActivationKey(jwt, activationKeyId);

		UserAccount userAccount = getMyUserAccount(jwt);

		SubscriptionEntry subscriptionEntry =
			_subscriptionEntryService.fetchSubscriptionEntry(
				jwt, ClassNameConstants.ACTIVATION_KEY, activationKeyId,
				userAccount.getId());

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			new JSONObject(
			).put(
				"subscribed", subscriptionEntry != null
			).toString()
		);
	}

	@PatchMapping("/{activationKeyId}/active")
	public void patchActivationKeysActive(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable long activationKeyId, @RequestBody String json)
		throws Exception {

		ActivationKey activationKey = _activationKeyService.getActivationKey(
			jwt, activationKeyId);

		String projectExternalReferenceCode =
			activationKey.getProjectExternalReferenceCode();

		if (Validator.isNull(projectExternalReferenceCode)) {
			Account account = _accountService.fetchAccount(
				activationKey.getAccountEntryId());

			_environmentActivationPermission.checkAccountLicenseKeyActivation(
				(account == null) ? null : account.getExternalReferenceCode(),
				jwt);
		}
		else {
			_environmentActivationPermission.checkLicenseKeyActivation(
				jwt, projectExternalReferenceCode);
		}

		_environmentActivationPermission.checkSelfProvisioning(
			activationKey.getAccountEntryId(), jwt);

		JSONObject jsonObject = new JSONObject(json);

		boolean active = getRequiredBoolean(jsonObject, "active");

		if (activationKey.isComplimentary()) {
			_adminPermission.check(jwt);

			if (active) {
				throw new LicenseKeyEntitlementException(
					"A complimentary activation key cannot be reactivated");
			}
		}

		_activationKeyService.updateActivationKeyActive(
			activationKeyId, active);
	}

	@PostMapping("/generate")
	public ResponseEntity<String> postActivationKeysGenerate(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String projectExternalReferenceCode = jsonObject.optString(
			"projectExternalReferenceCode");

		if (Validator.isNull(projectExternalReferenceCode)) {
			Account account = _getAccount(
				jsonObject.optString("accountExternalReferenceCode"), jwt);

			_environmentActivationPermission.checkSelfProvisioning(
				account.getId(), jwt);

			_checkKeyType(jsonObject.optString("keyType"), jwt);

			LicenseKeyGenerationService.GenerateRequest generateRequest =
				_toGenerateRequest(jsonObject, null);

			if (_isSelfServiceTrialEntitlement(
					account, generateRequest.getSubscriptionEntitlementId())) {

				return _toResponseEntity(
					_licenseKeyGenerationService.generateActivationKey(
						account, generateRequest));
			}

			UserAccount userAccount = getMyUserAccount(jwt);

			return _toResponseEntity(
				_appLicenseKeyGenerationService.generateActivationKey(
					account, generateRequest, userAccount.getEmailAddress()));
		}

		Project project =
			_environmentActivationPermission.checkLicenseKeyActivation(
				jwt, projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(projectExternalReferenceCode);
		}

		_environmentActivationPermission.checkSelfProvisioning(
			project.getAccountId(), jwt);

		_checkKeyType(jsonObject.optString("keyType"), jwt);

		String renewedActivationKeyExternalReferenceCode = jsonObject.optString(
			"renewedActivationKeyExternalReferenceCode", null);

		_checkRenewedActivationKey(
			jwt, project, renewedActivationKeyExternalReferenceCode);

		return _toResponseEntity(
			_licenseKeyGenerationService.generateActivationKey(
				_toGenerateRequest(jsonObject, project)));
	}

	@PutMapping("/subscriptions")
	public void putSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("activationKeyIds") long[] activationKeyIds)
		throws Exception {

		for (long activationKeyId : activationKeyIds) {
			_getActivationKey(jwt, activationKeyId);
		}

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long activationKeyId : activationKeyIds) {
			_subscriptionEntryService.addSubscriptionEntry(
				jwt, ClassNameConstants.ACTIVATION_KEY, activationKeyId,
				userAccount.getId());
		}
	}

	private void _checkKeyType(String keyType, Jwt jwt) throws Exception {
		LicenseKeyType licenseKeyType = LicenseKeyType.fetchLicenseKeyType(
			keyType);

		if ((licenseKeyType != null) &&
			_licenseKeyTypeService.isAdminType(licenseKeyType)) {

			_adminPermission.check(jwt);
		}
	}

	private void _checkRenewedActivationKey(
			Jwt jwt, Project project,
			String renewedActivationKeyExternalReferenceCode)
		throws Exception {

		if (Validator.isNull(renewedActivationKeyExternalReferenceCode)) {
			return;
		}

		ActivationKey activationKey = _activationKeyService.fetchActivationKey(
			renewedActivationKeyExternalReferenceCode);

		if (activationKey == null) {
			return;
		}

		_licenseKeyPermission.check(
			activationKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		if (activationKey.isComplimentary()) {
			throw new LicenseKeyEntitlementException(
				"A complimentary activation key cannot be renewed");
		}

		if ((project == null) ||
			!Objects.equals(
				project.getExternalReferenceCode(),
				activationKey.getProjectExternalReferenceCode())) {

			throw new PrincipalException();
		}
	}

	/**
	 * Returns the generate form of the self service trial entitlements, or
	 * <code>null</code> when it cannot be read, so the app keys of the account
	 * stay available while the trial entitlements are not.
	 */
	private JSONObject _fetchSelfServiceTrialGenerateFormJSONObject(
		Account account, Jwt jwt) {

		try {
			return _licenseKeyGenerateFormService.getGenerateForm(
				_adminPermission.contains(jwt), account,
				_environmentActivationPermission.containsSelfProvisioning(
					account.getId(), jwt));
		}
		catch (Exception exception) {
			_log.error(
				"Unable to get the trial generate form of account " +
					account.getId(),
				exception);

			return null;
		}
	}

	private JSONObject _fetchSelfServiceTrialSummaryJSONObject(
		Account account, Jwt jwt, boolean provisionable) {

		try {
			return _licenseKeyGenerateFormService.getSummary(
				_adminPermission.contains(jwt), account, provisionable);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to get the trial summary of account " + account.getId(),
				exception);

			return null;
		}
	}

	private Account _getAccount(String accountExternalReferenceCode, Jwt jwt)
		throws Exception {

		Account account =
			_environmentActivationPermission.checkAccountLicenseKeyActivation(
				accountExternalReferenceCode, jwt);

		if (account == null) {
			throw new NoSuchAccountException(
				"No account exists with external reference code " +
					accountExternalReferenceCode);
		}

		return account;
	}

	private ActivationKey _getActivationKey(Jwt jwt, long activationKeyId)
		throws Exception {

		ActivationKey activationKey = _activationKeyService.getActivationKey(
			jwt, activationKeyId);

		_licenseKeyPermission.check(
			activationKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		return activationKey;
	}

	private List<LicenseKey> _getActiveLicenseKeys(long activationKeyId)
		throws Exception {

		List<LicenseKey> licenseKeys = new ArrayList<>();

		for (LicenseKey licenseKey :
				_licenseKeyService.getLicenseKeysByActivationKeyId(
					activationKeyId)) {

			if (!licenseKey.isActive()) {
				continue;
			}

			licenseKeys.add(licenseKey);
		}

		return licenseKeys;
	}

	private Project _getProject(Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		_projectPermission.check(
			ActionKeys.VIEW, jwt, projectExternalReferenceCode);

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(projectExternalReferenceCode);
		}

		return project;
	}

	private boolean _isSelfServiceTrialEntitlement(
			Account account, long entitlementId)
		throws Exception {

		if (entitlementId <= 0) {
			return false;
		}

		Entitlement entitlement = null;

		try {
			entitlement = _entitlementService.fetchEntitlement(entitlementId);
		}
		catch (Exception exception) {
			_log.error("Unable to get entitlement " + entitlementId, exception);

			return false;
		}

		if ((entitlement != null) &&
			Objects.equals(entitlement.getAccountEntryId(), account.getId()) &&
			entitlement.isSelfServiceTrial()) {

			return true;
		}

		return false;
	}

	private Date _toDate(JSONObject jsonObject, String key) {
		if (jsonObject.isNull(key)) {
			return null;
		}

		try {
			return Date.from(Instant.parse(jsonObject.getString(key)));
		}
		catch (Exception exception) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST, "Invalid \"" + key + "\"", exception);
		}
	}

	private JSONObject _toGenerateFormJSONObject(
		JSONObject appGenerateFormJSONObject,
		JSONObject licenseKeyGenerateFormJSONObject) {

		JSONArray productsJSONArray = new JSONArray();

		productsJSONArray.putAll(
			appGenerateFormJSONObject.getJSONArray("products"));

		if (licenseKeyGenerateFormJSONObject == null) {
			return new JSONObject(
			).put(
				"bundleProducts", new JSONArray()
			).put(
				"products", productsJSONArray
			);
		}

		productsJSONArray.putAll(
			licenseKeyGenerateFormJSONObject.getJSONArray("products"));

		return new JSONObject(
		).put(
			"bundleProducts",
			licenseKeyGenerateFormJSONObject.getJSONArray("bundleProducts")
		).put(
			"products", productsJSONArray
		);
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		JSONObject jsonObject, Project project) {

		return new LicenseKeyGenerationService.GenerateRequest(
			_toLongs(jsonObject.optJSONArray("bundleEntitlementIds")),
			jsonObject.optString("dataCenterLocation"),
			jsonObject.optString("description"),
			jsonObject.optString("environmentName"),
			jsonObject.optString("keyType"), project,
			jsonObject.optString("purpose", null),
			jsonObject.optString(
				"renewedActivationKeyExternalReferenceCode", null),
			_toServers(jsonObject.optJSONArray("servers")),
			_toDate(jsonObject, "startDate"),
			jsonObject.optLong("subscriptionEntitlementId"),
			jsonObject.optString("version"),
			jsonObject.optString("workspaceName"),
			jsonObject.optString("workspaceOwnerEmail"));
	}

	private List<Long> _toLongs(JSONArray jsonArray) {
		List<Long> longs = new ArrayList<>();

		if (jsonArray == null) {
			return longs;
		}

		for (int i = 0; i < jsonArray.length(); i++) {
			longs.add(jsonArray.getLong(i));
		}

		return longs;
	}

	private ResponseEntity<String> _toResponseEntity(
		ActivationKey activationKey) {

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			new JSONObject(
			).put(
				"activationKeyId", activationKey.getActivationKeyId()
			).put(
				"externalReferenceCode",
				activationKey.getExternalReferenceCode()
			).toString()
		);
	}

	private List<LicenseKeyGenerationService.GenerateRequest.Server> _toServers(
		JSONArray jsonArray) {

		List<LicenseKeyGenerationService.GenerateRequest.Server> servers =
			new ArrayList<>();

		if (jsonArray == null) {
			return servers;
		}

		for (int i = 0; i < jsonArray.length(); i++) {
			JSONObject jsonObject = jsonArray.getJSONObject(i);

			servers.add(
				new LicenseKeyGenerationService.GenerateRequest.Server(
					jsonObject.optString("hostName"),
					jsonObject.optString("ipAddresses"),
					jsonObject.optString("macAddresses")));
		}

		return servers;
	}

	private JSONObject _toSummaryJSONObject(
		JSONObject appSummaryJSONObject,
		JSONObject licenseKeySummaryJSONObject) {

		if (licenseKeySummaryJSONObject == null) {
			return new JSONObject(
			).put(
				"cloudNativeKeyTypes", new JSONArray()
			).put(
				"generatable", appSummaryJSONObject.getBoolean("generatable")
			).put(
				"provisionable",
				appSummaryJSONObject.getBoolean("provisionable")
			);
		}

		return new JSONObject(
		).put(
			"cloudNativeKeyTypes",
			licenseKeySummaryJSONObject.getJSONArray("cloudNativeKeyTypes")
		).put(
			"generatable",
			appSummaryJSONObject.getBoolean("generatable") ||
			licenseKeySummaryJSONObject.getBoolean("generatable")
		).put(
			"provisionable", appSummaryJSONObject.getBoolean("provisionable")
		);
	}

	private static final Log _log = LogFactory.getLog(
		ActivationKeysRestController.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private AppLicenseKeyGenerationService _appLicenseKeyGenerationService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private EnvironmentActivationPermission _environmentActivationPermission;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;

	@Autowired
	private LicenseKeyGenerationService _licenseKeyGenerationService;

	@Autowired
	private LicenseKeyPermission _licenseKeyPermission;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	@Autowired
	private LicenseKeyTypeService _licenseKeyTypeService;

	@Autowired
	private ProjectPermission _projectPermission;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private SubscriptionEntryService _subscriptionEntryService;

}