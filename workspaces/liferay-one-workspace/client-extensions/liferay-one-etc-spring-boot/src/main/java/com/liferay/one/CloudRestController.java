/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.model.Environment;
import com.liferay.one.service.CloudNativeManifestService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceProductVirtualSettingsService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.util.CloudNativeSignatureValidator;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.io.InputStream;

import java.net.http.HttpResponse;

import java.util.Collections;
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
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/**
 * @author Kyle Bischof
 * @author Amos Fong
 */
@RequestMapping("/cloud")
@RestController
public class CloudRestController extends OneBaseRestController {

	@ExceptionHandler(CloudNativeEntitlementException.class)
	public ResponseEntity<?> handleException(
		CloudNativeEntitlementException cloudNativeEntitlementException) {

		_log.error(cloudNativeEntitlementException);

		return new ResponseEntity<>(
			cloudNativeEntitlementException.getMessage(),
			HttpStatus.INTERNAL_SERVER_ERROR);
	}

	@PostMapping("/environments/{environmentId}/activation")
	public ResponseEntity<Void> postEnvironmentsActivation(
			@PathVariable String environmentId,
			@RequestHeader(name = _HEADER_ACTIVATION_CODE, required = false)
				String activationCodeHeader,
			@RequestBody String body)
		throws Exception {

		Environment activatedEnvironment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId);

		if (activatedEnvironment != null) {
			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}

		SignedJWT signedJWT = SignedJWT.parse(body);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		String publicKey = jwtClaimsSet.getStringClaim("publicKey");

		String activationCode = activationCodeHeader;
		String activationMode = EnvironmentConstants.ACTIVATION_MODE_OFFLINE;

		if (Validator.isNull(activationCode)) {
			activationCode = jwtClaimsSet.getStringClaim("activationCode");
			activationMode = EnvironmentConstants.ACTIVATION_MODE_HEARTBEAT;
		}

		_cloudNativeSignatureValidator.validateSignature(publicKey, signedJWT);

		Environment environment = _environmentService.fetchEnvironment(
			StringBundler.concat(
				"(activationCode eq '", activationCode, "') and (type eq '",
				EnvironmentConstants.TYPE_CNE, "')"));

		if (environment == null) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		if (Objects.equals(
				environment.getActivationStatus(),
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE)) {

			return new ResponseEntity<>(HttpStatus.CONFLICT);
		}

		_environmentService.updateEnvironmentActivation(
			activationMode, jwtClaimsSet.getStringClaim("environmentName"),
			environmentId, environment.getId(), publicKey);

		if (_log.isInfoEnabled()) {
			_log.info("Activating environment " + environmentId);
		}

