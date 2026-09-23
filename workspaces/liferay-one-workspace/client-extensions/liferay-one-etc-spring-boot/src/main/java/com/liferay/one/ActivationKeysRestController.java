/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.ActivationKeyService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

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
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("projectExternalReferenceCode") String
				projectExternalReferenceCode)
		throws Exception {

		_environmentActivationPermission.checkLicenseKeyActivation(
			jwt, projectExternalReferenceCode);

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_JSON
		).body(
			_licenseKeyGenerateFormService.getGenerateForm(
				projectExternalReferenceCode
			).toString()
		);
	}

	@GetMapping("/subscriptions")
	public ResponseEntity<String> getSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("activationKeyId") long activationKeyId)
		throws Exception {

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
			_licenseKeyPermission.check(
				activationKey.getAccountEntryId(), ActionKeys.UPDATE, jwt);
		}
		else {
			_environmentActivationPermission.check(
				jwt, projectExternalReferenceCode);
		}

		JSONObject jsonObject = new JSONObject(json);

		_activationKeyService.updateActivationKeyActive(
			jsonObject.optBoolean("active"), activationKeyId);
	}

	@PostMapping("/generate")
	public ResponseEntity<String> postActivationKeysGenerate(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String projectExternalReferenceCode = jsonObject.optString(
			"projectExternalReferenceCode");

		Project project =
			_environmentActivationPermission.checkLicenseKeyActivation(
				jwt, projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(projectExternalReferenceCode);
		}

		ActivationKey activationKey =
			_licenseKeyGenerationService.generateActivationKey(
				new LicenseKeyGenerationService.GenerateRequest(
					_toLongs(jsonObject.optJSONArray("bundleEntitlementIds")),
					jsonObject.optString("dataCenterLocation"),
					jsonObject.optString("description"),
					jsonObject.optString("environmentName"),
					jsonObject.optString("keyType"), project,
					_toServers(jsonObject.optJSONArray("servers")),
					jsonObject.optLong("subscriptionEntitlementId"),
					jsonObject.optString("version"),
					jsonObject.optString("workspaceName"),
					jsonObject.optString("workspaceOwnerEmail")));

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

	private ActivationKey _getActivationKey(Jwt jwt, long activationKeyId)
		throws Exception {

		ActivationKey activationKey = _activationKeyService.getActivationKey(
			jwt, activationKeyId);

		_licenseKeyPermission.check(
			activationKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		return activationKey;
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

	@Autowired
	private ActivationKeyService _activationKeyService;

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
	private SubscriptionEntryService _subscriptionEntryService;

}