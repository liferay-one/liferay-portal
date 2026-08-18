/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.AddOnsUnavailableException;
import com.liferay.one.model.Environment;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.service.OfflineActivationBundleService;
import com.liferay.one.util.CloudNativeSignatureValidator;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/**
 * @author Amos Fong
 */
@RequestMapping("/cloud-native-environments")
@RestController
public class CloudNativeEnvironmentsRestController
	extends OneBaseRestController {

	@PostMapping("/offline-activation")
	public ResponseEntity<String> postOfflineActivation(
			@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String activationCode = jsonObject.optString("activationCode");
		String token = jsonObject.optString(
			"token"
		).replaceAll(
			"\\s", ""
		);

		if (Validator.isNull(activationCode) || Validator.isNull(token)) {
			return new ResponseEntity<>(
				_ERROR_MISSING_PARAMETERS, HttpStatus.BAD_REQUEST);
		}

		Environment environment = _environmentService.fetchEnvironment(
			StringBundler.concat(
				"(activationCode eq '", activationCode, "') and (type eq '",
				EnvironmentConstants.TYPE_CNE, "')"));

		if (environment == null) {
			return new ResponseEntity<>(
				_ERROR_ACTIVATION_CODE_NOT_FOUND, HttpStatus.NOT_FOUND);
		}

		if (Objects.equals(
				environment.getActivationStatus(),
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE)) {

			return new ResponseEntity<>(
				_ERROR_ACTIVATION_CODE_USED, HttpStatus.CONFLICT);
		}

		SignedJWT signedJWT = null;

		try {
			signedJWT = SignedJWT.parse(token);
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to parse the offline activation token", exception);
			}

			return new ResponseEntity<>(
				_ERROR_INVALID_TOKEN, HttpStatus.BAD_REQUEST);
		}

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		String environmentId = jwtClaimsSet.getStringClaim("environmentId");
		String publicKey = jwtClaimsSet.getStringClaim("publicKey");

		if (Validator.isNull(environmentId) || Validator.isNull(publicKey)) {
			return new ResponseEntity<>(
				_ERROR_INVALID_TOKEN, HttpStatus.BAD_REQUEST);
		}

		try {
			_cloudNativeSignatureValidator.validateSignature(
				publicKey, signedJWT);
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to verify the offline activation token", exception);
			}

			return new ResponseEntity<>(
				_ERROR_INVALID_TOKEN, HttpStatus.BAD_REQUEST);
		}

		Environment activatedEnvironment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId);

		if (activatedEnvironment != null) {
			return new ResponseEntity<>(
				_ERROR_ENVIRONMENT_ALREADY_ACTIVATED, HttpStatus.CONFLICT);
		}

		_environmentService.updateEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_OFFLINE,
			jwtClaimsSet.getStringClaim("environmentName"), environmentId,
			environment.getId(), publicKey);

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Activated offline environment ", environmentId,
					" for activation code ", activationCode));
		}

		return new ResponseEntity<>(HttpStatus.OK);
	}

	@PostMapping("/offline-activation-bundle")
	public ResponseEntity<StreamingResponseBody> postOfflineActivationBundle(
			@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String dxpVersion = jsonObject.optString("dxpVersion");
		String environmentId = jsonObject.optString("environmentId");

		if (Validator.isNull(dxpVersion) || Validator.isNull(environmentId)) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Environment environment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId);

		if (environment == null) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		Path path = null;

		try {
			path = _offlineActivationBundleService.createBundle(
				dxpVersion, environment);
		}
		catch (AddOnsUnavailableException addOnsUnavailableException) {
			if (_log.isWarnEnabled()) {
				_log.warn(addOnsUnavailableException);
			}

			return _getErrorResponseEntity(
				_ERROR_ADD_ONS_UNAVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
		}

		HttpHeaders httpHeaders = new HttpHeaders();

		httpHeaders.setContentDisposition(
			ContentDisposition.attachment(
			).filename(
				StringBundler.concat(
					environmentId, "-", dxpVersion,
					"-offline-activation-bundle.zip")
			).build());
		httpHeaders.setContentLength(Files.size(path));
		httpHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);

		Path bundlePath = path;

		return new ResponseEntity<>(
			outputStream -> {
				try {
					Files.copy(bundlePath, outputStream);
				}
				finally {
					Files.deleteIfExists(bundlePath);
				}
			},
			httpHeaders, HttpStatus.OK);
	}

	private ResponseEntity<StreamingResponseBody> _getErrorResponseEntity(
		String error, HttpStatus httpStatus) {

		HttpHeaders httpHeaders = new HttpHeaders();

		httpHeaders.setContentType(MediaType.TEXT_PLAIN);

		return new ResponseEntity<>(
			outputStream -> outputStream.write(
				error.getBytes(StandardCharsets.UTF_8)),
			httpHeaders, httpStatus);
	}

	private static final String _ERROR_ACTIVATION_CODE_NOT_FOUND =
		"ACTIVATION_CODE_NOT_FOUND";

	private static final String _ERROR_ACTIVATION_CODE_USED =
		"ACTIVATION_CODE_USED";

	private static final String _ERROR_ADD_ONS_UNAVAILABLE =
		"ADD_ONS_UNAVAILABLE";

	private static final String _ERROR_ENVIRONMENT_ALREADY_ACTIVATED =
		"ENVIRONMENT_ALREADY_ACTIVATED";

	private static final String _ERROR_INVALID_TOKEN = "INVALID_TOKEN";

	private static final String _ERROR_MISSING_PARAMETERS =
		"MISSING_PARAMETERS";

	private static final Log _log = LogFactory.getLog(
		CloudNativeEnvironmentsRestController.class);

	@Autowired
	private CloudNativeSignatureValidator _cloudNativeSignatureValidator;

	@Autowired
	private EnvironmentService _environmentService;

	@Autowired
	private OfflineActivationBundleService _offlineActivationBundleService;

}