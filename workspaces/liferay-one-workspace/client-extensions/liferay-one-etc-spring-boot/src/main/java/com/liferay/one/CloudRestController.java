/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.constants.ProductVersion;
import com.liferay.one.exception.ActivationCodeAlreadyUsedException;
import com.liferay.one.exception.AddOnsUnavailableException;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.exception.EnvironmentAlreadyActivatedException;
import com.liferay.one.exception.NoSuchActivationCodeException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.Environment;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceProductVirtualSettingsService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.util.CloudNativeSignatureValidator;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.ArrayUtil;
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

import java.text.ParseException;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * @author Kyle Bischof
 * @author Amos Fong
 */
@RequestMapping("/cloud")
@RestController
public class CloudRestController extends OneBaseRestController {

	@ExceptionHandler(ActivationCodeAlreadyUsedException.class)
	public ResponseEntity<?> handleException(
		ActivationCodeAlreadyUsedException activationCodeAlreadyUsedException) {

		if (_log.isDebugEnabled()) {
			_log.debug(activationCodeAlreadyUsedException);
		}

		return new ResponseEntity<>(HttpStatus.CONFLICT);
	}

	@ExceptionHandler(AddOnsUnavailableException.class)
	public ResponseEntity<?> handleException(
		AddOnsUnavailableException addOnsUnavailableException) {

		if (_log.isDebugEnabled()) {
			_log.debug(addOnsUnavailableException);
		}

		return new ResponseEntity<>(HttpStatus.UNPROCESSABLE_ENTITY);
	}

	@ExceptionHandler(CloudNativeEntitlementException.class)
	public ResponseEntity<?> handleException(
		CloudNativeEntitlementException cloudNativeEntitlementException) {

		_log.error(cloudNativeEntitlementException);

		return new ResponseEntity<>(
			cloudNativeEntitlementException.getMessage(),
			HttpStatus.INTERNAL_SERVER_ERROR);
	}

	@ExceptionHandler(EnvironmentAlreadyActivatedException.class)
	public ResponseEntity<?> handleException(
		EnvironmentAlreadyActivatedException
			environmentAlreadyActivatedException) {

		if (_log.isDebugEnabled()) {
			_log.debug(environmentAlreadyActivatedException);
		}

		return new ResponseEntity<>(HttpStatus.CONFLICT);
	}

	@ExceptionHandler(NoSuchActivationCodeException.class)
	public ResponseEntity<?> handleException(
		NoSuchActivationCodeException noSuchActivationCodeException) {

		if (_log.isDebugEnabled()) {
			_log.debug(noSuchActivationCodeException);
		}

		return new ResponseEntity<>(HttpStatus.NOT_FOUND);
	}

	@ExceptionHandler(ParseException.class)
	public ResponseEntity<?> handleException(ParseException parseException) {
		if (_log.isDebugEnabled()) {
			_log.debug("Unable to parse the signed JWT", parseException);
		}

		return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
	}

