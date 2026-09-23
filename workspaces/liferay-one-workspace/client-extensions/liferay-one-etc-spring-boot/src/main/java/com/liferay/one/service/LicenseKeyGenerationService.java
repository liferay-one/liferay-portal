/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.exception.LicenseKeyEntitlementException;
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
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TimeZone;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Pedro Oliveira
 */
@Component
public class LicenseKeyGenerationService {

	public String generateDeveloperLicenseXML(
			Project project, String productName, String version)
		throws Exception {

		int comparison = _versionComparator.compare(
			version, LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION);

		if (comparison < 0) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"Developer keys are not available for version ", version,
					". The minimum version is ",
					LicenseKeyGenerationConstants.MINIMUM_DEVELOPER_VERSION));
		}

		if (!_isEntitledProduct(productName, project)) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"The project is not entitled to ", productName,
					", so no developer key can be generated for it"));
		}

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

		calendar.set(Calendar.MILLISECOND, 0);

		Date startDate = calendar.getTime();

		calendar.add(Calendar.MONTH, _DEVELOPER_DURATION_MONTHS);

		Date expirationDate = calendar.getTime();

		String accountName = project.getName();
		String description = productName + " Developer";
		int licenseVersion = LicenseVersion.getLicenseVersion(
			productName, version);

		String key = _licenseKeyGenerator.generateKey(
			accountName, description, LicenseConstants.TYPE_DEVELOPER,
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, accountName, 0, 0, 0, 0, 0, _SIZING_DEFAULT, description,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, description, LicenseConstants.TYPE_DEVELOPER,
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, accountName, 0, 0, 0, 0, 0, _SIZING_DEFAULT, description,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, startDate, expirationDate);
	}

	public ActivationKey generateActivationKey(GenerateRequest generateRequest)
		throws Exception {

		if (ListUtil.isEmpty(generateRequest.getBundleEntitlementIds())) {
			throw new LicenseKeyEntitlementException(
				"No product was selected for this bundle");
		}

		if (ListUtil.isEmpty(generateRequest.getServers())) {
			throw new LicenseKeyEntitlementException(
				"No server was given for the activation keys");
		}

		Project project = generateRequest.getProject();

		// The quota is read and then spent, so the whole sequence is
		// serialized per project. Two concurrent requests would otherwise both
		// pass a check neither one had yet consumed.

		return _keyedLock.withLock(
			project.getExternalReferenceCode(),
			() -> _generateActivationKey(generateRequest, project));
	}

	public static class GenerateRequest {

		public GenerateRequest(
			List<Long> bundleEntitlementIds, String dataCenterLocation,
			String description, String environmentName, String keyType,
			Project project, List<Server> servers,
			long subscriptionEntitlementId, String version,
			String workspaceName, String workspaceOwnerEmail) {

			_bundleEntitlementIds = bundleEntitlementIds;
			_dataCenterLocation = dataCenterLocation;
			_description = description;
			_environmentName = environmentName;
			_keyType = keyType;
			_project = project;
			_servers = servers;
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

		public List<Server> getServers() {
			return _servers;
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
		private final List<Server> _servers;
		private final long _subscriptionEntitlementId;
		private final String _version;
		private final String _workspaceName;
		private final String _workspaceOwnerEmail;

	}

	private ActivationKey _addActivationKey(
			String description, Date expirationDate,
			GenerateRequest generateRequest, LicenseEntry leadingLicenseEntry,
			Project project, Date startDate)
		throws Exception {

		return _activationKeyService.addActivationKey(
			project.getAccountId(), project.getName(), true,
			_toAdditionalInfo(generateRequest), false, description,
			StringPool.BLANK, expirationDate, generateRequest.getKeyType(),
			leadingLicenseEntry.getType(), generateRequest.getEnvironmentName(),
			generateRequest.getVersion(), project.getExternalReferenceCode(),
			startDate);
	}

	private LicenseKey _addLicenseKey(
			ActivationKey activationKey, String description,
			Entitlement entitlement, Date expirationDate,
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
			activationKey.getActivationKeyId(), true, null,
			licensedProduct._getExternalReferenceCode(), false, description,
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
			_SIZING_DEFAULT, startDate);
	}

	private void _checkQuota(
			List<Entitlement> bundleEntitlements,
			GenerateRequest generateRequest, Project project)
		throws Exception {

		List<GenerateRequest.Server> servers = generateRequest.getServers();

		int requestedCount = servers.size();

		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveLicenseKeyCounts(
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

	private Entitlement _findEntitlement(
		List<Entitlement> entitlements, long entitlementId) {

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
			entitlements, generateRequest.getSubscriptionEntitlementId());

		if (subscriptionEntitlement == null) {
			throw new LicenseKeyEntitlementException(
				"The project is not entitled to the selected subscription");
		}

		Date expirationDate = _toDate(
			subscriptionEntitlement.getEndDateInstant());
		Date startDate = _toDate(subscriptionEntitlement.getStartDateInstant());

		List<Entitlement> bundleEntitlements = _getBundleEntitlements(
			entitlements, generateRequest.getBundleEntitlementIds());

		_checkQuota(bundleEntitlements, generateRequest, project);

		Map<Long, LicensedProduct> licensedProducts = _getLicensedProducts(
			bundleEntitlements, generateRequest);

		Entitlement leadingEntitlement = _getLeadingEntitlement(
			bundleEntitlements, generateRequest);

		LicensedProduct leadingLicensedProduct = licensedProducts.get(
			leadingEntitlement.getEntitlementId());

		String description = generateRequest.getDescription();

		if (Validator.isNull(description)) {
			description = generateRequest.getEnvironmentName();
		}

		ActivationKey activationKey = _addActivationKey(
			description, expirationDate, generateRequest,
			leadingLicensedProduct._getLicenseEntry(), project, startDate);

		for (GenerateRequest.Server server : generateRequest.getServers()) {
			for (Entitlement entitlement : bundleEntitlements) {
				_addLicenseKey(
					activationKey, description, entitlement, expirationDate,
					generateRequest,
					licensedProducts.get(entitlement.getEntitlementId()),
					project, server, startDate);
			}
		}

		return activationKey;
	}

	private List<Entitlement> _getBundleEntitlements(
			List<Entitlement> entitlements, List<Long> bundleEntitlementIds)
		throws Exception {

		List<Entitlement> bundleEntitlements = new ArrayList<>();

		Set<Long> entitlementIds = new LinkedHashSet<>(bundleEntitlementIds);

		for (long entitlementId : entitlementIds) {
			Entitlement entitlement = _findEntitlement(
				entitlements, entitlementId);

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

	private Entitlement _getLeadingEntitlement(
		List<Entitlement> bundleEntitlements, GenerateRequest generateRequest) {

		Entitlement entitlement = _findEntitlement(
			bundleEntitlements, generateRequest.getSubscriptionEntitlementId());

		if (entitlement != null) {
			return entitlement;
		}

		return bundleEntitlements.get(0);
	}

	private Map<Long, LicensedProduct> _getLicensedProducts(
			List<Entitlement> bundleEntitlements,
			GenerateRequest generateRequest)
		throws Exception {

		Map<Long, LicensedProduct> licensedProducts = new HashMap<>();

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

			LicenseEntry licenseEntry =
				_licenseKeyGenerateFormService.fetchLicenseEntry(
					generateRequest.getKeyType(),
					_licenseKeyGenerateFormService.getLicenseEntryFamily(
						product),
					generateRequest.getVersion());

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

	private boolean _isEntitledProduct(String productName, Project project)
		throws Exception {

		for (Entitlement entitlement :
				_entitlementService.getActiveEntitlements(
					project.getExternalReferenceCode())) {

			Product product = _licenseKeyGenerateFormService.fetchProduct(
				entitlement);

			if ((product != null) &&
				Objects.equals(
					productName, CommerceProductUtil.getName(product))) {

				return true;
			}
		}

		return false;
	}

	private void _put(JSONObject jsonObject, String name, String value) {
		if (Validator.isNotNull(value)) {
			jsonObject.put(name, value);
		}
	}

	private String _toAdditionalInfo(GenerateRequest generateRequest) {
		JSONObject jsonObject = new JSONObject();

		_put(
			jsonObject, "dataCenterLocation",
			generateRequest.getDataCenterLocation());
		_put(jsonObject, "workspaceName", generateRequest.getWorkspaceName());
		_put(
			jsonObject, "workspaceOwnerEmail",
			generateRequest.getWorkspaceOwnerEmail());

		return jsonObject.toString();
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
		String version = generateRequest.getVersion();

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, environmentName, 0, 0, 0, 0, 0, _SIZING_DEFAULT,
			description, StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			version, environmentName, 0, 0, 0, 0, 0, _SIZING_DEFAULT,
			description, StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);
	}

	private static final int _DEVELOPER_DURATION_MONTHS = 12;

	private static final String _SIZING_DEFAULT = "Sizing 1";

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