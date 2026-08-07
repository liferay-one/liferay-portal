/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.Date;
import java.util.List;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Allen Ziegenfus
 */
@RequestMapping("/app-license-keys")
@RestController
public class AppLicenseKeysRestController extends OneBaseRestController {

	@GetMapping("/{appLicenseKeyId}")
	public LicenseKey getAppLicenseKey(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("appLicenseKeyId") long appLicenseKeyId)
		throws Exception {

		_adminPermission.check(jwt);

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			appLicenseKeyId);

		if (!_isApp(licenseKey)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		return licenseKey;
	}

	@GetMapping
	public List<LicenseKey> getAppLicenseKeys(@AuthenticationPrincipal Jwt jwt)
		throws Exception {

		_adminPermission.check(jwt);

		return _licenseKeyService.getLicenseKeys(
			StringBundler.concat(
				"productExternalId ne '", LicenseConstants.PRODUCT_ID_PORTAL,
				"'"));
	}

	@GetMapping("/{appLicenseKeyId}/download")
	public ResponseEntity<String> getAppLicenseKeysDownload(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable("appLicenseKeyId") long appLicenseKeyId)
		throws Exception {

		_adminPermission.check(jwt);

		LicenseKey licenseKey = _licenseKeyService.getLicenseKey(
			appLicenseKeyId);

		if (!_isApp(licenseKey)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		}

		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_XML
		).header(
			HttpHeaders.CONTENT_DISPOSITION,
			"attachment; filename=\"" +
				_licenseKeyService.getLicenseKeyDownloadFileName(licenseKey) +
					"\""
		).body(
			_licenseKeyService.getLicenseKeyDownloadXML(licenseKey)
		);
	}

	@PostMapping
	public LicenseKey postAppLicenseKey(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		_adminPermission.check(jwt);

		JSONObject jsonObject = new JSONObject(json);

		long entitlementId = jsonObject.getLong("entitlementId");

		Entitlement entitlement = _entitlementService.getEntitlement(
			entitlementId);

		String owner = jsonObject.optString("owner");

		String description = jsonObject.optString("description");

		if (Validator.isNull(description)) {
			description = owner;
		}

		String productName = jsonObject.optString("productName");

		return _licenseKeyService.addLicenseKey(
			entitlement.getAccountEntryId(), StringPool.BLANK, true,
			StringPool.BLANK, false, description, StringPool.BLANK,
			entitlementId,
			Date.from(Instant.parse(jsonObject.getString("expirationDate"))),
			jsonObject.optString("hostName"),
			jsonObject.optString("ipAddresses"), StringPool.BLANK,
			jsonObject.optString("licenseType"), _LICENSE_VERSION,
			jsonObject.optString("macAddresses"), 0, 0L, 0, 0, 0L, productName,
			jsonObject.optString("orderId"), owner,
			jsonObject.optString("productExternalId"), productName,
			jsonObject.optString("productVersion"), StringPool.BLANK,
			StringPool.BLANK,
			Date.from(Instant.parse(jsonObject.getString("startDate"))));
	}

	@PutMapping("/activate")
	public void putAppLicenseKeysActivate(
			@AuthenticationPrincipal Jwt jwt,
			@RequestBody long[] appLicenseKeyIds)
		throws Exception {

		_adminPermission.check(jwt);

		for (long appLicenseKeyId : appLicenseKeyIds) {
			_licenseKeyService.updateLicenseKeyActive(true, appLicenseKeyId);
		}
	}

	@PutMapping("/deactivate")
	public void putAppLicenseKeysDeactivate(
			@AuthenticationPrincipal Jwt jwt,
			@RequestBody long[] appLicenseKeyIds)
		throws Exception {

		_adminPermission.check(jwt);

		for (long appLicenseKeyId : appLicenseKeyIds) {
			_licenseKeyService.updateLicenseKeyActive(false, appLicenseKeyId);
		}
	}

	private boolean _isApp(LicenseKey licenseKey) {
		return !StringUtil.equals(
			licenseKey.getProductExternalId(),
			LicenseConstants.PRODUCT_ID_PORTAL);
	}

	private static final int _LICENSE_VERSION = 3;

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private LicenseKeyService _licenseKeyService;

}