	@PostMapping("/environments/{environmentId}/activation")
	public ResponseEntity<Void> postEnvironmentsActivation(
			@PathVariable String environmentId, @RequestBody String body)
		throws Exception {

		SignedJWT signedJWT = SignedJWT.parse(body);

		_cloudNativeSignatureValidator.validateSignature(signedJWT);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		_activateEnvironment(
			jwtClaimsSet.getStringClaim("activationCode"),
			EnvironmentConstants.ACTIVATION_MODE_ONLINE, environmentId,
			jwtClaimsSet.getStringClaim("environmentName"),
			jwtClaimsSet.getStringClaim("publicKey"));

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

		String dxpVersion = _getDXPVersion(body);

		if (Validator.isNull(dxpVersion)) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				"Retrieving entitlements for environment " + environmentId);
		}

		JSONObject jsonObject = _getManifestJSONObject(dxpVersion, environment);

		return ResponseEntity.ok(jsonObject.toString());
	}

	@PostMapping("/environments/offline-activation")
	public ResponseEntity<Void> postEnvironmentsOfflineActivation(
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
			_log.error(
				"The activation code and the offline activation token are " +
					"required");

			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}

		SignedJWT signedJWT = SignedJWT.parse(token);

		JWTClaimsSet jwtClaimsSet = signedJWT.getJWTClaimsSet();

		String environmentId = jwtClaimsSet.getStringClaim("environmentID");

		if (Validator.isNull(environmentId)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"The offline activation token is missing the environment " +
						"ID");
			}

			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		try {
			_cloudNativeSignatureValidator.validateSignature(signedJWT);
		}
		catch (PrincipalException principalException) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to verify the offline activation token",
					principalException);
			}

			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		_activateEnvironment(
			activationCode, EnvironmentConstants.ACTIVATION_MODE_OFFLINE,
			environmentId, jwtClaimsSet.getStringClaim("environmentName"),
			jwtClaimsSet.getStringClaim("publicKey"));

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Activated offline environment ", environmentId,
					" for activation code ", activationCode));
		}

		return new ResponseEntity<>(HttpStatus.OK);
	}

	@PostMapping("/environments/{environmentId}/offline-activation-bundle")
	public ResponseEntity<StreamingResponseBody>
			postEnvironmentsOfflineActivationBundle(
				@AuthenticationPrincipal Jwt jwt,
				@PathVariable String environmentId, @RequestBody String json)
		throws Exception {

		JSONObject jsonObject = new JSONObject(json);

		String dxpVersion = jsonObject.optString("dxpVersion");

		if (Validator.isNull(dxpVersion)) {
			return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
		}

		Environment environment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId, jwt);

		if (environment == null) {
			return new ResponseEntity<>(HttpStatus.NOT_FOUND);
		}

		Path path = _createOfflineActivationBundle(dxpVersion, environment);

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

		return new ResponseEntity<>(
			outputStream -> {
				try {
					Files.copy(path, outputStream);
				}
				finally {
					Files.deleteIfExists(path);
				}
			},
			httpHeaders, HttpStatus.OK);
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
			"attachment",
			_getFileName(
				externalReferenceCode, productVirtualSettingsFileEntry));
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

	private void _activateEnvironment(
			String activationCode, String activationMode, String environmentId,
			String environmentName, String publicKey)
		throws Exception {

		Environment activatedEnvironment =
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId);

		if (activatedEnvironment != null) {
			throw new EnvironmentAlreadyActivatedException(environmentId);
		}

		Environment environment = _environmentService.fetchEnvironment(
			StringBundler.concat(
				"(activationCode eq '", activationCode, "') and (offering eq '",
				EnvironmentConstants.OFFERING_CLOUD_NATIVE, "')"));

		if (environment == null) {
			throw new NoSuchActivationCodeException(activationCode);
		}

		if (Objects.equals(
				environment.getActivationStatus(),
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE)) {

			throw new ActivationCodeAlreadyUsedException(activationCode);
		}

		_environmentService.updateEnvironmentActivation(
			activationMode, environmentId, environment.getId(), environmentName,
			publicKey);
	}

	private Path _createOfflineActivationBundle(
			String dxpVersion, Environment environment)
		throws Exception {

		JSONObject manifestJSONObject = _getManifestJSONObject(
			dxpVersion, environment);

		Path path = Files.createTempFile("offline-activation-bundle-", ".zip");

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

			JSONArray addOnsJSONArray = manifestJSONObject.optJSONArray(
				"add-ons");

			if (addOnsJSONArray != null) {
				for (int i = 0; i < addOnsJSONArray.length(); i++) {
					_writeAddOn(
						addOnsJSONArray.getJSONObject(i), zipOutputStream);
				}
			}
		}
		catch (Exception exception) {
			Files.deleteIfExists(path);

			throw exception;
		}

		return path;
	}

	private String _generateAppLicenseXML(
			Date expirationDate, String owner, String productId,
			String productName, Date startDate)
		throws Exception {

		String description = productName + " Cloud Native Environment";
		String licenseEntryType = LicenseConstants.TYPE_ENTERPRISE;
		int licenseVersion = LicenseVersion.getAppLicenseVersion();

		String key = _licenseKeyGenerator.generateKey(
			StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION, owner,
			0, 0, 0, 0, 0, StringPool.BLANK, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, StringPool.BLANK, StringPool.BLANK, licenseEntryType,
			licenseVersion, productName, productId, _APP_PRODUCT_VERSION, owner,
			0, 0, 0, 0, 0, StringPool.BLANK, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);
	}

	private String _generateDXPLicenseXML(
			String accountName, Date expirationDate, String licenseEntryName,
			int maxClusterNodes, String owner, String productVersion,
			Date startDate)
		throws Exception {

		String description = "Cloud Native";
		String licenseEntryType = LicenseConstants.TYPE_VIRTUAL_CLUSTER;

		String productName = "DXP Production";

		int licenseVersion = LicenseVersion.getLicenseVersion(
			productName, productVersion);

		String sizing = "Sizing 4";

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseEntryName, licenseEntryType, licenseVersion,
			productName, LicenseConstants.PRODUCT_ID_PORTAL, productVersion,
			owner, maxClusterNodes, 0, 0, 0, 0, sizing, description,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, licenseEntryName, licenseEntryType,
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			productVersion, owner, maxClusterNodes, 0, 0, 0, 0, sizing,
			description, StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);
	}

	private String _getAccountName(Environment environment) throws Exception {
		Account account = _accountService.fetchAccount(
			environment.getAccountEntryId());

		if (account == null) {
			return StringPool.BLANK;
		}

		return account.getName();
	}

	private JSONArray _getAddOnsJSONArray(
			List<Product> products, String dxpPatchProductVersion)
		throws Exception {

		JSONArray jsonArray = new JSONArray();

		for (Product product : products) {
			ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
				_commerceProductVirtualSettingsService.
					fetchProductVirtualSettingsFileEntry(
						product.getProductId(), dxpPatchProductVersion);

			if (productVirtualSettingsFileEntry == null) {
				_log.error(
					"No package is available for product " +
						product.getExternalReferenceCode());

				continue;
			}

			jsonArray.put(
				new JSONObject(
				).put(
					"downloadURL",
					ServletUriComponentsBuilder.fromCurrentContextPath(
					).path(
						"/cloud/products/{externalReferenceCode}" +
							"/virtual-entry/{virtualEntryId}/download"
					).buildAndExpand(
						product.getExternalReferenceCode(),
						productVirtualSettingsFileEntry.getId()
					).toUriString()
				).put(
					"productId", product.getExternalReferenceCode()
				).put(
					"productName", _commerceProductService.getName(product)
				).put(
					"sha256Checksum",
					_commerceProductVirtualSettingsService.getSHA256Checksum(
						productVirtualSettingsFileEntry.getSrc())
				).put(
					"version", productVirtualSettingsFileEntry.getVersion()
				).put(
					"virtualEntryId", productVirtualSettingsFileEntry.getId()
				));
		}

		return jsonArray;
	}

	private String _getAggregateLicenseXML(
			JSONArray addOnsJSONArray, String accountName,
			String dxpProductVersion, Date expirationDate,
			String licenseEntryName, int maxClusterNodes, String owner,
			Date startDate)
		throws Exception {

		List<String> licenseXMLs = new ArrayList<>();

		for (int i = 0; i < addOnsJSONArray.length(); i++) {
			JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(i);

			licenseXMLs.add(
				_generateAppLicenseXML(
					expirationDate, accountName,
					addOnJSONObject.getString("productId"),
					addOnJSONObject.getString("productName"), startDate));
		}

		licenseXMLs.add(
			_generateDXPLicenseXML(
				accountName, expirationDate, licenseEntryName, maxClusterNodes,
				owner, dxpProductVersion, startDate));

		String licenseXML = _licenseKeyExporter.aggregateXMLs(
			licenseXMLs.toArray(new String[0]));

		Base64.Encoder encoder = Base64.getEncoder();

		return encoder.encodeToString(licenseXML.getBytes());
	}

	private List<Product> _getCloudEnabledProducts(
			List<Entitlement> entitlements)
		throws Exception {

		List<Product> products = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if (entitlementDefinition == null) {
				continue;
			}

			long cProductId = entitlementDefinition.getCProductId();

			if (cProductId <= 0) {
				continue;
			}

			Product product = _commerceProductService.fetchProduct(cProductId);

			if (product == null) {
				_log.error(
					StringBundler.concat(
						"No product exists for commerce product ID ",
						cProductId, " of entitlement definition ",
						entitlementDefinition.getExternalReferenceCode()));

				continue;
			}

			if (_isCloudEnabled(product)) {
				products.add(product);
			}
		}

		return products;
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
		String externalReferenceCode,
		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry) {

		String src = productVirtualSettingsFileEntry.getSrc();

		if (Validator.isNotNull(src)) {
			String fileName = src.substring(src.lastIndexOf('/') + 1);

			int index = fileName.indexOf('?');

			if (index != -1) {
				fileName = fileName.substring(0, index);
			}

			if (fileName.endsWith(".lpkg")) {
				return fileName;
			}
		}

		return externalReferenceCode + ".lpkg";
	}

	private JSONObject _getManifestJSONObject(
			String dxpVersion, Environment environment)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				environment.getAccountEntryId());

		Entitlement cloudNativeEntitlement = null;

		for (Entitlement entitlement : entitlements) {
			if (ArrayUtil.contains(
					EntitlementConstants.NAMES_CLOUD_NATIVE,
					entitlement.getName())) {

				cloudNativeEntitlement = entitlement;

				break;
			}
		}

		if (cloudNativeEntitlement == null) {
			throw new CloudNativeEntitlementException(
				environment.getAccountEntryId());
		}

		Date expirationDate = _toDate(
			cloudNativeEntitlement.getEndDateInstant(),
			new Date(System.currentTimeMillis() + Time.YEAR));
		Date startDate = _toDate(
			cloudNativeEntitlement.getStartDateInstant(), new Date());

		int maxClusterNodes = _getMaxClusterNodes(
			entitlements, environment.getType());

		JSONArray addOnsJSONArray = _getAddOnsJSONArray(
			_getCloudEnabledProducts(entitlements),
			ProductVersion.extractQuarterlyPatchRelease(dxpVersion));

		String licenseEntryName = "DXP Non-Production (Virtual Cluster)";

		if (Objects.equals(
				environment.getType(), EnvironmentConstants.TYPE_PRODUCTION)) {

			licenseEntryName = "DXP Production (Virtual Cluster)";
		}

		return new JSONObject(
		).put(
			"add-ons", addOnsJSONArray
		).put(
			"licenseXML",
			_getAggregateLicenseXML(
				addOnsJSONArray, _getAccountName(environment),
				ProductVersion.extractQuarterlyRelease(dxpVersion),
				expirationDate, licenseEntryName, maxClusterNodes,
				environment.getExternalReferenceCode(), startDate)
		).put(
			"maxClusterNodes", maxClusterNodes
		);
	}

	private int _getMaxClusterNodes(
		List<Entitlement> entitlements, String type) {

		int maxClusterNodes = 1;

		if (!_hasProductionSizing(type)) {
			return maxClusterNodes;
		}

		for (Entitlement entitlement : entitlements) {
			if (!ArrayUtil.contains(
					EntitlementConstants.NAMES_PRODUCTION_PODS,
					entitlement.getName())) {

				continue;
			}

			Double quantity = entitlement.getQuantity();

			if (quantity == null) {
				continue;
			}

			int curMaxClusterNodes = quantity.intValue();

			if (curMaxClusterNodes > maxClusterNodes) {
				maxClusterNodes = curMaxClusterNodes;
			}
		}

		return maxClusterNodes;
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
			body, jwtClaimsSet.getStringClaim("environmentID"));

		JSONArray addOnsJSONArray = _getAddOnsJSONArray(
			_getCloudEnabledProducts(
				_entitlementService.getActiveEntitlements(
					environment.getAccountEntryId())),
			StringPool.BLANK);

		for (int i = 0; i < addOnsJSONArray.length(); i++) {
			JSONObject addOnJSONObject = addOnsJSONArray.getJSONObject(i);

			if (Objects.equals(
					addOnJSONObject.getString("productId"),
					product.getExternalReferenceCode())) {

				return true;
			}
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Environment ", environment.getExternalReferenceCode(),
					" is not entitled to product ",
					product.getExternalReferenceCode()));
		}

		return false;
	}

	private boolean _hasProductionSizing(String type) {
		if (Objects.equals(type, EnvironmentConstants.TYPE_PRODUCTION) ||
			Objects.equals(type, EnvironmentConstants.TYPE_UAT)) {

			return true;
		}

		return false;
	}

	private boolean _isCloudEnabled(Product product) {
		ProductSpecification[] productSpecifications =
			product.getProductSpecifications();

		if (productSpecifications == null) {
			return false;
		}

		for (ProductSpecification productSpecification :
				productSpecifications) {

			if (!Objects.equals(
					productSpecification.getSpecificationKey(),
					CommerceProductConstants.SPECIFICATION_KEY_CLOUD_ENABLED)) {

				continue;
			}

			Map<String, String> value = productSpecification.getValue();

			if (value == null) {
				return false;
			}

			return GetterUtil.getBoolean(value.get("en_US"));
		}

		return false;
	}

	private Date _toDate(Instant instant, Date defaultDate) {
		if (instant == null) {
			return defaultDate;
		}

		return Date.from(instant);
	}

	private void _writeAddOn(
			JSONObject addOnJSONObject, ZipOutputStream zipOutputStream)
		throws Exception {

		String externalReferenceCode = addOnJSONObject.optString("productId");

		Product product = _commerceProductService.fetchProduct(
			externalReferenceCode);

		if (product == null) {
			throw new AddOnsUnavailableException(
				"No product exists for external reference code " +
					externalReferenceCode);
		}

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					product.getProductId(),
					addOnJSONObject.optLong("virtualEntryId"));

		if (productVirtualSettingsFileEntry == null) {
			throw new AddOnsUnavailableException(
				"No package is available for product " + externalReferenceCode);
		}

		HttpResponse<InputStream> httpResponse =
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				productVirtualSettingsFileEntry.getSrc());

		String fileName = _getFileName(
			externalReferenceCode, productVirtualSettingsFileEntry);

		zipOutputStream.putNextEntry(new ZipEntry("add-ons/" + fileName));

		try (InputStream inputStream = httpResponse.body()) {
			inputStream.transferTo(zipOutputStream);
		}

		zipOutputStream.closeEntry();
	}

	private static final String _APP_PRODUCT_VERSION = "1";

	private static final Log _log = LogFactory.getLog(
		CloudRestController.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private CloudNativeSignatureValidator _cloudNativeSignatureValidator;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private EnvironmentService _environmentService;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

}