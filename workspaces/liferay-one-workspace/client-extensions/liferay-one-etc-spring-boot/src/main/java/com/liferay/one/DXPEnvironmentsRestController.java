/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.constants.ProductVersion;
import com.liferay.one.exception.ExpiredActivationTokenException;
import com.liferay.one.exception.InvalidSignatureException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Environment;
import com.liferay.one.model.EnvironmentQuota;
import com.liferay.one.model.Project;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceProductVirtualSettingsService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.EnvironmentQuotaService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.util.ActivationCodeUtil;
import com.liferay.one.util.ClusterNodesUtil;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.JWTSignatureValidator;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.function.transform.TransformUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Time;
import com.liferay.portal.kernel.util.Validator;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.io.InputStream;

import java.net.http.HttpResponse;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

import java.text.ParseException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * @author Amos Fong
 */
@RestController
public class DXPEnvironmentsRestController extends OneBaseRestController {

	@GetMapping("/projects/{projectExternalReferenceCode}/dxp/activation-codes")
	public ResponseEntity<String> getProjectsDXPActivationCodes(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String projectExternalReferenceCode)
		throws Exception {

		_checkProject(jwt, projectExternalReferenceCode);

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode);

		JSONArray jsonArray = new JSONArray();

		for (EnvironmentQuota environmentQuota :
				_environmentQuotaService.getDXPEnvironmentQuotas(
					projectExternalReferenceCode)) {

			JSONArray activationCodesJSONArray = new JSONArray();

			for (Environment environment : environmentQuota.getEnvironments()) {
				JSONObject activationCodeJSONObject =
					_toActivationCodeJSONObject(environment);

				if (_adminPermission.contains(jwt)) {
					activationCodeJSONObject.put(
						"lastHeartbeatAt",
						Objects.toString(
							environment.getLastHeartbeatAtInstant(), null)
					).put(
						"productVersion", environment.getProductVersion()
					);
				}

				activationCodesJSONArray.put(activationCodeJSONObject);
			}

			JSONObject environmentTypeJSONObject = new JSONObject(
			).put(
				"activationCodes", activationCodesJSONArray
			).put(
				"availableCount", environmentQuota.getAvailableCount()
			).put(
				"maxClusterNodes", environmentQuota.getMaxClusterNodes()
			).put(
				"totalCount", environmentQuota.getTotalCount()
			).put(
				"type", environmentQuota.getType()
			).put(
				"unlimited", environmentQuota.isUnlimited()
			).put(
				"usedCount", environmentQuota.getUsedCount()
			);

			Entitlement dxpEntitlement = _getDXPEntitlement(
				entitlements, environmentQuota.getType());

			if (dxpEntitlement != null) {
				environmentTypeJSONObject.put(
					"endDate",
					Objects.toString(
						dxpEntitlement.getEffectiveEndDateInstant(), null)
				).put(
					"startDate",
					Objects.toString(dxpEntitlement.getStartDateInstant(), null)
				);
			}

			jsonArray.put(environmentTypeJSONObject);
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"environmentTypes", jsonArray
		);