		return new ResponseEntity<>(HttpStatus.OK);
	}

	@PostMapping("/environments/{environmentId}/manifest")
	public ResponseEntity<String> postEnvironmentsManifest(
			@PathVariable String environmentId, @RequestBody String body)
		throws Exception {

		Environment environment = _getEnvironment(body, environmentId);

		if (_log.isInfoEnabled()) {
			_log.info(
				"Retrieving entitlements for environment " + environmentId);
		}

		JSONObject jsonObject =
			_cloudNativeManifestService.getManifestJSONObject(
				_getDXPVersion(body), environment);

		return ResponseEntity.ok(jsonObject.toString());
	}

	@PostMapping("/environments/{environmentId}/manifest/add-on")
	public ResponseEntity<String> postEnvironmentsManifestAddOn(
			@PathVariable String environmentId, @RequestBody String body)
		throws Exception {

		Environment environment = _getEnvironment(body, environmentId);

		JSONArray jsonArray = _cloudNativeManifestService.getAddOnsJSONArray(
			_getDXPVersion(body), environment);

		JSONObject jsonObject = new JSONObject(
		).put(
			"add-ons", jsonArray
		);

		return ResponseEntity.ok(jsonObject.toString());
	}

	@PostMapping(
		"/products/{externalReferenceCode}/virtual-entry/{virtualEntryId}/download"
	)
	public ResponseEntity<StreamingResponseBody>
			postProductsVirtualEntryDownload(
				@PathVariable String externalReferenceCode,
				@PathVariable long virtualEntryId, @RequestBody String body)
		throws Exception {

		Product product = _commerceProductService.fetchProduct(
			externalReferenceCode);

		if (product == null) {
			throw new ResponseStatusException(
				HttpStatus.NOT_FOUND, "The product was not found");
		}

		if (!_hasAddOn(product, body)) {
			throw new ResponseStatusException(
				HttpStatus.FORBIDDEN,
				"The environment is not entitled to the product");
		}

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					product.getProductId(), virtualEntryId);

		if (productVirtualSettingsFileEntry == null) {
			throw new ResponseStatusException(
				HttpStatus.NOT_FOUND,
				"The product virtual settings file entry was not found");
		}

		HttpResponse<InputStream> httpResponse =
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				productVirtualSettingsFileEntry.getSrc());

		HttpHeaders httpHeaders = new HttpHeaders();

		httpHeaders.setAccessControlExposeHeaders(
			Collections.singletonList(HttpHeaders.CONTENT_DISPOSITION));
		httpHeaders.setContentDispositionFormData(
			"attachment", _getFileName(productVirtualSettingsFileEntry));
		httpHeaders.setContentType(
			_getMediaType(
				httpResponse.headers(
				).allValues(
					HttpHeaders.CONTENT_TYPE
				)));

		return new ResponseEntity<>(
			outputStream -> {
				try (InputStream inputStream = httpResponse.body()) {
					inputStream.transferTo(outputStream);
				}
			},
			httpHeaders, HttpStatus.OK);
	}

	private String _getDXPVersion(String body) throws Exception {
		SignedJWT signedJWT = SignedJWT.parse(body);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		return jwtClaimsSet.getStringClaim("dxpVersion");
	}

	private Environment _getEnvironment(String body, String environmentId)
		throws Exception {

		Environment environment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId);

		if (environment == null) {
			throw new ResponseStatusException(
				HttpStatus.NOT_FOUND, "The environment was not found");
		}

		_cloudNativeSignatureValidator.validateSignature(
			environment.getPublicKey(), SignedJWT.parse(body));

		return environment;
	}

	private String _getFileName(
		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry) {

		String src = productVirtualSettingsFileEntry.getSrc();

		if (Validator.isNull(src)) {
			return "package.lpkg";
		}

		return src.substring(src.lastIndexOf('/') + 1);
	}

	private MediaType _getMediaType(List<String> contentTypes) {
		if (contentTypes.isEmpty()) {
			return MediaType.APPLICATION_OCTET_STREAM;
		}

		return MediaType.parseMediaType(contentTypes.get(0));
	}

	private boolean _hasAddOn(Product product, String body) throws Exception {
		SignedJWT signedJWT = SignedJWT.parse(body);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		Environment environment = _getEnvironment(
			body, jwtClaimsSet.getStringClaim("environmentId"));

		String externalReferenceCode = product.getExternalReferenceCode();

		JSONArray addOnsJSONArray =
			_cloudNativeManifestService.getAddOnsJSONArray(null, environment);

		for (int i = 0; i < addOnsJSONArray.length(); i++) {
			JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(i);

			if (Objects.equals(
					addOnJSONObject.getString("productId"),
					externalReferenceCode)) {

				return true;
			}
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Environment ", environment.getExternalReferenceCode(),
					" is not entitled to product ", externalReferenceCode));
		}

		return false;
	}

	private static final String _HEADER_ACTIVATION_CODE = "Activation-Code";

	private static final Log _log = LogFactory.getLog(
		CloudRestController.class);

	@Autowired
	private CloudNativeManifestService _cloudNativeManifestService;

	@Autowired
	private CloudNativeSignatureValidator _cloudNativeSignatureValidator;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;

	@Autowired
	private EnvironmentService _environmentService;

}