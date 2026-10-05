/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.KeyedLock;
import com.liferay.one.util.ServerInfoUtil;
import com.liferay.one.util.comparator.VersionComparator;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.ListUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TimeZone;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class LicenseKeyGenerationService {

	public ActivationKey generateActivationKey(GenerateRequest generateRequest)
		throws Exception {

		if (!_isComplimentary(generateRequest) &&
			ListUtil.isEmpty(generateRequest.getBundleEntitlementIds())) {

			throw new LicenseKeyEntitlementException(
				"No product was selected for this bundle");
		}

		if (ListUtil.isEmpty(generateRequest.getServers())) {
			throw new LicenseKeyEntitlementException(
				"No server was given for the activation keys");
		}

		Project project = generateRequest.getProject();

		return _keyedLock.withLock(
			project.getExternalReferenceCode(),
			() -> _generateActivationKey(generateRequest, project));
	}

	public String generateDeveloperLicenseXML(
			String keyType, String productName, Project project, String version)
		throws Exception {

		if (!LicenseKeyGenerationConstants.downloadableKeyTypes.contains(
				keyType)) {

			throw new LicenseKeyEntitlementException(
				"No key can be downloaded for key type " + keyType);
		}

		int comparison = _versionComparator.compare(
			version, LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION);

		if (comparison < 0) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"Developer keys are not available for version ", version,
					". The minimum version is ",
					LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION));
		}

		Entitlement entitlement = _fetchEntitledProductEntitlement(
			productName, project);

		if (entitlement == null) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"The project is not entitled to ", productName,
					", so no developer key can be generated for it"));
		}

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

		calendar.set(Calendar.MILLISECOND, 0);

		Date startDate = calendar.getTime();

		calendar.add(
			Calendar.DATE,
			_getDurationDays(
				entitlement,
				LicenseKeyGenerationConstants.DEVELOPER_DURATION_DAYS));

		Date expirationDate = calendar.getTime();

		String accountName = project.getName();
		String description = StringBundler.concat(
			productName, StringPool.SPACE, _getDeveloperLabel(keyType));
		int licenseVersion = LicenseVersion.getLicenseVersion(
			productName, version);

		String key = _licenseKeyGenerator.generateKey(
			accountName, description, keyType, licenseVersion, productName,
			LicenseConstants.PRODUCT_ID_PORTAL, version, accountName, 0, 0, 0,
			0, 0, _SIZING_DEFAULT, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, description, keyType, licenseVersion, productName,
			LicenseConstants.PRODUCT_ID_PORTAL, version, accountName, 0, 0, 0,
			0, 0, _SIZING_DEFAULT, description, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, startDate, expirationDate);
	}

	public static class GenerateRequest {

		public GenerateRequest(
			List<Long> bundleEntitlementIds, String dataCenterLocation,
			String description, String environmentName, String keyType,
			Project project, String purpose,
			String renewedActivationKeyExternalReferenceCode,
			List<Server> servers, Date startDate,
			long subscriptionEntitlementId, String version,
			String workspaceName, String workspaceOwnerEmail) {

			_bundleEntitlementIds = bundleEntitlementIds;
			_dataCenterLocation = dataCenterLocation;
			_description = description;
			_environmentName = environmentName;
			_keyType = keyType;
			_project = project;
			_purpose = purpose;
			_renewedActivationKeyExternalReferenceCode =
				renewedActivationKeyExternalReferenceCode;
			_servers = servers;
			_startDate = startDate;
			_subscriptionEntitlementId = subscriptionEntitlementId;
			_version = version;
			_workspaceName = workspaceName;
			_workspaceOwnerEmail = workspaceOwnerEmail;
		}

		public List<Long> getBundleEntitlementIds() {
			return _bundleEntitlementIds;
		}

		public String getDataCenterLocation() {
			return _dataCenterLocation;
		}

		public String getDescription() {
			return _description;
		}

		public String getEnvironmentName() {
			return _environmentName;
		}

		public String getKeyType() {
			return _keyType;
		}

		public Project getProject() {
			return _project;
		}

		public String getPurpose() {
			return _purpose;
		}

		public String getRenewedActivationKeyExternalReferenceCode() {
			return _renewedActivationKeyExternalReferenceCode;
		}

		public List<Server> getServers() {
			return _servers;
		}

		public Date getStartDate() {
			return _startDate;
		}

		public long getSubscriptionEntitlementId() {
			return _subscriptionEntitlementId;
		}

		public String getVersion() {
			return _version;
		}

		public String getWorkspaceName() {
			return _workspaceName;
		}

		public String getWorkspaceOwnerEmail() {
			return _workspaceOwnerEmail;
		}

		public static class Server {

			public Server(
				String hostName, String ipAddresses, String macAddresses) {

				_hostName = hostName;
				_ipAddresses = ipAddresses;
				_macAddresses = macAddresses;
			}

			public String getHostName() {
				return _hostName;
			}

			public String getIpAddresses() {
				return _ipAddresses;
			}

			public String getMacAddresses() {
				return _macAddresses;
			}

			private final String _hostName;
			private final String _ipAddresses;
			private final String _macAddresses;

		}

		private final List<Long> _bundleEntitlementIds;
		private final String _dataCenterLocation;
		private final String _description;
		private final String _environmentName;
		private final String _keyType;
		private final Project _project;
		private final String _purpose;
		private final String _renewedActivationKeyExternalReferenceCode;
		private final List<Server> _servers;
		private final Date _startDate;
		private final long _subscriptionEntitlementId;
		private final String _version;
		private final String _workspaceName;
		private final String _workspaceOwnerEmail;

	}

	private ActivationKey _addActivationKey(
			Date expirationDate, GenerateRequest generateRequest,
			Project project, Date startDate)
		throws Exception {

		return _activationKeyService.addActivationKey(
			project.getAccountId(), true, expirationDate,
			project.getExternalReferenceCode(), startDate,
			generateRequest.getKeyType());
	}

	private LicenseKey _addLicenseKey(
			ActivationKey activationKey, boolean complimentary,
			String description, Entitlement entitlement, Date expirationDate,
			GenerateRequest generateRequest, LicensedProduct licensedProduct,
			Project project, GenerateRequest.Server server, Date startDate)
		throws Exception {

		LicenseEntry licenseEntry = licensedProduct._getLicenseEntry();
		String productName = licensedProduct._getProductName();
		String version = generateRequest.getVersion();

		long entitlementDefinitionId = 0;

		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition != null) {
			entitlementDefinitionId =
				entitlementDefinition.getEntitlementDefinitionId();
		}

		return _licenseKeyService.addLicenseKey(
			project.getAccountId(), project.getName(),
			activationKey.getActivationKeyId(), true,
			_getAdditionalInfo(generateRequest),
			licensedProduct._getExternalReferenceCode(), complimentary,
			generateRequest.getDataCenterLocation(), description,
			StringPool.BLANK, entitlementDefinitionId,
			entitlement.getEntitlementId(), expirationDate,
			ServerInfoUtil.toCommaSeparated(server.getHostName()),
			ServerInfoUtil.toCommaSeparated(server.getIpAddresses()),
			_toLicenseXML(
				description, expirationDate, generateRequest, licensedProduct,
				project, server, startDate),
			licenseEntry.getName(), licenseEntry.getType(),
			LicenseVersion.getLicenseVersion(productName, version),
			ServerInfoUtil.toCommaSeparated(server.getMacAddresses()), 0, 0, 0,
			0, 0, generateRequest.getEnvironmentName(), null,
			generateRequest.getEnvironmentName(),
			LicenseConstants.PRODUCT_ID_PORTAL, productName, version,
			project.getExternalReferenceCode(), StringPool.BLANK,
			_getSizing(generateRequest), startDate,
			generateRequest.getWorkspaceName(),
			generateRequest.getWorkspaceOwnerEmail());
	}

	private void _checkComplimentary(Project project) throws Exception {
		if (!_licenseKeyGenerateFormService.isAllowComplimentary(
				project.getAccountId())) {

			throw new LicenseKeyEntitlementException(
				"The account is not allowed to generate a complimentary key");
		}

		int complimentaryActivationKeysCount =
			_activationKeyService.getActivationKeysCount(
				true, project.getExternalReferenceCode(),
				LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY);

		if (complimentaryActivationKeysCount > 0) {
			throw new LicenseKeyEntitlementException(
				"The project already has a complimentary key that has not " +
					"been deactivated");
		}
	}

	private void _checkComplimentaryEntitlement(
			boolean complimentary, Entitlement entitlement)
		throws Exception {

		boolean complimentaryGrant = Objects.equals(
			LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY,
			LicenseKeyGenerateFormService.getLicenseKeyType(entitlement));

		if (complimentary && !complimentaryGrant) {
			throw new LicenseKeyEntitlementException(
				"The selected entitlement does not grant a complimentary key");
		}

		if (!complimentary && complimentaryGrant) {
			throw new LicenseKeyEntitlementException(
				"The selected entitlement grants only complimentary keys");
		}
	}

	private void _checkComplimentaryRequest(GenerateRequest generateRequest)
		throws Exception {

		List<GenerateRequest.Server> servers = generateRequest.getServers();

		if (servers.size() != 1) {
			throw new LicenseKeyEntitlementException(
				"A complimentary key covers exactly one server");
		}

		String purpose = generateRequest.getPurpose();

		if (Validator.isNull(purpose)) {
			throw new LicenseKeyValidationException(
				"A complimentary key requires a purpose");
		}

		if (purpose.length() >
				LicenseKeyGenerationConstants.
					COMPLIMENTARY_PURPOSE_MAX_LENGTH) {

			throw new LicenseKeyValidationException(
				StringBundler.concat(
					"The purpose exceeds ",
					LicenseKeyGenerationConstants.
						COMPLIMENTARY_PURPOSE_MAX_LENGTH,
					" characters"));
		}
	}

	private void _checkQuota(
			List<Entitlement> bundleEntitlements,
			GenerateRequest generateRequest, Project project)
		throws Exception {

		List<GenerateRequest.Server> servers = generateRequest.getServers();

		int requestedCount = servers.size();

		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				_getRenewedActivationKeyIds(generateRequest),
				project.getExternalReferenceCode());

		for (Entitlement entitlement : bundleEntitlements) {
			int totalCount = LicenseKeyGenerateFormService.getTotalCount(
				entitlement);

			int usedCount = licenseKeyCounts.getOrDefault(
				entitlement.getEntitlementId(), 0);

			int availableCount = totalCount - usedCount;

			if (requestedCount > availableCount) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"Entitlement ", entitlement.getName(), " has ",
						Math.max(0, availableCount), " activations left, but ",
						requestedCount, " were requested"));
			}
		}
	}

	private void _deactivateActivationKey(ActivationKey activationKey) {
		try {
			_activationKeyService.updateActivationKeyActive(
				activationKey.getActivationKeyId(), false);
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to deactivate the partially generated activation ",
					"key ", activationKey.getActivationKeyId()),
				exception);
		}
	}

	private Entitlement _fetchEntitledProductEntitlement(
			String productName, Project project)
		throws Exception {

		for (Entitlement entitlement :
				_entitlementService.getActiveEntitlements(
					project.getExternalReferenceCode())) {

			if (!_licenseKeyGenerateFormService.grantsLicense(entitlement)) {
				continue;
			}

			Product product = _licenseKeyGenerateFormService.fetchProduct(
				entitlement);

			if ((product != null) &&
				Objects.equals(
					productName, CommerceProductUtil.getName(product))) {

				return entitlement;
			}
		}

		return null;
	}

	private LicenseEntry _fetchLicenseEntry(
		GenerateRequest generateRequest, Entitlement entitlement) {

		return _licenseKeyGenerateFormService.fetchLicenseEntry(
			generateRequest.getKeyType(),
			LicenseKeyGenerateFormService.getLicenseKeyFamily(entitlement),
			generateRequest.getVersion());
	}

	private ActivationKey _fetchRenewedActivationKey(
			GenerateRequest generateRequest)
		throws Exception {

		String externalReferenceCode =
			generateRequest.getRenewedActivationKeyExternalReferenceCode();

		if (Validator.isNull(externalReferenceCode)) {
			return null;
		}

		ActivationKey activationKey = _activationKeyService.fetchActivationKey(
			externalReferenceCode);

		if (activationKey == null) {
			return null;
		}

		Project project = generateRequest.getProject();

		if (!Objects.equals(
				project.getExternalReferenceCode(),
				activationKey.getProjectExternalReferenceCode())) {

			throw new LicenseKeyEntitlementException(
				"The activation key being renewed belongs to another project");
		}

		return activationKey;
	}

	private Entitlement _findEntitlement(
		long entitlementId, List<Entitlement> entitlements) {

		for (Entitlement entitlement : entitlements) {
			if (entitlement.getEntitlementId() == entitlementId) {
				return entitlement;
			}
		}

		return null;
	}

	private ActivationKey _generateActivationKey(
			GenerateRequest generateRequest, Project project)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				project.getExternalReferenceCode());

		Entitlement subscriptionEntitlement = _findEntitlement(
			generateRequest.getSubscriptionEntitlementId(), entitlements);

		if (subscriptionEntitlement == null) {
			throw new LicenseKeyEntitlementException(
				"The project is not entitled to the selected subscription");
		}

		boolean complimentary = _isComplimentary(generateRequest);

		Date expirationDate = _toDate(
			subscriptionEntitlement.getEndDateInstant());
		Date startDate = _toDate(subscriptionEntitlement.getStartDateInstant());

		List<Entitlement> bundleEntitlements = _getBundleEntitlements(
			generateRequest.getBundleEntitlementIds(), entitlements);

		if (complimentary) {
			_checkComplimentary(project);
			_checkComplimentaryEntitlement(true, subscriptionEntitlement);
			_checkComplimentaryRequest(generateRequest);

			Calendar calendar = Calendar.getInstance(
				TimeZone.getTimeZone("UTC"));

			if (generateRequest.getStartDate() != null) {
				calendar.setTime(generateRequest.getStartDate());
			}

			calendar.set(Calendar.MILLISECOND, 0);

			startDate = calendar.getTime();

			calendar.add(
				Calendar.DATE,
				_getDurationDays(
					subscriptionEntitlement,
					LicenseKeyGenerationConstants.COMPLIMENTARY_DURATION_DAYS));

			expirationDate = calendar.getTime();

			if (!expirationDate.after(new Date())) {
				throw new LicenseKeyDateException(
					"Invalid start date or expiration date");
			}

			bundleEntitlements = Collections.singletonList(
				subscriptionEntitlement);
		}
		else {
			bundleEntitlements = _toBundleEntitlements(
				bundleEntitlements, subscriptionEntitlement);

			for (Entitlement entitlement : bundleEntitlements) {
				_checkComplimentaryEntitlement(false, entitlement);
			}
		}

		_checkQuota(bundleEntitlements, generateRequest, project);

		Map<Long, LicensedProduct> licensedProducts = _getLicensedProducts(
			bundleEntitlements, generateRequest, subscriptionEntitlement);

		String description = generateRequest.getDescription();

		if (Validator.isNull(description)) {
			description = generateRequest.getEnvironmentName();
		}

		ActivationKey activationKey = _addActivationKey(
			expirationDate, generateRequest, project, startDate);

		try {
			for (GenerateRequest.Server server : generateRequest.getServers()) {
				for (Entitlement entitlement : bundleEntitlements) {
					_addLicenseKey(
						activationKey, complimentary, description, entitlement,
						expirationDate, generateRequest,
						licensedProducts.get(entitlement.getEntitlementId()),
						project, server, startDate);
				}
			}

			ActivationKey renewedActivationKey = _fetchRenewedActivationKey(
				generateRequest);

			if (renewedActivationKey != null) {
				_activationKeyService.updateActivationKeyActive(
					renewedActivationKey.getActivationKeyId(), false);
			}
		}
		catch (Exception exception) {
			_deactivateActivationKey(activationKey);

			throw exception;
		}

		return activationKey;
	}

	private String _getAdditionalInfo(GenerateRequest generateRequest) {
		if (!_isComplimentary(generateRequest)) {
			return null;
		}

		return new JSONObject(
		).put(
			"purpose", generateRequest.getPurpose()
		).toString();
	}

	private List<Entitlement> _getBundleEntitlements(
			List<Long> bundleEntitlementIds, List<Entitlement> entitlements)
		throws Exception {

		List<Entitlement> bundleEntitlements = new ArrayList<>();

		Set<Long> entitlementIds = new LinkedHashSet<>(bundleEntitlementIds);

		for (long entitlementId : entitlementIds) {
			Entitlement entitlement = _findEntitlement(
				entitlementId, entitlements);

			if (entitlement == null) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"The project is not entitled to entitlement ",
						entitlementId, " selected for this bundle"));
			}

			bundleEntitlements.add(entitlement);
		}

		return bundleEntitlements;
	}

	private String _getDeveloperLabel(String keyType) {
		if (Objects.equals(keyType, LicenseConstants.TYPE_DEVELOPER_CLUSTER)) {
			return "Developer Cluster";
		}

		return "Developer";
	}

	private int _getDurationDays(Entitlement entitlement, int defaultDays) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return defaultDays;
		}

		int licenseKeyDurationDays =
			entitlementDefinition.getLicenseKeyDurationDays();

		if (licenseKeyDurationDays <= 0) {
			return defaultDays;
		}

		return licenseKeyDurationDays;
	}

	private Map<Long, LicensedProduct> _getLicensedProducts(
			List<Entitlement> bundleEntitlements,
			GenerateRequest generateRequest,
			Entitlement subscriptionEntitlement)
		throws Exception {

		Map<Long, LicensedProduct> licensedProducts = new HashMap<>();

		LicenseEntry leadingLicenseEntry = _fetchLicenseEntry(
			generateRequest, subscriptionEntitlement);

		for (Entitlement entitlement : bundleEntitlements) {
			Product product = _licenseKeyGenerateFormService.fetchProduct(
				entitlement);

			if (product == null) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"No product backs entitlement ",
						entitlement.getEntitlementId(),
						" selected for this bundle"));
			}

			String productName = CommerceProductUtil.getName(product);

			LicenseEntry licenseEntry = _fetchLicenseEntry(
				generateRequest, entitlement);

			if (licenseEntry == null) {
				licenseEntry = leadingLicenseEntry;
			}

			if (licenseEntry == null) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"No license entry offers key type ",
						generateRequest.getKeyType(), " for product ",
						productName, " on version ",
						generateRequest.getVersion()));
			}

			licensedProducts.put(
				entitlement.getEntitlementId(),
				new LicensedProduct(
					product.getExternalReferenceCode(), licenseEntry,
					productName));
		}

		return licensedProducts;
	}

	private List<Long> _getRenewedActivationKeyIds(
			GenerateRequest generateRequest)
		throws Exception {

		ActivationKey activationKey = _fetchRenewedActivationKey(
			generateRequest);

		if (activationKey == null) {
			return Collections.emptyList();
		}

		return Collections.singletonList(activationKey.getActivationKeyId());
	}

	private String _getSizing(GenerateRequest generateRequest) {
		if (_isComplimentary(generateRequest)) {
			return _SIZING_COMPLIMENTARY;
		}

		return _SIZING_DEFAULT;
	}

	private String _getSkuExternalReferenceCode(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return null;
		}

		return entitlementDefinition.getSkuExternalReferenceCode();
	}

	private boolean _isComplimentary(GenerateRequest generateRequest) {
		return Objects.equals(
			LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY,
			generateRequest.getKeyType());
	}

	private List<Entitlement> _toBundleEntitlements(
		List<Entitlement> bundleEntitlements,
		Entitlement subscriptionEntitlement) {

		List<Entitlement> entitlements = new ArrayList<>();

		entitlements.add(subscriptionEntitlement);

		String skuExternalReferenceCode = _getSkuExternalReferenceCode(
			subscriptionEntitlement);

		for (Entitlement bundleEntitlement : bundleEntitlements) {
			if ((bundleEntitlement.getEntitlementId() ==
					subscriptionEntitlement.getEntitlementId()) ||
				(Validator.isNotNull(skuExternalReferenceCode) &&
				 Objects.equals(
					 skuExternalReferenceCode,
					 _getSkuExternalReferenceCode(bundleEntitlement)))) {

				continue;
			}

			entitlements.add(bundleEntitlement);
		}

		return entitlements;
	}

	private Date _toDate(Instant instant) {
		if (instant == null) {
			return null;
		}

		return Date.from(instant);
	}

	private String _toLicenseXML(
			String description, Date expirationDate,
			GenerateRequest generateRequest, LicensedProduct licensedProduct,
			Project project, GenerateRequest.Server server, Date startDate)
		throws Exception {

		LicenseEntry licenseEntry = licensedProduct._getLicenseEntry();

		String productName = licensedProduct._getProductName();

		String accountName = project.getName();
		String environmentName = generateRequest.getEnvironmentName();
		String hostName = ServerInfoUtil.toCommaSeparated(server.getHostName());
		String ipAddresses = ServerInfoUtil.toCommaSeparated(
			server.getIpAddresses());
		int licenseVersion = LicenseVersion.getLicenseVersion(
			productName, generateRequest.getVersion());
		String macAddresses = ServerInfoUtil.toCommaSeparated(
			server.getMacAddresses());
		String sizing = _getSizing(generateRequest);
		String version = generateRequest.getVersion();

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, environmentName, 0, 0, 0, 0, 0, sizing, description,
			StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, environmentName, 0, 0, 0, 0, 0, sizing, description,
			StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);
	}

	private static final String _SIZING_COMPLIMENTARY = "Sizing 4";

	private static final String _SIZING_DEFAULT = "Sizing 1";

	private static final Log _log = LogFactory.getLog(
		LicenseKeyGenerationService.class);

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private KeyedLock _keyedLock;

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

	@Autowired
	private LicenseKeyService _licenseKeyService;

	private final VersionComparator _versionComparator =
		new VersionComparator();

	private static class LicensedProduct {

		private LicensedProduct(
			String externalReferenceCode, LicenseEntry licenseEntry,
			String productName) {

			_externalReferenceCode = externalReferenceCode;
			_licenseEntry = licenseEntry;
			_productName = productName;
		}

		private String _getExternalReferenceCode() {
			return _externalReferenceCode;
		}

		private LicenseEntry _getLicenseEntry() {
			return _licenseEntry;
		}

		private String _getProductName() {
			return _productName;
		}

		private final String _externalReferenceCode;
		private final LicenseEntry _licenseEntry;
		private final String _productName;

	}

}