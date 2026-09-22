/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

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
 * @author Amos Fong
 */
@RequestMapping("/license-keys")
@RestController
public class LicenseKeysRestController extends OneBaseRestController {

	@DeleteMapping("/subscriptions")
	public void deleteSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long licenseKeyId : licenseKeyIds) {
			_subscriptionEntryService.deleteSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());
		}
	}

	@GetMapping("/{licenseKeyId}")
	public LicenseKey getLicenseKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("licenseKeyId") long licenseKeyId)
		throws Exception {

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			jwt, licenseKeyId);

		_licenseKeyPermission.check(
			licenseKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		return licenseKey;
	}

	@GetMapping("/developer-download")
	public ResponseEntity<String> getLicenseKeysDeveloperDownload(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("productName") String productName,
			@RequestParam("projectExternalReferenceCode") String
				projectExternalReferenceCode,
			@RequestParam("version") String version)
		throws Exception {

		Project project = _environmentActivationPermission.check(
			jwt, projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(projectExternalReferenceCode);
		}

		String licenseXML =
			_licenseKeyGenerationService.generateDeveloperLicenseXML(
				project, productName, version);

		String fileName = _licenseKeyExporter.getFileName(
			productName, version, "developer");

		return ResponseEntity.ok(
		).contentType(
			MediaType.TEXT_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + fileName + "\""
		).body(
			licenseXML
		);
	}

	@GetMapping("/{licenseKeyId}/download")
	public ResponseEntity<String> getLicenseKeysDownload(
			@AuthenticationPrincipal Jwt jwt, @PathVariable long licenseKeyId)
		throws Exception {

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			jwt, licenseKeyId);

		_licenseKeyPermission.check(
			licenseKey.getAccountEntryId(), ActionKeys.VIEW, jwt);

		if (licenseKey.getLicenseVersion() < 2) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		String fileName = _licenseKeyExporter.getFileName(licenseKey);

		return ResponseEntity.ok(
		).contentType(
			MediaType.TEXT_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + fileName + "\""
		).body(
			_licenseKeyExporter.toXML(licenseKey)
		);
	}

	@GetMapping("/download")
	public ResponseEntity<String> getLicenseKeysDownload(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getActiveLicenseKeys(
			jwt, licenseKeyIds);

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

	@GetMapping("/download-zip")
	public ResponseEntity<byte[]> getLicenseKeysDownloadZip(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getActiveLicenseKeys(
			jwt, licenseKeyIds);

		if (licenseKeys.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		return ResponseEntity.ok(
		).contentType(
			MediaType.parseMediaType("application/zip")
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"activation-keys.zip\""
		).body(
			_licenseKeyExporter.toZip(licenseKeys)
		);
	}

	@GetMapping("/export")
	public ResponseEntity<String> getLicenseKeysExport(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		_checkLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _getLicenseKeys(jwt, licenseKeyIds);

		UserAccount userAccount = getMyUserAccount(jwt);

		for (LicenseKey licenseKey : licenseKeys) {
			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);
		}

		return ResponseEntity.ok(
		).contentType(
			_CONTENT_TYPE_CSV
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" + _licenseKeyCSVExporter.getFileName() +
				"\""
		).body(
			_licenseKeyCSVExporter.toCSV(licenseKeys)
		);
	}

	@GetMapping("/generate-form")
	public ResponseEntity<String> getLicenseKeysGenerateForm(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("projectExternalReferenceCode") String
				projectExternalReferenceCode)
		throws Exception {

		_environmentActivationPermission.check(
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
	public boolean getSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyId") long licenseKeyId)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		SubscriptionEntry subscriptionEntry =
			_subscriptionEntryService.fetchSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());

		if (subscriptionEntry != null) {
			return true;
		}

		return false;
	}

	@PatchMapping("/{licenseKeyId}/active")
	public void patchLicenseKeysActive(
			@AuthenticationPrincipal Jwt jwt, @PathVariable long licenseKeyId,
			@RequestBody String json)
		throws Exception {

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			jwt, licenseKeyId);

		String projectExternalReferenceCode =
			licenseKey.getProjectExternalReferenceCode();

		if (Validator.isNull(projectExternalReferenceCode)) {
			_licenseKeyPermission.check(
				licenseKey.getAccountEntryId(), ActionKeys.UPDATE, jwt);
		}
		else {
			_environmentActivationPermission.check(
				jwt, projectExternalReferenceCode);
		}

		JSONObject jsonObject = new JSONObject(json);

		_licenseKeyService.updateLicenseKeyActive(
			jsonObject.optBoolean("active"), licenseKeyId);
	}

	@PostMapping("/generate")
	public ResponseEntity<String> postLicenseKeysGenerate(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String projectExternalReferenceCode = jsonObject.optString(
			"projectExternalReferenceCode");

		Project project = _environmentActivationPermission.check(
			jwt, projectExternalReferenceCode);

		if (project == null) {
			throw new ProjectNotFoundException(projectExternalReferenceCode);
		}

		List<Long> renewedLicenseKeyIds = _toLongs(
			jsonObject.optJSONArray("renewedLicenseKeyIds"));

		_checkRenewedLicenseKeys(jwt, project, renewedLicenseKeyIds);

		List<Long> licenseKeyIds =
			_licenseKeyGenerationService.generateLicenseKeys(
				new LicenseKeyGenerationService.GenerateRequest(
					_toLongs(jsonObject.optJSONArray("bundleEntitlementIds")),
					jsonObject.optString("dataCenterLocation"),
					jsonObject.optString("description"),
					jsonObject.optString("environmentName"),
					jsonObject.optString("keyType"), project,
					renewedLicenseKeyIds,
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
				"licenseKeyIds", new JSONArray(licenseKeyIds)
			).toString()
		);
	}

	@PostMapping("/type-free")
	public LicenseKey postLicenseKeysTypeFree(@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String domains = jsonObject.optString("domains");
		long orderId = jsonObject.optLong("orderId");
		String owner = jsonObject.optString("owner");

		if (_licenseKeyService.hasValidLicenseKeyTypeFree(domains, owner)) {
			throw new ResponseStatusException(
				HttpStatus.CONFLICT,
				"A license key was already provisioned for the owner with " +
					"this domain");
		}

		Order order = _commerceOrderService.getCommerceOrder(orderId);

		Account account = order.getAccount();

		LicenseKey licenseKey = _licenseKeyService.addLicenseKeyTypeFree(
			account.getId(), domains, String.valueOf(orderId), owner);

		Integer orderStatus = order.getOrderStatus();

		if ((orderStatus == null) ||
			(orderStatus != CommerceOrderConstants.ORDER_STATUS_COMPLETED)) {

			_commerceOrderService.completeOrder(
				order.getId(),
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
		}

		return licenseKey;
	}

	@PostMapping("/type-free-domains-check")
	public void postLicenseKeysTypeFreeDomainsCheck(@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		if (_licenseKeyService.hasValidLicenseKeyTypeFree(
				jsonObject.optString("domains"),
				jsonObject.optString("owner"))) {

			throw new ResponseStatusException(
				HttpStatus.CONFLICT,
				"A license key was already provisioned for the owner with " +
					"this domain");
		}
	}

	@PutMapping("/subscriptions")
	public void putSubscriptions(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseKeyIds") long[] licenseKeyIds)
		throws Exception {

		UserAccount userAccount = getMyUserAccount(jwt);

		for (long licenseKeyId : licenseKeyIds) {
			LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
				jwt, licenseKeyId);

			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);
		}

		for (long licenseKeyId : licenseKeyIds) {
			_subscriptionEntryService.addSubscriptionEntry(
				jwt, ClassNameConstants.LICENSE_KEY, licenseKeyId,
				userAccount.getId());
		}
	}

	private void _checkAllFound(
			List<LicenseKey> licenseKeys, long[] licenseKeyIds)
		throws Exception {

		if (licenseKeys.size() < licenseKeyIds.length) {
			throw new NoSuchLicenseKeyException(
				"Unable to find every license key in " +
					Arrays.toString(licenseKeyIds));
		}
	}

	private void _checkLicenseKeyIds(long[] licenseKeyIds) {
		if (licenseKeyIds.length == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		if (licenseKeyIds.length > _MAX_LICENSE_KEY_IDS) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"No more than " + _MAX_LICENSE_KEY_IDS +
					" license keys may be requested at once");
		}
	}

	private void _checkRenewedLicenseKeys(
			Jwt jwt, Project project, List<Long> renewedLicenseKeyIds)
		throws Exception {

		for (long renewedLicenseKeyId : renewedLicenseKeyIds) {
			LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
				jwt, renewedLicenseKeyId);

			if (!Objects.equals(
					project.getExternalReferenceCode(),
					licenseKey.getProjectExternalReferenceCode())) {

				throw new PrincipalException();
			}
		}
	}

	private List<LicenseKey> _getActiveLicenseKeys(
			Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		List<LicenseKey> licenseKeys = new ArrayList<>();

		UserAccount userAccount = getMyUserAccount(jwt);

		for (LicenseKey licenseKey : _getLicenseKeys(jwt, licenseKeyIds)) {
			_licenseKeyPermission.check(
				userAccount, licenseKey.getAccountEntryId(), ActionKeys.VIEW);

			if (!licenseKey.isActive()) {
				continue;
			}

			licenseKeys.add(licenseKey);
		}

		return licenseKeys;
	}

	private List<LicenseKey> _getLicenseKeys(Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		long[] distinctLicenseKeyIds = _toDistinctLicenseKeyIds(licenseKeyIds);

		List<LicenseKey> licenseKeys = _licenseKeyService.getLicenseKeysByIds(
			jwt, distinctLicenseKeyIds);

		_checkAllFound(licenseKeys, distinctLicenseKeyIds);

		return licenseKeys;
	}

	private long[] _toDistinctLicenseKeyIds(long[] licenseKeyIds) {
		Set<Long> distinctLicenseKeyIds = new LinkedHashSet<>();

		for (long licenseKeyId : licenseKeyIds) {
			distinctLicenseKeyIds.add(licenseKeyId);
		}

		long[] longs = new long[distinctLicenseKeyIds.size()];

		int i = 0;

		for (long licenseKeyId : distinctLicenseKeyIds) {
			longs[i++] = licenseKeyId;
		}

		return longs;
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

	private static final MediaType _CONTENT_TYPE_CSV = MediaType.parseMediaType(
		"text/csv");

	private static final int _MAX_LICENSE_KEY_IDS = 100;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EnvironmentActivationPermission _environmentActivationPermission;

	@Autowired
	private LicenseKeyCSVExporter _licenseKeyCSVExporter;

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