/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.LicenseKey;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private LicenseKeyService _licenseKeyService;

}