		return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
	}

	@ExceptionHandler(ParseException.class)
	public ResponseEntity<?> handleException(ParseException parseException) {
		if (_log.isWarnEnabled()) {
			_log.warn("Unable to parse the signed JWT", parseException);
		}

		return _toResponseEntity(
			HttpStatus.BAD_REQUEST, "Unable to parse the signed JWT");
	}

	@ExceptionHandler(
		{ExpiredActivationTokenException.class, InvalidSignatureException.class}
	)
	public ResponseEntity<?> handleException(
		PrincipalException principalException) {

		return _toResponseEntity(
			HttpStatus.UNAUTHORIZED, principalException.getMessage(),
			principalException);
	}

	@PatchMapping(
		"/projects/{projectExternalReferenceCode}/dxp/environments" +
			"/{environmentExternalReferenceCode}/active"
	)
	public ResponseEntity<?> patchProjectsDXPEnvironmentsActive(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String environmentExternalReferenceCode,
			@PathVariable String projectExternalReferenceCode,
			@RequestBody String json)
		throws Exception {

		_checkProject(jwt, projectExternalReferenceCode);

		if (getRequiredBoolean(new JSONObject(json), "active")) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"A deactivated DXP environment cannot be reactivated");
		}

		Environment environment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentExternalReferenceCode);

		if ((environment == null) ||
			!Objects.equals(
				EnvironmentConstants.OFFERING_DXP, environment.getOffering()) ||
			!Objects.equals(
				projectExternalReferenceCode,
				environment.getProjectExternalReferenceCode())) {

			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The DXP environment was not found");
		}

		return _keyedLock.withLock(
			_getActivationCodeLockKey(environment.getActivationCode()),
			() -> _deactivate(environmentExternalReferenceCode));
	}

	@PostMapping("/dxp/installations/{installationId}/activation")
	public ResponseEntity<?> postDXPInstallationsActivation(
			@PathVariable String installationId, @RequestBody String body)
		throws Exception {

		SignedJWT signedJWT = SignedJWT.parse(body);

		_jwtSignatureValidator.validateSignature(signedJWT);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		if (!_isSignedInstallationId(installationId, jwtClaimsSet)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"The installation ID does not match the signed installation " +
					"ID");
		}

		String activationCode = jwtClaimsSet.getStringClaim("activationCode");

		if (Validator.isNull(activationCode)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST, "The activation code is required");
		}

		String publicKey = jwtClaimsSet.getStringClaim("publicKey");

		return _keyedLock.withLock(
			_getActivationCodeLockKey(activationCode),
			() -> _activateOnline(activationCode, installationId, publicKey));
	}

	@PostMapping("/dxp/installations/{installationId}/manifest")
	public ResponseEntity<?> postDXPInstallationsManifest(
			@PathVariable String installationId, @RequestBody String body)
		throws Exception {

		SignedJWT signedJWT = SignedJWT.parse(body);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		if (!_isSignedInstallationId(installationId, jwtClaimsSet)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"The installation ID does not match the signed installation " +
					"ID");
		}

		String dxpVersion = jwtClaimsSet.getStringClaim("dxpVersion");

		if (!_isEntitlementVersion(dxpVersion)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"DXP version " + dxpVersion + " is not supported");
		}

		Environment environment = _getSigningEnvironment(
			installationId, signedJWT);

		if (environment == null) {
			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The installation is not activated");
		}

		_updateCheckIn(dxpVersion, environment);

		if (_isDeactivated(environment)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Serving a terminated manifest to deactivated ",
						"environment ",
						environment.getExternalReferenceCode()));
			}

			JSONObject jsonObject = _getInactiveManifestJSONObject().put(
				"dxpTerminationStatus",
				EntitlementConstants.TERMINATION_STATUS_TERMINATED);

			return ResponseEntity.ok(jsonObject.toString());
		}

		JSONObject manifestJSONObject = _getManifestJSONObject(
			dxpVersion, environment);

		if (manifestJSONObject == null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Serving an inactive manifest to environment ",
						environment.getExternalReferenceCode(),
						" without an active DXP entitlement"));
			}

			return ResponseEntity.ok(
				_getInactiveManifestJSONObject().toString());
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Serving the manifest of DXP ", dxpVersion,
					" to environment ",
					environment.getExternalReferenceCode()));
		}

		return ResponseEntity.ok(manifestJSONObject.toString());
	}

	@PostMapping(
		"/dxp/products/{externalReferenceCode}/virtual-entry/{virtualEntryId}/download"
	)
	public ResponseEntity<?> postDXPProductsVirtualEntryDownload(
			@PathVariable String externalReferenceCode,
			@PathVariable long virtualEntryId, @RequestBody String body)
		throws Exception {

		SignedJWT signedJWT = SignedJWT.parse(body);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		Environment environment = _getSigningEnvironment(
			jwtClaimsSet.getStringClaim("installationId"), signedJWT);

		if (environment == null) {
			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The installation is not activated");
		}

		Product product = _commerceProductService.fetchProduct(
			externalReferenceCode);

		if (product == null) {
			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The product was not found");
		}

		if (!_hasAddOn(environment, product)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Environment ", environment.getExternalReferenceCode(),
						" is not entitled to product ", externalReferenceCode));
			}

			return _toResponseEntity(
				HttpStatus.FORBIDDEN,
				"The installation is not entitled to the product");
		}

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					product.getProductId(), virtualEntryId);

		if (productVirtualSettingsFileEntry == null) {
			return _toResponseEntity(
				HttpStatus.NOT_FOUND,
				"The product virtual settings file entry was not found");
		}

		HttpResponse<InputStream> httpResponse =
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				productVirtualSettingsFileEntry.getSrc());

		HttpHeaders httpHeaders = new HttpHeaders();

		httpHeaders.setContentDispositionFormData(
			"attachment", externalReferenceCode + ".lpkg");
		httpHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);

		return new ResponseEntity<>(
			new InputStreamResource(httpResponse.body()), httpHeaders,
			HttpStatus.OK);
	}

	@PostMapping(
		"/projects/{projectExternalReferenceCode}/dxp/activation-codes"
	)
	public ResponseEntity<?> postProjectsDXPActivationCodes(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String projectExternalReferenceCode,
			@RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String type = jsonObject.optString("type");

		if (!EnvironmentConstants.dxpTypes.contains(type)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"The environment type is not recognized");
		}

		Project project = _checkProject(jwt, projectExternalReferenceCode);

		Environment environment = _keyedLock.withLock(
			StringBundler.concat(
				projectExternalReferenceCode, StringPool.POUND,
				EnvironmentConstants.OFFERING_DXP, StringPool.POUND, type),
			() -> {
				EnvironmentQuota environmentQuota =
					_environmentQuotaService.getDXPEnvironmentQuota(
						projectExternalReferenceCode, type);

				if (!environmentQuota.isAvailable()) {
					return null;
				}

				return _environmentService.addDXPEnvironment(
					project.getAccountId(), ActivationCodeUtil.generate(),
					projectExternalReferenceCode, type);
			});

		if (environment == null) {
			return _toResponseEntity(
				HttpStatus.UNPROCESSABLE_ENTITY,
				StringBundler.concat(
					"Project ", projectExternalReferenceCode, " has no ", type,
					" DXP installation left to activate"));
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Generated a ", type, " DXP activation code for project ",
					projectExternalReferenceCode));
		}

		JSONObject activationCodeJSONObject = _toActivationCodeJSONObject(
			environment);

		activationCodeJSONObject.put("type", environment.getType());

		return new ResponseEntity<>(
			activationCodeJSONObject.toString(), HttpStatus.OK);
	}

	@PostMapping(
		"/projects/{projectExternalReferenceCode}/dxp/offline-activation-bundle"
	)
	public ResponseEntity<?> postProjectsDXPOfflineActivationBundle(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String projectExternalReferenceCode,
			@RequestBody String json)
		throws Exception {

		_checkProject(jwt, projectExternalReferenceCode);

		JSONObject jsonObject = new JSONObject(json);

		String activationCode = jsonObject.optString(
			"activationCode"
		).trim();
		String activationToken = jsonObject.optString(
			"activationToken"
		).replaceAll(
			"\\s", ""
		);

		if (Validator.isNull(activationCode) ||
			Validator.isNull(activationToken)) {

			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"The activation code and the activation token are required");
		}

		String dxpVersion = jsonObject.optString("dxpVersion");

		if (!_isEntitlementVersion(dxpVersion)) {
			return _toResponseEntity(
				HttpStatus.BAD_REQUEST,
				"DXP version " + dxpVersion + " is not supported");
		}

		SignedJWT signedJWT = null;

		try {
			signedJWT = SignedJWT.parse(activationToken);
		}
		catch (ParseException parseException) {
			if (_log.isDebugEnabled()) {
				_log.debug(parseException);
			}

			throw new InvalidSignatureException(
				"The activation token is not valid");
		}

		_jwtSignatureValidator.validateOfflineSignature(signedJWT);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		String installationId = jwtClaimsSet.getStringClaim("installationId");
		String publicKey = jwtClaimsSet.getStringClaim("publicKey");

		if (!_isInstallationPublicKey(installationId, publicKey)) {
			throw new InvalidSignatureException(
				"The installation ID does not match the public key");
		}

		return _keyedLock.withLock(
			_getActivationCodeLockKey(activationCode),
			() -> _activateOffline(
				activationCode, dxpVersion, installationId,
				projectExternalReferenceCode, publicKey));
	}

	private ResponseEntity<?> _activateOffline(
			String activationCode, String dxpVersion, String installationId,
			String projectExternalReferenceCode, String publicKey)
		throws Exception {

		Environment environment =
			_environmentService.fetchDXPEnvironmentByActivationCode(
				activationCode);

		if ((environment == null) ||
			!Objects.equals(
				projectExternalReferenceCode,
				environment.getProjectExternalReferenceCode())) {

			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The activation code was not found");
		}

		if (_isDeactivated(environment)) {
			return _toResponseEntity(
				HttpStatus.CONFLICT, "The activation code is deactivated");
		}

		boolean pending = Objects.equals(
			environment.getActivationStatus(),
			EnvironmentConstants.ACTIVATION_STATUS_PENDING);

		if (!pending &&
			!_isActivatedOffline(environment, installationId, publicKey)) {

			return _toResponseEntity(
				HttpStatus.CONFLICT, "The activation code is already used");
		}

		if (pending && _isActivated(installationId, publicKey)) {
			return _toResponseEntity(
				HttpStatus.CONFLICT,
				"The installation is already activated with another " +
					"activation code");
		}

		JSONObject manifestJSONObject = _getManifestJSONObject(
			dxpVersion, environment, installationId);

		if (manifestJSONObject == null) {
			return _toResponseEntity(
				HttpStatus.FORBIDDEN,
				"The project does not have an active DXP entitlement");
		}

		Path path = _createOfflineActivationBundle(manifestJSONObject);

		try {
			if (pending) {
				_environmentService.updateDXPEnvironmentActivation(
					EnvironmentConstants.ACTIVATION_MODE_OFFLINE,
					environment.getId(), installationId, publicKey);

				if (_log.isInfoEnabled()) {
					_log.info(
						StringBundler.concat(
							"Activated offline DXP environment ",
							environment.getExternalReferenceCode(),
							" with installation ID ", installationId,
							" for project ", projectExternalReferenceCode));
				}
			}
		}
		catch (Exception exception) {
			Files.deleteIfExists(path);

			throw exception;
		}

		HttpHeaders httpHeaders = new HttpHeaders();

		httpHeaders.setContentDisposition(
			ContentDisposition.attachment(
			).filename(
				StringBundler.concat(
					installationId, "-",
					ProductVersion.extractQuarterlyPatchRelease(dxpVersion),
					"-activation.zip")
			).build());
		httpHeaders.setContentLength(Files.size(path));
		httpHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);

		return new ResponseEntity<>(
			new InputStreamResource(
				Files.newInputStream(path, StandardOpenOption.DELETE_ON_CLOSE)),
			httpHeaders, HttpStatus.OK);
	}

	private ResponseEntity<?> _activateOnline(
			String activationCode, String installationId, String publicKey)
		throws Exception {

		Environment environment =
			_environmentService.fetchDXPEnvironmentByActivationCode(
				activationCode);

		if (environment == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"No DXP environment exists for activation code ",
						activationCode, " requested by installation ",
						installationId));
			}

			return _toResponseEntity(
				HttpStatus.NOT_FOUND, "The activation code was not found");
		}

		if (_isDeactivated(environment)) {
			return _toResponseEntity(
				HttpStatus.CONFLICT, "The activation code is deactivated");
		}

		if (!Objects.equals(
				environment.getActivationStatus(),
				EnvironmentConstants.ACTIVATION_STATUS_PENDING)) {

			if (_isActivatedOnline(environment, installationId, publicKey)) {
				if (_log.isInfoEnabled()) {
					_log.info(
						StringBundler.concat(
							"DXP environment ",
							environment.getExternalReferenceCode(),
							" is already activated with the same installation ",
							"ID and public key"));
				}

				return new ResponseEntity<>(HttpStatus.OK);
			}

			return _toResponseEntity(
				HttpStatus.CONFLICT, "The activation code is already used");
		}

		for (Environment activatedEnvironment :
				_environmentService.getDXPEnvironmentsByInstallationId(
					EnvironmentConstants.ACTIVATION_MODE_ONLINE,
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
					installationId)) {

			if (JWTSignatureValidator.equalsPublicKey(
					activatedEnvironment.getPublicKey(), publicKey)) {

				return _toResponseEntity(
					HttpStatus.CONFLICT,
					"The installation is already activated with another " +
						"activation code");
			}
		}

		_environmentService.updateDXPEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_ONLINE, environment.getId(),
			installationId, publicKey);

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Activated online DXP environment ",
					environment.getExternalReferenceCode(),
					" with installation ID ", installationId, " for project ",
					environment.getProjectExternalReferenceCode()));
		}

		return new ResponseEntity<>(HttpStatus.OK);
	}

	private Project _checkProject(Jwt jwt, String projectExternalReferenceCode)
		throws Exception {

		Project project =
			_environmentActivationPermission.checkLicenseKeyActivation(
				jwt, projectExternalReferenceCode);

		if (project == null) {
			throw new PrincipalException();
		}

		return project;
	}

	private Path _createOfflineActivationBundle(JSONObject manifestJSONObject)
		throws Exception {

		Path path = Files.createTempFile("dxp-activation-", ".zip");

		try (ZipOutputStream zipOutputStream = new ZipOutputStream(
				Files.newOutputStream(path))) {

			zipOutputStream.putNextEntry(new ZipEntry("manifest.json"));

			zipOutputStream.write(
				manifestJSONObject.toString(
					2
				).getBytes(
					StandardCharsets.UTF_8
				));

			zipOutputStream.closeEntry();

			JSONArray addOnsJSONArray = manifestJSONObject.getJSONArray(
				"add-ons");

			for (int i = 0; i < addOnsJSONArray.length(); i++) {
				_writeAddOn(addOnsJSONArray.getJSONObject(i), zipOutputStream);
			}
		}
		catch (Exception exception) {
			Files.deleteIfExists(path);

			throw exception;
		}

		return path;
	}

	private ResponseEntity<?> _deactivate(
			String environmentExternalReferenceCode)
		throws Exception {

		Environment environment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentExternalReferenceCode);

		if (!_isDeactivated(environment)) {
			_environmentService.updateEnvironmentActivationStatus(
				EnvironmentConstants.ACTIVATION_STATUS_INACTIVE, null,
				environment.getId());

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Deactivated DXP environment ",
						environmentExternalReferenceCode,
						" with installation ID ",
						environment.getExternalEnvironmentId()));
			}
		}

		return new ResponseEntity<>(HttpStatus.NO_CONTENT);
	}

	private boolean _endsAfter(
		Entitlement entitlement1, Entitlement entitlement2) {

		Instant effectiveEndDateInstant2 =
			entitlement2.getEffectiveEndDateInstant();

		if (effectiveEndDateInstant2 == null) {
			return false;
		}

		Instant effectiveEndDateInstant1 =
			entitlement1.getEffectiveEndDateInstant();

		if (effectiveEndDateInstant1 == null) {
			return true;
		}

		return effectiveEndDateInstant1.isAfter(effectiveEndDateInstant2);
	}

	private Product _fetchProduct(Entitlement entitlement) throws Exception {
		Long productId = _commerceSkuService.fetchProductId(
			entitlement.getSkuExternalReferenceCode());

		if (productId == null) {
			return null;
		}

		return _commerceProductService.fetchProduct(productId);
	}

	private String _generateAppLicenseXML(
			String accountName, Date expirationDate, String productId,
			String productName, Date startDate)
		throws Exception {

		String description = productName + " DXP Installation";
		String licenseEntryType = LicenseConstants.TYPE_ENTERPRISE;
		int licenseVersion = LicenseVersion.getAppLicenseVersion();

		String key = _licenseKeyGenerator.generateKey(
			StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION,
			accountName, 0, 0, 0, 0, 0, StringPool.BLANK, description,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION,
			accountName, 0, 0, 0, 0, 0, StringPool.BLANK, description,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);
	}

	private String _generateDXPLicenseXML(
			String accountName, String environmentType, Date expirationDate,
			String installationId, int maxClusterNodes, String owner,
			String productVersion, String sizing, Date startDate)
		throws Exception {

		String productName = _productNames.get(environmentType);

		Map<String, String> properties = _licenseKeyGenerator.getProperties(
			accountName, productName, LicenseConstants.TYPE_PRODUCTION,
			LicenseVersion.getInstallationLicenseVersion(), productName,
			LicenseConstants.PRODUCT_ID_PORTAL, productVersion, owner,
			maxClusterNodes, 0, 0, 0, 0, sizing, "DXP Self-Hosted",
			StringPool.BLANK, StringPool.BLANK, installationId,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);

		return _licenseKeyExporter.toXML(
			_licenseKeyGenerator.encrypt(properties), properties);
	}

	private String _getActivationCodeLockKey(String activationCode) {
		return StringBundler.concat(
			EnvironmentConstants.OFFERING_DXP, StringPool.POUND,
			activationCode);
	}

	private List<Entitlement> _getActiveEntitlements(Environment environment)
		throws Exception {

		String projectExternalReferenceCode =
			environment.getProjectExternalReferenceCode();

		if (Validator.isNull(projectExternalReferenceCode)) {
			return Collections.emptyList();
		}

		return _entitlementService.getActiveEntitlements(
			projectExternalReferenceCode);
	}

	private List<AddOn> _getAddOns(List<Entitlement> entitlements)
		throws Exception {

		Map<String, AddOn> addOns = new LinkedHashMap<>();

		for (Entitlement entitlement : entitlements) {
			if (LicenseKeyGenerateFormService.isLeadingLicenseKeyFamily(
					entitlement.getLicenseKeyFamily())) {

				continue;
			}

			Product product = _fetchProduct(entitlement);

			if (product == null) {
				continue;
			}

			String productId = LicenseKeyGenerateFormService.getProductId(
				entitlement, product);

			if (Objects.equals(productId, LicenseConstants.PRODUCT_ID_PORTAL)) {
				continue;
			}

			AddOn addOn = addOns.get(product.getExternalReferenceCode());

			if ((addOn != null) &&
				(_getTerminationStatusRank(addOn._entitlement) <=
					_getTerminationStatusRank(entitlement))) {

				continue;
			}

			addOns.put(
				product.getExternalReferenceCode(),
				new AddOn(entitlement, product, productId));
		}

		return new ArrayList<>(addOns.values());
	}

	private JSONArray _getAddOnsJSONArray(
			List<AddOn> addOns, String dxpPatchProductVersion)
		throws Exception {

		JSONArray jsonArray = new JSONArray();

		for (AddOn addOn : addOns) {
			Product product = addOn._product;

			ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
				_commerceProductVirtualSettingsService.
					fetchProductVirtualSettingsFileEntry(
						product.getProductId(), dxpPatchProductVersion);

			if (productVirtualSettingsFileEntry == null) {
				if (_log.isWarnEnabled()) {
					_log.warn(
						StringBundler.concat(
							"No package of product ",
							product.getExternalReferenceCode(),
							" is available for DXP ", dxpPatchProductVersion));
				}

				continue;
			}

			jsonArray.put(
				new JSONObject(
				).put(
					"downloadURL",
					ServletUriComponentsBuilder.fromCurrentContextPath(
					).path(
						"/dxp/products/{externalReferenceCode}/virtual-entry" +
							"/{virtualEntryId}/download"
					).buildAndExpand(
						product.getExternalReferenceCode(),
						productVirtualSettingsFileEntry.getId()
					).toUriString()
				).put(
					"productExternalReferenceCode",
					product.getExternalReferenceCode()
				).put(
					"productId", addOn._productId
				).put(
					"productName", CommerceProductUtil.getName(product)
				).put(
					"sha256Checksum",
					_commerceProductVirtualSettingsService.getSHA256Checksum(
						productVirtualSettingsFileEntry.getSrc())
				).put(
					"terminationStatus",
					addOn._entitlement.getTerminationStatus()
				).put(
					"version", productVirtualSettingsFileEntry.getVersion()
				).put(
					"virtualEntryId", productVirtualSettingsFileEntry.getId()
				));
		}

		return jsonArray;
	}

	private Entitlement _getDXPEntitlement(
		List<Entitlement> entitlements, String type) {

		Entitlement dxpEntitlement = null;

		for (Entitlement entitlement : entitlements) {
			if (!EnvironmentQuotaService.isDXPEntitlementType(
					entitlement, type) ||
				((dxpEntitlement != null) &&
				 !_endsAfter(entitlement, dxpEntitlement))) {

				continue;
			}

			dxpEntitlement = entitlement;
		}

		return dxpEntitlement;
	}

	private JSONObject _getInactiveManifestJSONObject() {
		return new JSONObject(
		).put(
			"add-ons", new JSONArray()
		).put(
			"status", EnvironmentConstants.MANIFEST_STATUS_INACTIVE
		);
	}

	private JSONObject _getManifestJSONObject(
			String dxpVersion, Environment environment)
		throws Exception {

		return _getManifestJSONObject(
			dxpVersion, environment, environment.getExternalEnvironmentId());
	}

	private JSONObject _getManifestJSONObject(
			String dxpVersion, Environment environment, String installationId)
		throws Exception {

		List<Entitlement> entitlements = _getActiveEntitlements(environment);

		Entitlement dxpEntitlement = _getDXPEntitlement(
			entitlements, environment.getType());

		if (dxpEntitlement == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Environment ", environment.getExternalReferenceCode(),
						" does not have an active ", environment.getType(),
						" DXP entitlement"));
			}

			return null;
		}

		Instant nowInstant = Instant.now();

		Date expirationDate = _toDate(
			dxpEntitlement.getEffectiveEndDateInstant(),
			nowInstant.plusMillis(Time.YEAR));
		Date startDate = _toDate(
			dxpEntitlement.getStartDateInstant(), nowInstant);

		String projectName = _getProjectName(environment);

		JSONArray addOnsJSONArray = _getAddOnsJSONArray(
			_getAddOns(entitlements),
			ProductVersion.extractQuarterlyPatchRelease(dxpVersion));

		List<String> licenseXMLs = new ArrayList<>();

		for (int i = 0; i < addOnsJSONArray.length(); i++) {
			JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(i);

			licenseXMLs.add(
				_generateAppLicenseXML(
					projectName, expirationDate,
					addOnJSONObject.getString("productId"),
					addOnJSONObject.getString("productName"), startDate));
		}

		int maxClusterNodes = ClusterNodesUtil.getMaxClusterNodes(
			entitlements, environment.getType());

		licenseXMLs.add(
			_generateDXPLicenseXML(
				projectName, environment.getType(), expirationDate,
				installationId, maxClusterNodes,
				environment.getExternalReferenceCode(),
				ProductVersion.extractQuarterlyRelease(dxpVersion),
				_getSizing(entitlements, environment.getType()), startDate));

		String licenseXML = _licenseKeyExporter.aggregateXMLs(
			licenseXMLs.toArray(new String[0]));

		Base64.Encoder encoder = Base64.getEncoder();

		return new JSONObject(
		).put(
			"add-ons", addOnsJSONArray
		).put(
			"dxpTerminationStatus", dxpEntitlement.getTerminationStatus()
		).put(
			"licenseXML",
			encoder.encodeToString(licenseXML.getBytes(StandardCharsets.UTF_8))
		).put(
			"maxClusterNodes", maxClusterNodes
		).put(
			"status", EnvironmentConstants.MANIFEST_STATUS_ACTIVE
		);
	}

	private String _getProjectName(Environment environment) throws Exception {
		String projectExternalReferenceCode =
			environment.getProjectExternalReferenceCode();

		if (Validator.isNull(projectExternalReferenceCode)) {
			return StringPool.BLANK;
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project == null) {
			return StringPool.BLANK;
		}

		return project.getName();
	}

	private Environment _getSigningEnvironment(
			String installationId, SignedJWT signedJWT)
		throws Exception {

		if (Validator.isNull(installationId)) {
			return null;
		}

		List<Environment> environments = new ArrayList<>(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, installationId));

		environments.addAll(
			_environmentService.getDXPEnvironmentsByInstallationId(
				EnvironmentConstants.ACTIVATION_MODE_ONLINE,
				EnvironmentConstants.ACTIVATION_STATUS_INACTIVE,
				installationId));

		if (environments.isEmpty()) {
			return null;
		}

		List<String> publicKeys = TransformUtil.transform(
			environments, Environment::getPublicKey);

		return environments.get(
			publicKeys.indexOf(
				_jwtSignatureValidator.getSigningPublicKey(
					publicKeys, signedJWT)));
	}

	private String _getSizing(
		List<Entitlement> entitlements, String environmentType) {

		int instanceSize = 0;

		for (Entitlement entitlement : entitlements) {
			if (!EnvironmentQuotaService.isDXPEntitlementType(
					entitlement, environmentType)) {

				continue;
			}

			instanceSize = Math.max(
				instanceSize,
				LicenseKeyGenerateFormService.getInstanceSize(entitlement));
		}

		return "Sizing " + instanceSize;
	}

	private int _getTerminationStatusRank(Entitlement entitlement) {
		List<String> terminationStatuses =
			EntitlementConstants.terminationStatuses;

		int index = terminationStatuses.indexOf(
			entitlement.getTerminationStatus());

		if (index < 0) {
			return terminationStatuses.size();
		}

		return index;
	}

	private boolean _hasAddOn(Environment environment, Product product)
		throws Exception {

		for (AddOn addOn : _getAddOns(_getActiveEntitlements(environment))) {
			Product addOnProduct = addOn._product;

			if (Objects.equals(
					addOnProduct.getExternalReferenceCode(),
					product.getExternalReferenceCode())) {

				return true;
			}
		}

		return false;
	}

	private boolean _isActivated(String installationId, String publicKey)
		throws Exception {

		for (String activationMode :
				List.of(
					EnvironmentConstants.ACTIVATION_MODE_OFFLINE,
					EnvironmentConstants.ACTIVATION_MODE_ONLINE)) {

			for (Environment environment :
					_environmentService.getDXPEnvironmentsByInstallationId(
						activationMode,
						EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
						installationId)) {

				if (JWTSignatureValidator.equalsPublicKey(
						environment.getPublicKey(), publicKey)) {

					return true;
				}
			}
		}

		return false;
	}

	private boolean _isActivatedOffline(
		Environment environment, String installationId, String publicKey) {

		if (Objects.equals(
				environment.getActivationMode(),
				EnvironmentConstants.ACTIVATION_MODE_OFFLINE) &&
			Objects.equals(
				environment.getExternalEnvironmentId(), installationId) &&
			JWTSignatureValidator.equalsPublicKey(
				environment.getPublicKey(), publicKey)) {

			return true;
		}

		return false;
	}

	private boolean _isActivatedOnline(
		Environment environment, String installationId, String publicKey) {

		if (Objects.equals(
				environment.getActivationMode(),
				EnvironmentConstants.ACTIVATION_MODE_ONLINE) &&
			Objects.equals(
				environment.getActivationStatus(),
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE) &&
			Objects.equals(
				environment.getExternalEnvironmentId(), installationId) &&
			JWTSignatureValidator.equalsPublicKey(
				environment.getPublicKey(), publicKey)) {

			return true;
		}

		return false;
	}

	private boolean _isDeactivated(Environment environment) {
		return Objects.equals(
			environment.getActivationStatus(),
			EnvironmentConstants.ACTIVATION_STATUS_INACTIVE);
	}

	private boolean _isEntitlementVersion(String dxpVersion) {
		String quarterlyPatchRelease =
			ProductVersion.extractQuarterlyPatchRelease(dxpVersion);

		if (Validator.isNull(quarterlyPatchRelease)) {
			return false;
		}

		Matcher matcher = ProductVersion.getQuarterlyReleaseMatcher(
			quarterlyPatchRelease);

		if (!matcher.find() ||
			(GetterUtil.getInteger(matcher.group(1)) < _ENTITLEMENT_YEAR)) {

			return false;
		}

		return true;
	}

	private boolean _isInstallationPublicKey(
		String installationId, String publicKey) {

		if (Validator.isNull(installationId) || Validator.isNull(publicKey)) {
			return false;
		}

		Base64.Decoder decoder = Base64.getDecoder();

		UUID uuid = UUID.nameUUIDFromBytes(
			decoder.decode(JWTSignatureValidator.toBase64PublicKey(publicKey)));

		return installationId.equalsIgnoreCase(uuid.toString());
	}

	private boolean _isSignedInstallationId(
			String installationId, JWTClaimsSet jwtClaimsSet)
		throws Exception {

		if (Validator.isNotNull(installationId) &&
			Objects.equals(
				installationId,
				jwtClaimsSet.getStringClaim("installationId"))) {

			return true;
		}

		return false;
	}

	private JSONObject _toActivationCodeJSONObject(Environment environment) {
		return new JSONObject(
		).put(
			"activationCode", environment.getActivationCode()
		).put(
			"activationMode", environment.getActivationMode()
		).put(
			"activationStatus", environment.getActivationStatus()
		).put(
			"environmentId", environment.getExternalReferenceCode()
		).put(
			"installationId", environment.getExternalEnvironmentId()
		);
	}

	private Date _toDate(Instant instant, Instant defaultInstant) {
		if (instant == null) {
			instant = defaultInstant;
		}

		return Date.from(instant.truncatedTo(ChronoUnit.SECONDS));
	}

	private ResponseEntity<ProblemDetail> _toResponseEntity(
		HttpStatus httpStatus, String detail) {

		return new ResponseEntity<>(
			ProblemDetail.forStatusAndDetail(httpStatus, detail), httpStatus);
	}

	private ResponseEntity<ProblemDetail> _toResponseEntity(
		HttpStatus httpStatus, String detail, Exception exception) {

		if (_log.isWarnEnabled()) {
			_log.warn(detail, exception);
		}

		return _toResponseEntity(httpStatus, detail);
	}

	private void _updateCheckIn(String dxpVersion, Environment environment) {
		try {
			_environmentService.updateDXPEnvironmentCheckIn(
				environment.getId(), Instant.now(), dxpVersion);
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to save the check-in of environment " +
						environment.getExternalReferenceCode(),
					exception);
			}
		}
	}

	private void _writeAddOn(
			JSONObject addOnJSONObject, ZipOutputStream zipOutputStream)
		throws Exception {

		Product product = _commerceProductService.fetchProduct(
			addOnJSONObject.getString("productExternalReferenceCode"));

		if (product == null) {
			throw new IllegalStateException(
				"No product exists for external reference code " +
					addOnJSONObject.getString("productExternalReferenceCode"));
		}

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					product.getProductId(),
					addOnJSONObject.getLong("virtualEntryId"));

		if (productVirtualSettingsFileEntry == null) {
			throw new IllegalStateException(
				"No package is available for product " +
					product.getExternalReferenceCode());
		}

		HttpResponse<InputStream> httpResponse =
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				productVirtualSettingsFileEntry.getSrc());

		zipOutputStream.putNextEntry(
			new ZipEntry(
				"add-ons/" + addOnJSONObject.getString("productId") + ".lpkg"));

		try (InputStream inputStream = httpResponse.body()) {
			inputStream.transferTo(zipOutputStream);
		}

		zipOutputStream.closeEntry();
	}

	private static final String _APP_PRODUCT_VERSION = "1";

	private static final int _ENTITLEMENT_YEAR = 2027;

	private static final Log _log = LogFactory.getLog(
		DXPEnvironmentsRestController.class);

	private static final Map<String, String> _productNames = Map.of(
		EnvironmentConstants.TYPE_BACKUP, "DXP Backup",
		EnvironmentConstants.TYPE_NONPRODUCTION, "DXP Non-Production",
		EnvironmentConstants.TYPE_PRODUCTION, "DXP Production");

	@Autowired
	private AdminPermission _adminPermission;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private EnvironmentActivationPermission _environmentActivationPermission;

	@Autowired
	private EnvironmentQuotaService _environmentQuotaService;

	@Autowired
	private EnvironmentService _environmentService;

	@Autowired
	private JWTSignatureValidator _jwtSignatureValidator;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

	@Autowired
	private ProjectService _projectService;

	private static class AddOn {

		public AddOn(
			Entitlement entitlement, Product product, String productId) {

			_entitlement = entitlement;
			_product = product;
			_productId = productId;
		}

		private final Entitlement _entitlement;
		private final Product _product;
		private final String _productId;

	}

}