/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.permission.TrialLicenseKeyPermission;
import com.liferay.one.service.TrialLicenseKeyService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.concurrent.TimeUnit;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Amos Fong
 */
@RequestMapping("/trial-license-keys")
@RestController
public class TrialLicenseKeysRestController extends OneBaseRestController {

	@GetMapping("/cms")
	public ResponseEntity<String> getTrialLicenseKeysCMS(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseLifetime") long licenseLifetime,
			@RequestParam("owner") String owner,
			@RequestParam("startDate") long startDate)
		throws Exception {

		_trialLicenseKeyPermission.check(jwt);

		owner = _validate(licenseLifetime, owner);

		_logTrialLicenseKey(jwt, owner, "CMS");

		return _toResponseEntity(
			_trialLicenseKeyService.getCMSTrialLicenseKeyXML(
				licenseLifetime, owner, startDate));
	}

	@GetMapping("/dxp")
	public ResponseEntity<String> getTrialLicenseKeysDXP(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam("licenseLifetime") long licenseLifetime,
			@RequestParam("owner") String owner,
			@RequestParam("startDate") long startDate)
		throws Exception {

		_trialLicenseKeyPermission.check(jwt);

		owner = _validate(licenseLifetime, owner);

		_logTrialLicenseKey(jwt, owner, "DXP");

		return _toResponseEntity(
			_trialLicenseKeyService.getDXPTrialLicenseKeyXML(
				licenseLifetime, owner, startDate));
	}

	private void _logTrialLicenseKey(
		Jwt jwt, String owner, String productName) {

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Generating a ", productName, " trial license key for ",
					owner, " for client ", jwt.getClaimAsString("client_id")));
		}
	}

	private ResponseEntity<String> _toResponseEntity(String xml) {
		return ResponseEntity.ok(
		).contentType(
			MediaType.APPLICATION_XML
		).body(
			xml
		);
	}

	private String _validate(long licenseLifetime, String owner) {
		if ((licenseLifetime <= 0) ||
			(licenseLifetime > _MAX_LICENSE_LIFETIME)) {

			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST,
				"The license lifetime must be more than 0 and not more than " +
					_MAX_LICENSE_LIFETIME + " milliseconds");
		}

		if (Validator.isNull(owner)) {
			throw new ResponseStatusException(
				HttpStatus.BAD_REQUEST, "The owner is required");
		}

		return owner.trim();
	}

	private static final long _MAX_LICENSE_LIFETIME = TimeUnit.DAYS.toMillis(
		365);

	private static final Log _log = LogFactory.getLog(
		TrialLicenseKeysRestController.class);

	@Autowired
	private TrialLicenseKeyPermission _trialLicenseKeyPermission;

	@Autowired
	private TrialLicenseKeyService _trialLicenseKeyService;

}