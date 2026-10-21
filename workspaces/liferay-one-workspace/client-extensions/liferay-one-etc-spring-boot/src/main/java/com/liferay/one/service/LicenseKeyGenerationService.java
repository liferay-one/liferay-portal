/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.license.LicenseKeyType;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.ActivationKeyScope;
import com.liferay.one.model.Entitlement;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
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

	public ActivationKey generateActivationKey(
			Account account, GenerateRequest generateRequest)
		throws Exception {

		if (_isComplimentary(generateRequest)) {
			throw new LicenseKeyEntitlementException(
				"A complimentary key requires a project");
		}

		if (Validator.isNotNull(
				generateRequest.
					getRenewedActivationKeyExternalReferenceCode())) {

			throw new LicenseKeyEntitlementException(
				"An activation key without a project cannot be renewed");
		}

		return _generateActivationKey(
			ActivationKeyScope.of(account), generateRequest);
	}

	public ActivationKey generateActivationKey(GenerateRequest generateRequest)
		throws Exception {

		return _generateActivationKey(
			ActivationKeyScope.of(generateRequest.getProject()),
			generateRequest);
	}

	public String generateDeveloperLicenseXML(
			List<Long> bundleEntitlementIds, String keyType, String productName,
			Project project, String version)
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

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(
				project.getExternalReferenceCode());

		Entitlement entitlement = _fetchEntitledProductEntitlement(
			entitlements, keyType, productName);

		if (entitlement == null) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"The project is not entitled to ", productName,
					", so no developer key can be generated for it"));
		}

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

		calendar.set(Calendar.MILLISECOND, 0);

		Date startDate = calendar.getTime();

		Date expirationDate = _getExpirationDate(entitlement, startDate);

		List<String> licenseXMLs = new ArrayList<>();

		licenseXMLs.add(
			_toDeveloperLicenseXML(
				entitlement, expirationDate, keyType, productName, project,
				startDate, version));

		for (Map.Entry<String, Entitlement> entry :
				_getDeveloperBundleEntitlements(
					bundleEntitlementIds, entitlements, productName, version
				).entrySet()) {

			licenseXMLs.add(
				_toDeveloperLicenseXML(
					entry.getValue(), expirationDate, keyType, entry.getKey(),
					project, startDate, version));
		}

		if (licenseXMLs.size() == 1) {
			return licenseXMLs.get(0);
		}

		return _licenseKeyExporter.aggregateXMLs(
			licenseXMLs.toArray(new String[0]));
	}

	public static class GenerateRequest {

		public GenerateRequest(
			List<Long> bundleEntitlementIds, String dataCenterLocation,
			String description, String environmentName, String keyType,
			int maxClusterNodes, Project project, String purpose,
			String renewedActivationKeyExternalReferenceCode,
			List<Server> servers, Date startDate,
			long subscriptionEntitlementId, String version,
			boolean virtualCluster, String workspaceName,
			String workspaceOwnerEmail) {

			_bundleEntitlementIds = bundleEntitlementIds;
			_dataCenterLocation = dataCenterLocation;
			_description = description;
			_environmentName = environmentName;
			_keyType = keyType;
			_maxClusterNodes = maxClusterNodes;
			_project = project;
			_purpose = purpose;
			_renewedActivationKeyExternalReferenceCode =
				renewedActivationKeyExternalReferenceCode;
			_servers = servers;
			_startDate = startDate;
			_subscriptionEntitlementId = subscriptionEntitlementId;
			_version = version;
			_virtualCluster = virtualCluster;
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

		public int getMaxClusterNodes() {
			return _maxClusterNodes;
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

		public boolean isVirtualCluster() {
			return _virtualCluster;
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
		private final int _maxClusterNodes;
		private final Project _project;
		private final String _purpose;
		private final String _renewedActivationKeyExternalReferenceCode;
		private final List<Server> _servers;
		private final Date _startDate;
		private final long _subscriptionEntitlementId;
		private final String _version;
		private final boolean _virtualCluster;
		private final String _workspaceName;
		private final String _workspaceOwnerEmail;

	}

	private ActivationKey _addActivationKey(
			ActivationKeyScope activationKeyScope, Date expirationDate,
			GenerateRequest generateRequest, String licenseKeyFamily,
			Date startDate)
		throws Exception {

		String type = generateRequest.getKeyType();

		if (_isVirtualCluster(generateRequest)) {
			type = LicenseConstants.TYPE_VIRTUAL_CLUSTER;
		}

		return _activationKeyService.addActivationKey(
			activationKeyScope.getAccountId(), true, expirationDate,
			licenseKeyFamily,
			activationKeyScope.getProjectExternalReferenceCode(), startDate,
			type);
	}

	private LicenseKey _addLicenseKey(
			ActivationKey activationKey, ActivationKeyScope activationKeyScope,
			boolean complimentary, String description, Entitlement entitlement,
			Date expirationDate, GenerateRequest generateRequest,
			LicensedProduct licensedProduct, GenerateRequest.Server server,
			Date startDate)
		throws Exception {

		LicenseEntry licenseEntry = licensedProduct._getLicenseEntry();
		String productId = licensedProduct._getProductId();
		String productName = licensedProduct._getProductName();
		String version = generateRequest.getVersion();

		return _licenseKeyService.addLicenseKey(
			activationKeyScope.getAccountId(), activationKeyScope.getName(),
			activationKey.getActivationKeyId(), true,
			_getAdditionalInfo(generateRequest), complimentary,
			generateRequest.getDataCenterLocation(), description,
			StringPool.BLANK, entitlement.getEntitlementDefinitionId(),
			entitlement.getEntitlementId(), expirationDate,
			ServerInfoUtil.toCommaSeparated(server.getHostName()),
			ServerInfoUtil.toCommaSeparated(server.getIpAddresses()),
			_toLicenseXML(
				activationKeyScope, description, expirationDate,
				generateRequest, licensedProduct, server, startDate),
			LicenseKeyGenerateFormService.getLicenseKeyFamily(entitlement),
			licenseEntry.getName(), licenseEntry.getType(),
			_getLicenseVersion(productId, productName, version),
			ServerInfoUtil.toCommaSeparated(server.getMacAddresses()),
			LicenseKeyGenerationConstants.getMaxClusterNodes(
				licenseEntry.getType(), generateRequest.getMaxClusterNodes()),
			0, 0, 0, 0, generateRequest.getEnvironmentName(), null,
			generateRequest.getEnvironmentName(), productId, productName,
			_getProductVersion(productId, version),
			activationKeyScope.getProjectExternalReferenceCode(),
			StringPool.BLANK, _getSizing(generateRequest), startDate,
			generateRequest.getWorkspaceName(),
			generateRequest.getWorkspaceOwnerEmail());
	}

	private void _checkComplimentary(ActivationKeyScope activationKeyScope)
		throws Exception {

		if (!_licenseKeyGenerateFormService.isAllowComplimentary(
				activationKeyScope.getAccountId())) {

			throw new LicenseKeyEntitlementException(
				"The account is not allowed to generate a complimentary key");
		}

		int complimentaryActivationKeysCount =
			_activationKeyService.getActivationKeysCount(
				true, activationKeyScope.getProjectExternalReferenceCode(),
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
			ActivationKeyScope activationKeyScope,
			List<Entitlement> bundleEntitlements,
			List<Entitlement> entitlements, GenerateRequest generateRequest)
		throws Exception {

		int requestedCount = _getRequestedCount(generateRequest);

		Map<Long, Integer> licenseKeyCounts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				activationKeyScope, entitlements,
				_getRenewedActivationKeyIds(generateRequest));

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

	private Entitlement _fetchEntitledProductEntitlement(
			List<Entitlement> entitlements, String keyType, String productName)
		throws Exception {

		for (Entitlement entitlement : entitlements) {
			if (!_licenseKeyGenerateFormService.grantsLicense(entitlement) ||
				!Objects.equals(
					keyType,
					LicenseKeyGenerateFormService.getLicenseKeyType(
						entitlement))) {

				continue;
			}

			Product product = _licenseKeyGenerateFormService.fetchProduct(
				entitlement);

			if ((product != null) &&
				Objects.equals(
					productName,
					LicenseKeyGenerateFormService.getProductName(
						entitlement, product))) {

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
			generateRequest.getVersion(), _isVirtualCluster(generateRequest));
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

	private Entitlement _fetchStartedEntitlement(
		List<Entitlement> entitlements) {

		Entitlement startedEntitlement = null;

		for (Entitlement entitlement : entitlements) {
			Instant endDateInstant = entitlement.getEndDateInstant();

			if (!entitlement.isSelfServiceTrial() || (endDateInstant == null) ||
				((startedEntitlement != null) &&
				 !endDateInstant.isBefore(
					 startedEntitlement.getEndDateInstant()))) {

				continue;
			}

			startedEntitlement = entitlement;
		}

		return startedEntitlement;
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
			ActivationKeyScope activationKeyScope,
			GenerateRequest generateRequest)
		throws Exception {

		if (!_isComplimentary(generateRequest) &&
			ListUtil.isEmpty(generateRequest.getBundleEntitlementIds())) {

			throw new LicenseKeyEntitlementException(
				"No product was selected for this bundle");
		}

		if (_isVirtualCluster(generateRequest)) {
			LicenseKeyType licenseKeyType = LicenseKeyType.fetchLicenseKeyType(
				generateRequest.getKeyType());

			if ((licenseKeyType == null) ||
				!licenseKeyType.isVirtualClusterSupported()) {

				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"A ", generateRequest.getKeyType(),
						" key cannot be a virtual cluster key"));
			}

			if (generateRequest.getMaxClusterNodes() < 1) {
				throw new LicenseKeyEntitlementException(
					"No cluster nodes were given for the virtual cluster key");
			}
		}
		else if (ListUtil.isEmpty(generateRequest.getServers())) {
			throw new LicenseKeyEntitlementException(
				"No server was given for the activation keys");
		}

		return _keyedLock.withLock(
			activationKeyScope.getLockKey(),
			() -> _generateActivationKeyInLock(
				activationKeyScope, generateRequest));
	}

	private ActivationKey _generateActivationKeyInLock(
			ActivationKeyScope activationKeyScope,
			GenerateRequest generateRequest)
		throws Exception {

		List<Entitlement> entitlements =
			_entitlementService.getActiveEntitlements(activationKeyScope);

		Entitlement subscriptionEntitlement = _findEntitlement(
			generateRequest.getSubscriptionEntitlementId(), entitlements);

		if (subscriptionEntitlement == null) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"The ", activationKeyScope.getType(),
					" is not entitled to the selected subscription"));
		}

		List<Entitlement> bundleEntitlements = _getBundleEntitlements(
			activationKeyScope, generateRequest.getBundleEntitlementIds(),
			entitlements);

		if (!activationKeyScope.isProject()) {
			subscriptionEntitlement =
				_getSelfServiceTrialSubscriptionEntitlement(
					bundleEntitlements, entitlements, subscriptionEntitlement);
		}

		boolean complimentary = _isComplimentary(generateRequest);

		Date expirationDate = _toDate(
			subscriptionEntitlement.getEndDateInstant());
		Date startDate = _toDate(subscriptionEntitlement.getStartDateInstant());

		boolean startsLicenseKeyDuration = false;

		if (complimentary) {
			_checkComplimentary(activationKeyScope);
			_checkComplimentaryEntitlement(true, subscriptionEntitlement);
			_checkComplimentaryRequest(generateRequest);

			Calendar calendar = Calendar.getInstance(
				TimeZone.getTimeZone("UTC"));

			if (generateRequest.getStartDate() != null) {
				calendar.setTime(generateRequest.getStartDate());
			}

			calendar.set(Calendar.MILLISECOND, 0);

			startDate = calendar.getTime();

			Date subscriptionEndDate = expirationDate;

			if ((subscriptionEndDate != null) &&
				!startDate.before(subscriptionEndDate)) {

				throw new LicenseKeyDateException(
					"The start date must be before the subscription end date");
			}

			calendar.add(
				Calendar.DATE,
				_getComplimentaryDurationDays(subscriptionEntitlement));

			expirationDate = calendar.getTime();

			if ((subscriptionEndDate != null) &&
				expirationDate.after(subscriptionEndDate)) {

				expirationDate = subscriptionEndDate;
			}

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

			startsLicenseKeyDuration = _startsLicenseKeyDuration(
				bundleEntitlements);

			if (startsLicenseKeyDuration) {
				Calendar calendar = Calendar.getInstance(
					TimeZone.getTimeZone("UTC"));

				calendar.set(Calendar.MILLISECOND, 0);

				startDate = calendar.getTime();

				Entitlement startedEntitlement = _fetchStartedEntitlement(
					bundleEntitlements);

				if (startedEntitlement == null) {
					calendar.add(
						Calendar.DATE,
						LicenseKeyGenerateFormService.getLicenseKeyDurationDays(
							subscriptionEntitlement));

					expirationDate = calendar.getTime();
				}
				else {
					expirationDate = _toDate(
						startedEntitlement.getEndDateInstant());

					if (startedEntitlement.getStartDateInstant() != null) {
						startDate = _toDate(
							startedEntitlement.getStartDateInstant());
					}
				}
			}
		}

		_checkQuota(
			activationKeyScope, bundleEntitlements, entitlements,
			generateRequest);

		Map<Long, LicensedProduct> licensedProducts = _getLicensedProducts(
			bundleEntitlements, generateRequest, subscriptionEntitlement);

		if (!complimentary && !startsLicenseKeyDuration) {
			LicensedProduct licensedProduct = licensedProducts.get(
				subscriptionEntitlement.getEntitlementId());

			LicenseEntry licenseEntry = licensedProduct._getLicenseEntry();

			boolean allowPermanentLicenses = false;

			if (activationKeyScope.isProject()) {
				allowPermanentLicenses =
					_licenseKeyGenerateFormService.isAllowPermanentLicenses(
						activationKeyScope.getAccountId());
			}

			expirationDate = _toDate(
				LicenseKeyGenerateFormService.getLicenseKeyExpirationInstant(
					allowPermanentLicenses, subscriptionEntitlement,
					licenseEntry.getType()));
		}

		String description = generateRequest.getDescription();

		if (Validator.isNull(description)) {
			description = generateRequest.getEnvironmentName();
		}

		ActivationKey activationKey = _addActivationKey(
			activationKeyScope, expirationDate, generateRequest,
			LicenseKeyGenerateFormService.getLicenseKeyFamily(
				subscriptionEntitlement),
			startDate);

		List<Entitlement> startedEntitlements = new ArrayList<>();

		try {
			for (GenerateRequest.Server server : _getServers(generateRequest)) {
				for (Entitlement entitlement : bundleEntitlements) {
					_addLicenseKey(
						activationKey, activationKeyScope, complimentary,
						description, entitlement, expirationDate,
						generateRequest,
						licensedProducts.get(entitlement.getEntitlementId()),
						server, startDate);
				}
			}

			if (startsLicenseKeyDuration) {
				_startLicenseKeyDuration(
					bundleEntitlements, expirationDate, startDate,
					startedEntitlements, subscriptionEntitlement);
			}

			ActivationKey renewedActivationKey = _fetchRenewedActivationKey(
				generateRequest);

			if (renewedActivationKey != null) {
				_activationKeyService.updateActivationKeyActive(
					renewedActivationKey.getActivationKeyId(), false);
			}
		}
		catch (Exception exception) {
			_activationKeyService.deactivatePartialActivationKey(activationKey);

			_restoreEntitlementDates(startedEntitlements);

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
			ActivationKeyScope activationKeyScope,
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
						"The ", activationKeyScope.getType(),
						" is not entitled to entitlement ", entitlementId,
						" selected for this bundle"));
			}

			bundleEntitlements.add(entitlement);
		}

		return bundleEntitlements;
	}

	private int _getComplimentaryDurationDays(Entitlement entitlement) {
		int licenseKeyDurationDays =
			LicenseKeyGenerateFormService.getLicenseKeyDurationDays(
				entitlement);

		if (licenseKeyDurationDays > 0) {
			return licenseKeyDurationDays;
		}

		return LicenseKeyGenerationConstants.COMPLIMENTARY_DURATION_DAYS;
	}

	private Map<String, Entitlement> _getDeveloperBundleEntitlements(
			List<Long> bundleEntitlementIds, List<Entitlement> entitlements,
			String productName, String version)
		throws Exception {

		Map<String, Entitlement> bundleEntitlements = new LinkedHashMap<>();

		for (long bundleEntitlementId :
				new LinkedHashSet<>(bundleEntitlementIds)) {

			Entitlement entitlement = _findEntitlement(
				bundleEntitlementId, entitlements);

			if ((entitlement == null) ||
				!_licenseKeyGenerateFormService.grantsLicense(entitlement)) {

				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"The project is not entitled to entitlement ",
						bundleEntitlementId, " selected for this bundle"));
			}

			Product product = _licenseKeyGenerateFormService.fetchProduct(
				entitlement);

			if (product == null) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"No product backs entitlement ", bundleEntitlementId,
						" selected for this bundle"));
			}

			if (CommerceProductUtil.isApp(product)) {
				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"Entitlement ", bundleEntitlementId,
						" is for a Marketplace app and cannot be bundled with ",
						"a developer key"));
			}

			String bundleProductName =
				LicenseKeyGenerateFormService.getProductName(
					entitlement, product);

			if (Objects.equals(bundleProductName, productName)) {
				continue;
			}

			if (LicenseKeyGenerateFormService.isLeadingLicenseKeyFamily(
					LicenseKeyGenerateFormService.getLicenseKeyFamily(
						entitlement))) {

				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"Entitlement ", bundleEntitlementId,
						" is for another leading product and cannot be ",
						"bundled with ", productName));
			}

			if (!_licenseKeyGenerateFormService.isLicensedForVersion(
					LicenseKeyGenerateFormService.getLicenseKeyFamily(
						entitlement),
					version)) {

				throw new LicenseKeyEntitlementException(
					StringBundler.concat(
						"Product ", bundleProductName,
						" is not licensed for version ", version));
			}

			bundleEntitlements.putIfAbsent(bundleProductName, entitlement);
		}

		return bundleEntitlements;
	}

	private String _getDeveloperLabel(String keyType) {
		if (Objects.equals(keyType, LicenseConstants.TYPE_DEVELOPER_CLUSTER)) {
			return "Developer Cluster";
		}

		return "Developer";
	}

	private Date _getExpirationDate(Entitlement entitlement, Date startDate)
		throws Exception {

		int licenseKeyDurationDays =
			LicenseKeyGenerateFormService.getLicenseKeyDurationDays(
				entitlement);

		if (licenseKeyDurationDays > 0) {
			Calendar calendar = Calendar.getInstance(
				TimeZone.getTimeZone("UTC"));

			calendar.setTime(startDate);

			calendar.add(Calendar.DATE, licenseKeyDurationDays);

			return calendar.getTime();
		}

		Instant endDateInstant = entitlement.getEndDateInstant();

		if (endDateInstant == null) {
			throw new LicenseKeyEntitlementException(
				StringBundler.concat(
					"Entitlement ", entitlement.getName(),
					" has no end date or license key duration, so no key can ",
					"be generated for it"));
		}

		return Date.from(endDateInstant);
	}

	private int _getLicenseVersion(
		String productId, String productName, String version) {

		if (Objects.equals(productId, LicenseConstants.PRODUCT_ID_PORTAL)) {
			return LicenseVersion.getLicenseVersion(productName, version);
		}

		return LicenseVersion.getAppLicenseVersion();
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

			String productName = LicenseKeyGenerateFormService.getProductName(
				entitlement, product);

			LicenseEntry licenseEntry = _fetchLicenseEntry(
				generateRequest, entitlement);

			if (licenseEntry != null) {
				productName = licenseEntry.getProductName();
			}
			else {
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
					licenseEntry,
					LicenseKeyGenerateFormService.getProductId(
						entitlement, product),
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

	private int _getRequestedCount(GenerateRequest generateRequest) {
		if (_isVirtualCluster(generateRequest)) {
			return generateRequest.getMaxClusterNodes();
		}

		List<GenerateRequest.Server> servers = generateRequest.getServers();

		return servers.size();
	}

	/**
	 * Returns the subscription entitlement that the order of the add-on
	 * entitlements in the bundle created. An account that holds more than one
	 * trial holds more than one DXP trial entitlement, and the form offers
	 * only one of them, so a key for the add-on of one trial would otherwise
	 * start the DXP trial of another.
	 */
	private Entitlement _getSelfServiceTrialSubscriptionEntitlement(
			List<Entitlement> bundleEntitlements,
			List<Entitlement> entitlements, Entitlement subscriptionEntitlement)
		throws Exception {

		String skuExternalReferenceCode = _getSkuExternalReferenceCode(
			subscriptionEntitlement);

		if (Validator.isNull(skuExternalReferenceCode)) {
			return subscriptionEntitlement;
		}

		Entitlement addOnEntitlement = null;

		for (Entitlement bundleEntitlement : bundleEntitlements) {
			if (!skuExternalReferenceCode.equals(
					_getSkuExternalReferenceCode(bundleEntitlement))) {

				addOnEntitlement = bundleEntitlement;

				break;
			}
		}

		if ((addOnEntitlement == null) ||
			(addOnEntitlement.getCommerceOrderItemId() == 0)) {

			return subscriptionEntitlement;
		}

		OrderItem addOnOrderItem =
			_commerceOrderItemService.fetchCommerceOrderItem(
				addOnEntitlement.getCommerceOrderItemId());

		if (addOnOrderItem == null) {
			return subscriptionEntitlement;
		}

		Set<Long> orderItemIds = new HashSet<>();

		for (OrderItem orderItem :
				_commerceOrderItemService.getCommerceOrderItems(
					addOnOrderItem.getOrderId())) {

			orderItemIds.add(orderItem.getId());
		}

		if (orderItemIds.contains(
				subscriptionEntitlement.getCommerceOrderItemId())) {

			return subscriptionEntitlement;
		}

		for (Entitlement entitlement : entitlements) {
			if (skuExternalReferenceCode.equals(
					_getSkuExternalReferenceCode(entitlement)) &&
				orderItemIds.contains(entitlement.getCommerceOrderItemId())) {

				return entitlement;
			}
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				StringBundler.concat(
					"Unable to find the subscription entitlement of order ",
					addOnOrderItem.getOrderId(), " so entitlement ",
					subscriptionEntitlement.getEntitlementId(),
					" starts with the add-on entitlement ",
					addOnEntitlement.getEntitlementId()));
		}

		return subscriptionEntitlement;
	}

	private String _getProductId(Entitlement entitlement) throws Exception {
		if (LicenseKeyGenerateFormService.isLeadingLicenseKeyFamily(
				LicenseKeyGenerateFormService.getLicenseKeyFamily(
					entitlement))) {

			return LicenseConstants.PRODUCT_ID_PORTAL;
		}

		return LicenseKeyGenerateFormService.getProductId(
			entitlement,
			_licenseKeyGenerateFormService.fetchProduct(entitlement));
	}

	private String _getProductVersion(String productId, String version) {
		if (Objects.equals(productId, LicenseConstants.PRODUCT_ID_PORTAL)) {
			return version;
		}

		return LicenseKeyGenerationConstants.APP_PRODUCT_VERSION;
	}

	private List<GenerateRequest.Server> _getServers(
		GenerateRequest generateRequest) {

		if (_isVirtualCluster(generateRequest)) {
			return Collections.singletonList(
				new GenerateRequest.Server(
					StringPool.BLANK, StringPool.BLANK, StringPool.BLANK));
		}

		return generateRequest.getServers();
	}

	private String _getSizing(GenerateRequest generateRequest) {
		if (_isComplimentary(generateRequest)) {
			return _SIZING_COMPLIMENTARY;
		}

		return _SIZING_DEFAULT;
	}

	private String _getSkuExternalReferenceCode(Entitlement entitlement) {
		return entitlement.getSkuExternalReferenceCode();
	}

	private boolean _isComplimentary(GenerateRequest generateRequest) {
		return Objects.equals(
			LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY,
			generateRequest.getKeyType());
	}

	private boolean _isVirtualCluster(GenerateRequest generateRequest) {
		return generateRequest.isVirtualCluster();
	}

	/**
	 * Restores the dates that a failed key generation wrote, so the trial
	 * window starts again with the next key instead of running without one.
	 */
	private void _restoreEntitlementDates(
		List<Entitlement> startedEntitlements) {

		for (Entitlement entitlement : startedEntitlements) {
			try {
				_entitlementService.updateEntitlementDates(
					entitlement.getEndDateInstant(),
					entitlement.getEntitlementId(),
					entitlement.getStartDateInstant());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to restore the dates of entitlement " +
						entitlement.getEntitlementId(),
					exception);
			}
		}
	}

	private void _startLicenseKeyDuration(
			List<Entitlement> bundleEntitlements, Date expirationDate,
			Date startDate, List<Entitlement> startedEntitlements,
			Entitlement subscriptionEntitlement)
		throws Exception {

		for (Entitlement entitlement : bundleEntitlements) {
			if ((entitlement.getEntitlementId() ==
					subscriptionEntitlement.getEntitlementId()) ||
				!_startsLicenseKeyDuration(entitlement)) {

				continue;
			}

			_entitlementService.updateEntitlementDates(
				expirationDate.toInstant(), entitlement.getEntitlementId(),
				startDate.toInstant());

			startedEntitlements.add(entitlement);
		}

		if (_startsLicenseKeyDuration(subscriptionEntitlement)) {
			_entitlementService.updateEntitlementDates(
				expirationDate.toInstant(),
				subscriptionEntitlement.getEntitlementId(),
				startDate.toInstant());

			startedEntitlements.add(subscriptionEntitlement);
		}
	}

	private boolean _startsLicenseKeyDuration(Entitlement entitlement) {
		if (entitlement.isSelfServiceTrial() &&
			(entitlement.getEndDateInstant() == null)) {

			return true;
		}

		return false;
	}

	private boolean _startsLicenseKeyDuration(List<Entitlement> entitlements) {
		for (Entitlement entitlement : entitlements) {
			if (_startsLicenseKeyDuration(entitlement)) {
				return true;
			}
		}

		return false;
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

	private String _toDeveloperLicenseXML(
			Entitlement entitlement, Date expirationDate, String keyType,
			String productName, Project project, Date startDate, String version)
		throws Exception {

		String accountName = project.getName();
		String description = StringBundler.concat(
			productName, StringPool.SPACE, _getDeveloperLabel(keyType));

		LicenseEntry licenseEntry =
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				keyType,
				LicenseKeyGenerateFormService.getLicenseKeyFamily(entitlement),
				version, false);

		if (licenseEntry != null) {
			description = licenseEntry.getName();
			productName = licenseEntry.getProductName();
		}

		String productId = _getProductId(entitlement);

		int licenseVersion = _getLicenseVersion(
			productId, productName, version);
		String productVersion = _getProductVersion(productId, version);

		String key = _licenseKeyGenerator.generateKey(
			accountName, description, keyType, licenseVersion, productName,
			productId, productVersion, accountName, 0, 0,
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS, 0, 0,
			_SIZING_DEFAULT, description, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, description, keyType, licenseVersion, productName,
			productId, productVersion, accountName, 0, 0,
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS, 0, 0,
			_SIZING_DEFAULT, description, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);
	}

	private String _toLicenseXML(
			ActivationKeyScope activationKeyScope, String description,
			Date expirationDate, GenerateRequest generateRequest,
			LicensedProduct licensedProduct, GenerateRequest.Server server,
			Date startDate)
		throws Exception {

		LicenseEntry licenseEntry = licensedProduct._getLicenseEntry();

		String productId = licensedProduct._getProductId();
		String productName = licensedProduct._getProductName();

		String accountName = activationKeyScope.getName();
		String environmentName = generateRequest.getEnvironmentName();
		String hostName = ServerInfoUtil.toCommaSeparated(server.getHostName());
		String ipAddresses = ServerInfoUtil.toCommaSeparated(
			server.getIpAddresses());
		int licenseVersion = _getLicenseVersion(
			productId, productName, generateRequest.getVersion());
		String macAddresses = ServerInfoUtil.toCommaSeparated(
			server.getMacAddresses());
		int maxClusterNodes = LicenseKeyGenerationConstants.getMaxClusterNodes(
			licenseEntry.getType(), generateRequest.getMaxClusterNodes());
		int maxServers = LicenseKeyGenerationConstants.getMaxServers(
			licenseEntry.getType(), 0);
		String productVersion = _getProductVersion(
			productId, generateRequest.getVersion());
		String sizing = _getSizing(generateRequest);

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, productId, productVersion,
			environmentName, maxClusterNodes, maxServers, 0, 0, 0, sizing,
			description, StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);

		return _licenseKeyExporter.toXML(
			key, accountName, licenseEntry.getName(), licenseEntry.getType(),
			licenseVersion, productName, productId, productVersion,
			environmentName, maxClusterNodes, maxServers, 0, 0, 0, sizing,
			description, StringPool.BLANK, hostName, ipAddresses, macAddresses,
			StringPool.BLANK, startDate, expirationDate);
	}

	private static final String _SIZING_COMPLIMENTARY = "Sizing 4";

	private static final String _SIZING_DEFAULT = "Sizing 1";

	private static final Log _log = LogFactory.getLog(
		LicenseKeyGenerationService.class);

	@Autowired
	private ActivationKeyService _activationKeyService;

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

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
			LicenseEntry licenseEntry, String productId, String productName) {

			_licenseEntry = licenseEntry;
			_productId = productId;
			_productName = productName;
		}

		private LicenseEntry _getLicenseEntry() {
			return _licenseEntry;
		}

		private String _getProductId() {
			return _productId;
		}

		private String _getProductName() {
			return _productName;
		}

		private final LicenseEntry _licenseEntry;
		private final String _productId;
		private final String _productName;

	}

}