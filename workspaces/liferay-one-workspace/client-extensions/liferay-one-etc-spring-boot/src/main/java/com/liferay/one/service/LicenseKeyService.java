/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.exception.LicenseKeyActiveException;
import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.license.LicenseKeyValidator;
import com.liferay.one.model.ActivationKeyScope;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.util.Validator;

import java.text.DateFormat;
import java.text.SimpleDateFormat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Amos Fong
 * @author Allen Ziegenfus
 */
@Component
public class LicenseKeyService extends OneBaseService {

	public LicenseKey addLicenseKey(
			long accountEntryId, String accountName, long activationKeyId,
			boolean active, String additionalInfo, boolean complimentary,
			String dataCenterLocation, String description, String domains,
			long entitlementDefinitionId, long entitlementId,
			Date expirationDate, String hostName, String ipAddresses,
			String key, String licenseKeyFamily, String licenseName,
			String licenseType, int licenseVersion, String macAddresses,
			int maxClusterNodes, long maxConcurrentUsers, int maxHttpSessions,
			int maxServers, long maxUsers, String name, String orderId,
			String owner, String productExternalId, String productName,
			String productVersion, String projectExternalReferenceCode,
			String serverId, String sizing, Date startDate,
			String workspaceName, String workspaceOwnerEmail)
		throws Exception {

		_licenseKeyValidator.validateMetadata(
			description, licenseType, maxClusterNodes, name, owner,
			productVersion);

		_licenseKeyValidator.validateDates(
			expirationDate, hostName, ipAddresses, licenseType, macAddresses,
			startDate);

		if (Validator.isNull(key)) {
			key = _licenseKeyGenerator.generateKey(
				accountName, licenseName, licenseType, licenseVersion,
				productName, productExternalId, productVersion, owner,
				maxClusterNodes, maxServers, maxHttpSessions,
				maxConcurrentUsers, maxUsers, sizing, description, domains,
				hostName, ipAddresses, macAddresses, serverId, startDate,
				expirationDate);
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"accountName", accountName
		).put(
			"active", active
		).put(
			"additionalInfo", additionalInfo
		).put(
			"complimentary", complimentary
		).put(
			"customExpirationDate", _toISO8601(expirationDate)
		).put(
			"dataCenterLocation", dataCenterLocation
		).put(
			"description", description
		).put(
			"domains", domains
		).put(
			"entitlementDefinitionId", entitlementDefinitionId
		).put(
			"entitlementId", entitlementId
		).put(
			"hostName", hostName
		).put(
			"ipAddresses", ipAddresses
		).put(
			"key", key
		).put(
			"licenseKeyFamily", licenseKeyFamily
		).put(
			"licenseName", licenseName
		).put(
			"licenseType", licenseType
		).put(
			"licenseVersion", licenseVersion
		).put(
			"macAddresses", macAddresses
		).put(
			"maxClusterNodes", maxClusterNodes
		).put(
			"maxConcurrentUsers", maxConcurrentUsers
		).put(
			"maxHttpSessions", maxHttpSessions
		).put(
			"maxServers", maxServers
		).put(
			"maxUsers", maxUsers
		).put(
			"name", name
		).put(
			"orderId", orderId
		).put(
			"owner", owner
		).put(
			"productExternalId", productExternalId
		).put(
			"productName", productName
		).put(
			"productVersion", productVersion
		).put(
			"r_accountEntryToLicenseKey_accountEntryId", accountEntryId
		).put(
			"r_activationKeyToLicenseKey_c_activationKeyId", activationKeyId
		).put(
			"r_projectToLicenseKey_c_projectERC", projectExternalReferenceCode
		).put(
			"serverId", serverId
		).put(
			"sizing", sizing
		).put(
			"startDate", _toISO8601(startDate)
		).put(
			"workspaceName", workspaceName
		).put(
			"workspaceOwnerEmail", workspaceOwnerEmail
		);

		String response = post(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys"
			).build(
			).toUri());

		return new LicenseKey(new JSONObject(response));
	}

	public LicenseKey addLicenseKeyTypeFree(
			long accountEntryId, String domains, String orderId, String owner)
		throws Exception {

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

		calendar.set(Calendar.MILLISECOND, 0);

		Date startDate = calendar.getTime();

		calendar.add(Calendar.MONTH, _FREE_TIER_DURATION_MONTHS);

		Date expirationDate = calendar.getTime();

		String productVersion =
			_productVersionService.getFreeTierProductVersion();

		String key = _licenseKeyGenerator.generateKey(
			StringPool.BLANK, _FREE_TIER_LICENSE_NAME,
			LicenseConstants.TYPE_FREE, _FREE_TIER_LICENSE_VERSION,
			_FREE_TIER_PRODUCT_NAME, LicenseConstants.PRODUCT_ID_PORTAL,
			productVersion, owner, _FREE_TIER_MAX_CLUSTER_NODES, 0, 0, 0L, 0L,
			StringPool.BLANK, StringPool.BLANK, domains, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);

		JSONObject jsonObject = new JSONObject(
		).put(
			"active", true
		).put(
			"complimentary", false
		).put(
			"customExpirationDate", _toISO8601(expirationDate)
		).put(
			"domains", domains
		).put(
			"key", key
		).put(
			"licenseKeyFamily",
			LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DXP
		).put(
			"licenseName", _FREE_TIER_LICENSE_NAME
		).put(
			"licenseType", LicenseConstants.TYPE_FREE
		).put(
			"licenseVersion", _FREE_TIER_LICENSE_VERSION
		).put(
			"maxClusterNodes", _FREE_TIER_MAX_CLUSTER_NODES
		).put(
			"name", _FREE_TIER_LICENSE_NAME
		).put(
			"orderId", orderId
		).put(
			"owner", owner
		).put(
			"productExternalId", LicenseConstants.PRODUCT_ID_PORTAL
		).put(
			"productName", _FREE_TIER_PRODUCT_NAME
		).put(
			"productVersion", productVersion
		).put(
			"r_accountEntryToLicenseKey_accountEntryId", accountEntryId
		).put(
			"startDate", _toISO8601(startDate)
		);

		String response = post(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys"
			).build(
			).toUri());

		return new LicenseKey(new JSONObject(response));
	}

	public Map<Long, Integer> getActiveLicenseKeyCounts(
			ActivationKeyScope activationKeyScope,
			List<Entitlement> entitlements,
			Collection<Long> excludedActivationKeyIds)
		throws Exception {

		if (activationKeyScope.isProject()) {
			return getActiveLicenseKeyCounts(
				entitlements, excludedActivationKeyIds,
				activationKeyScope.getProjectExternalReferenceCode());
		}

		return getActiveUnassignedLicenseKeyCounts(
			activationKeyScope.getAccountId());
	}

	public Map<Long, Integer> getActiveLicenseKeyCounts(
			List<Entitlement> entitlements,
			Collection<Long> excludedActivationKeyIds,
			String projectExternalReferenceCode)
		throws Exception {

		Set<Long> entitlementIds = new HashSet<>();

		for (Entitlement entitlement : entitlements) {
			entitlementIds.add(entitlement.getEntitlementId());
		}

		Map<Long, Integer> permanentLicenseKeyCounts = new HashMap<>();

		Map<Long, Integer> counts = _getActiveLicenseKeyCounts(
			entitlementIds, excludedActivationKeyIds,
			_getProjectFilterString(projectExternalReferenceCode),
			permanentLicenseKeyCounts);

		for (Map.Entry<Long, Integer> entry :
				permanentLicenseKeyCounts.entrySet()) {

			_addPermanentLicenseKeyCount(
				counts, entitlements, entry.getKey(), entry.getValue());
		}

		return counts;
	}

	public Map<Long, Integer> getActiveLicenseKeyCounts(
			String projectExternalReferenceCode)
		throws Exception {

		return _getActiveLicenseKeyCounts(
			Collections.emptySet(), Collections.emptyList(),
			_getProjectFilterString(projectExternalReferenceCode), null);
	}

	public Map<Long, Integer> getActiveUnassignedLicenseKeyCounts(
			long accountEntryId)
		throws Exception {

		return _getActiveLicenseKeyCounts(
			Collections.emptySet(), Collections.emptyList(),
			StringBundler.concat(
				"(r_accountEntryToLicenseKey_accountEntryId eq '",
				accountEntryId,
				"') and (r_projectToLicenseKey_c_projectId eq '0')"),
			null);
	}

	public List<LicenseKey> getAssetReceiptLicenseLicenseKeys(
			boolean active, boolean complimentary, String orderId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(active eq ", active, ") and (complimentary eq ",
				complimentary, ") and (orderId eq '",
				escapeODataString(orderId), "')"));
	}

	public int getAssetReceiptLicenseLicenseKeysCount(
			boolean active, boolean complimentary, String orderId)
		throws Exception {

		return _getCount(
			StringBundler.concat(
				"(active eq ", active, ") and (complimentary eq ",
				complimentary, ") and (orderId eq '",
				escapeODataString(orderId), "')"));
	}

	public LicenseKey getLicenseKey(Jwt jwt, long licenseKeyId)
		throws Exception {

		try {
			String response = get(
				getAuthorization(jwt),
				UriComponentsBuilder.fromPath(
					"/o/c/licensekeys/{licenseKeyId}"
				).buildAndExpand(
					licenseKeyId
				).toUri());

			return new LicenseKey(new JSONObject(response));
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode == HttpStatus.NOT_FOUND.value()) {
				throw new NoSuchLicenseKeyException(
					"No license key exists with ID " + licenseKeyId);
			}

			throw webClientResponseException;
		}
	}

	public LicenseKey getLicenseKey(long licenseKeyId) throws Exception {
		try {
			String response = get(
				getAuthorization(),
				UriComponentsBuilder.fromPath(
					"/o/c/licensekeys/{id}"
				).buildAndExpand(
					licenseKeyId
				).toUri());

			return new LicenseKey(new JSONObject(response));
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode == HttpStatus.NOT_FOUND.value()) {
				throw new NoSuchLicenseKeyException(
					"No license key exists with ID " + licenseKeyId);
			}

			throw webClientResponseException;
		}
	}

	public LicenseKey getLicenseKeyByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		List<LicenseKey> licenseKeys = getLicenseKeys(
			StringBundler.concat(
				"externalReferenceCode eq '",
				escapeODataString(externalReferenceCode), "'"));

		if (licenseKeys.isEmpty()) {
			throw new NoSuchLicenseKeyException(
				"{externalReferenceCode=" + externalReferenceCode + "}");
		}

		return licenseKeys.get(0);
	}

	public List<LicenseKey> getLicenseKeys(
			boolean active, boolean complimentary, long entitlementId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(active eq ", active, ") and (complimentary eq ",
				complimentary, ") and (entitlementId eq '", entitlementId,
				"')"));
	}

	public List<LicenseKey> getLicenseKeys(
			boolean active, String orderId, String productExternalId,
			String serverId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(active eq ", active, ") and (orderId eq '",
				escapeODataString(orderId), "') and (productExternalId eq '",
				escapeODataString(productExternalId), "') and (serverId eq '",
				escapeODataString(serverId), "')"));
	}

	public List<LicenseKey> getLicenseKeys(String filterString)
		throws Exception {

		return getAllItems("/o/c/licensekeys", filterString, LicenseKey::new);
	}

	public List<LicenseKey> getLicenseKeys(String filterString, int limit)
		throws Exception {

		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys"
			).queryParam(
				"filter", filterString
			).queryParam(
				"page", 1
			).queryParam(
				"pageSize", limit
			).build(
			).toUri());

		if (Validator.isNull(response)) {
			return new ArrayList<>();
		}

		JSONObject jsonObject = new JSONObject(response);

		JSONArray jsonArray = jsonObject.getJSONArray("items");

		List<LicenseKey> licenseKeys = new ArrayList<>();

		for (int i = 0; i < jsonArray.length(); i++) {
			licenseKeys.add(new LicenseKey(jsonArray.getJSONObject(i)));
		}

		return licenseKeys;
	}

	public List<LicenseKey> getLicenseKeys(
			String productExternalId, String serverId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(productExternalId eq '", escapeODataString(productExternalId),
				"') and (serverId eq '", escapeODataString(serverId), "')"));
	}

	public List<LicenseKey> getLicenseKeys(
			String domains, String licenseType, String owner)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(domains eq '", escapeODataString(domains),
				"') and (licenseType eq '", escapeODataString(licenseType),
				"') and (owner eq '", escapeODataString(owner), "')"));
	}

	public List<LicenseKey> getLicenseKeysByAccountEntryId(long accountEntryId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"r_accountEntryToLicenseKey_accountEntryId eq '",
				accountEntryId, "'"));
	}

	public List<LicenseKey> getLicenseKeysByActivationKeyId(
			long activationKeyId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"r_activationKeyToLicenseKey_c_activationKeyId eq '",
				activationKeyId, "'"));
	}

	public List<LicenseKey> getLicenseKeysByIds(Jwt jwt, long[] licenseKeyIds)
		throws Exception {

		if (licenseKeyIds.length == 0) {
			return Collections.emptyList();
		}

		return getAllItems(
			"/o/c/licensekeys", _toIdFilterString(licenseKeyIds),
			LicenseKey::new, jwt);
	}

	public List<LicenseKey> getLicenseKeysByName(
			boolean active, String productName, String serverId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(active eq ", active, ") and (productName eq '",
				escapeODataString(productName), "') and (serverId eq '",
				escapeODataString(serverId), "')"));
	}

	public boolean hasValidLicenseKeyTypeFree(String domains, String owner)
		throws Exception {

		Instant renewalThreshold = Instant.now(
		).plus(
			_FREE_TIER_RENEWAL_THRESHOLD_DAYS, ChronoUnit.DAYS
		);

		for (LicenseKey licenseKey :
				getLicenseKeys(domains, LicenseConstants.TYPE_FREE, owner)) {

			Instant customExpirationDateInstant =
				licenseKey.getCustomExpirationDateInstant();

			if ((customExpirationDateInstant != null) &&
				customExpirationDateInstant.isAfter(renewalThreshold)) {

				return true;
			}
		}

		return false;
	}

	public LicenseKey replaceLicenseKey(
			Date expirationDate, long licenseKeyId, Date startDate)
		throws Exception {

		LicenseKey licenseKey = getLicenseKey(licenseKeyId);

		if (Validator.isNotNull(licenseKey.getOrderId()) &&
			!licenseKey.isActive()) {

			throw new LicenseKeyActiveException();
		}

		LicenseKey newLicenseKey = _copyLicenseKey(
			expirationDate, licenseKey, startDate);

		updateLicenseKey(false, licenseKey.isComplimentary(), licenseKeyId);

		return newLicenseKey;
	}

	public List<LicenseKey> search(
			Boolean active, String description, String hostName,
			String ipAddress, String licenseType, String macAddress,
			String owner, String productExternalId, String productName,
			String serverId)
		throws Exception {

		return getLicenseKeys(
			_buildSearchFilter(
				active, description, hostName, ipAddress, licenseType,
				macAddress, owner, productExternalId, productName, serverId));
	}

	public int searchCount(
			Boolean active, String description, String hostName,
			String ipAddress, String licenseType, String macAddress,
			String owner, String productExternalId, String productName,
			String serverId)
		throws Exception {

		return _getCount(
			_buildSearchFilter(
				active, description, hostName, ipAddress, licenseType,
				macAddress, owner, productExternalId, productName, serverId));
	}

	public LicenseKey updateLicenseKey(
			boolean active, boolean complimentary, long licenseKeyId)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"active", active
		).put(
			"complimentary", complimentary
		);

		String response = patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys/{id}"
			).buildAndExpand(
				licenseKeyId
			).toUri());

		return new LicenseKey(new JSONObject(response));
	}

	public LicenseKey updateLicenseKeyActive(boolean active, long licenseKeyId)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"active", active
		);

		String response = patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys/{id}"
			).buildAndExpand(
				licenseKeyId
			).toUri());

		return new LicenseKey(new JSONObject(response));
	}

	private void _addPermanentLicenseKeyCount(
		Map<Long, Integer> counts, List<Entitlement> entitlements,
		long entitlementDefinitionId, int permanentLicenseKeyCount) {

		List<Entitlement> definitionEntitlements = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			if (entitlement.getEntitlementDefinitionId() ==
					entitlementDefinitionId) {

				definitionEntitlements.add(entitlement);
			}
		}

		if (definitionEntitlements.isEmpty()) {
			return;
		}

		definitionEntitlements.sort(
			Comparator.comparing(
				Entitlement::getEndDateInstant,
				Comparator.nullsFirst(Comparator.reverseOrder())));

		int remainingCount = permanentLicenseKeyCount;

		for (Entitlement entitlement : definitionEntitlements) {
			long entitlementId = entitlement.getEntitlementId();

			int availableCount =
				LicenseKeyGenerateFormService.getTotalCount(entitlement) -
					counts.getOrDefault(entitlementId, 0);

			int count = Math.min(remainingCount, Math.max(0, availableCount));

			if (count > 0) {
				counts.merge(entitlementId, count, Integer::sum);

				remainingCount -= count;
			}

			if (remainingCount == 0) {
				return;
			}
		}

		Entitlement latestEntitlement = definitionEntitlements.get(0);

		counts.merge(
			latestEntitlement.getEntitlementId(), remainingCount, Integer::sum);
	}

	private String _buildSearchFilter(
		Boolean active, String description, String hostName, String ipAddress,
		String licenseType, String macAddress, String owner,
		String productExternalId, String productName, String serverId) {

		List<String> conditions = new ArrayList<>();

		if (active != null) {
			conditions.add("(active eq " + active + ")");
		}

		if (Validator.isNotNull(description)) {
			conditions.add(
				"(description eq '" + escapeODataString(description) + "')");
		}

		if (Validator.isNotNull(hostName)) {
			conditions.add(
				"(hostName eq '" + escapeODataString(hostName) + "')");
		}

		if (Validator.isNotNull(ipAddress)) {
			conditions.add(
				"(ipAddresses eq '" + escapeODataString(ipAddress) + "')");
		}

		if (Validator.isNotNull(licenseType)) {
			conditions.add(
				"(licenseType eq '" + escapeODataString(licenseType) + "')");
		}

		if (Validator.isNotNull(macAddress)) {
			conditions.add(
				"(macAddresses eq '" + escapeODataString(macAddress) + "')");
		}

		if (Validator.isNotNull(owner)) {
			conditions.add("(owner eq '" + escapeODataString(owner) + "')");
		}

		if (Validator.isNotNull(productExternalId)) {
			conditions.add(
				"(productExternalId eq '" +
					escapeODataString(productExternalId) + "')");
		}

		if (Validator.isNotNull(productName)) {
			conditions.add(
				"(productName eq '" + escapeODataString(productName) + "')");
		}

		if (Validator.isNotNull(serverId)) {
			conditions.add(
				"(serverId eq '" + escapeODataString(serverId) + "')");
		}

		if (conditions.isEmpty()) {
			return null;
		}

		return String.join(" and ", conditions);
	}

	private LicenseKey _copyLicenseKey(
			Date expirationDate, LicenseKey licenseKey, Date startDate)
		throws Exception {

		return addLicenseKey(
			licenseKey.getAccountEntryId(), licenseKey.getAccountName(),
			licenseKey.getActivationKeyId(), true,
			licenseKey.getAdditionalInfo(), licenseKey.isComplimentary(),
			licenseKey.getDataCenterLocation(), licenseKey.getDescription(),
			licenseKey.getDomains(), licenseKey.getEntitlementDefinitionId(),
			licenseKey.getEntitlementId(), expirationDate,
			licenseKey.getHostName(), licenseKey.getIpAddresses(), null,
			licenseKey.getLicenseKeyFamily(), licenseKey.getLicenseName(),
			licenseKey.getLicenseType(), licenseKey.getLicenseVersion(),
			licenseKey.getMacAddresses(), licenseKey.getMaxClusterNodes(),
			licenseKey.getMaxConcurrentUsers(), licenseKey.getMaxHttpSessions(),
			licenseKey.getMaxServers(), licenseKey.getMaxUsers(),
			licenseKey.getName(), licenseKey.getOrderId(),
			licenseKey.getOwner(), licenseKey.getProductExternalId(),
			licenseKey.getProductName(), licenseKey.getProductVersion(),
			licenseKey.getProjectExternalReferenceCode(),
			licenseKey.getServerId(), licenseKey.getSizing(), startDate,
			licenseKey.getWorkspaceName(), licenseKey.getWorkspaceOwnerEmail());
	}

	private Map<Long, Integer> _getActiveLicenseKeyCounts(
			Set<Long> entitlementIds, Collection<Long> excludedActivationKeyIds,
			String filterString, Map<Long, Integer> permanentLicenseKeyCounts)
		throws Exception {

		Map<Long, Integer> counts = new HashMap<>();

		// A complimentary key counts against the entitlement that granted it,
		// which allows one. It keeps counting once it expires, since expiring
		// does not hand the grant back, and stops only when the key is
		// deactivated. Inactive keys are dropped by the query and again by the
		// loop, so the tally stays right whatever the query returns. Only the
		// fields the tally reads are projected, since a project can hold
		// thousands of keys and each one otherwise serializes thirty five
		// fields plus its action envelope. When the caller asks, a permanent
		// key is tallied by its definition instead if no active entitlement in
		// the caller's list granted it. That covers a migrated key that no
		// entitlement granted, and a generated key whose subscription ended.

		for (LicenseKey licenseKey :
				getAllProjectedItems(
					"/o/c/licensekeys", _FIELDS_ACTIVE_LICENSE_KEY_COUNT,
					"(active eq true) and (" + filterString + ")",
					LicenseKey::new)) {

			if (!licenseKey.isActive() ||
				excludedActivationKeyIds.contains(
					licenseKey.getActivationKeyId())) {

				continue;
			}

			long entitlementDefinitionId =
				licenseKey.getEntitlementDefinitionId();
			long entitlementId = licenseKey.getEntitlementId();

			if ((permanentLicenseKeyCounts != null) &&
				(entitlementDefinitionId > 0) &&
				!entitlementIds.contains(entitlementId) &&
				licenseKey.isPermanent()) {

				permanentLicenseKeyCounts.merge(
					entitlementDefinitionId, 1, Integer::sum);

				continue;
			}

			if (entitlementId > 0) {
				counts.merge(entitlementId, 1, Integer::sum);
			}
		}

		return counts;
	}

	private int _getCount(String filterString) throws Exception {
		UriComponentsBuilder uriComponentsBuilder =
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys"
			).queryParam(
				"pageSize", 1
			);

		Map<String, Object> uriVariables = new HashMap<>();

		if (filterString != null) {
			uriComponentsBuilder.queryParam("filter", "{filter}");

			uriVariables.put("filter", filterString);
		}

		String response = get(
			getAuthorization(),
			uriComponentsBuilder.encode(
			).buildAndExpand(
				uriVariables
			).toUri());

		JSONObject jsonObject = new JSONObject(response);

		return jsonObject.optInt("totalCount");
	}

	private String _getProjectFilterString(
		String projectExternalReferenceCode) {

		return "r_projectToLicenseKey_c_projectERC eq '" +
			escapeODataString(projectExternalReferenceCode) + "'";
	}

	private String _toISO8601(Date date) {
		if (date == null) {
			return null;
		}

		DateFormat dateFormat = new SimpleDateFormat(
			"yyyy-MM-dd'T'HH:mm:ss'Z'");

		dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

		return dateFormat.format(date);
	}

	private String _toIdFilterString(long[] licenseKeyIds) {
		StringBundler sb = new StringBundler(licenseKeyIds.length * 4);

		for (int i = 0; i < licenseKeyIds.length; i++) {
			if (i > 0) {
				sb.append(" or ");
			}

			sb.append("(id eq '");
			sb.append(licenseKeyIds[i]);
			sb.append("')");
		}

		return sb.toString();
	}

	private static final String _FIELDS_ACTIVE_LICENSE_KEY_COUNT =
		"active,customExpirationDate,entitlementDefinitionId,entitlementId," +
			"id,r_activationKeyToLicenseKey_c_activationKeyId,startDate";

	private static final int _FREE_TIER_DURATION_MONTHS = 12;

	private static final String _FREE_TIER_LICENSE_NAME =
		"Liferay DXP - Free Tier";

	private static final int _FREE_TIER_LICENSE_VERSION = 3;

	private static final int _FREE_TIER_MAX_CLUSTER_NODES = 1;

	private static final String _FREE_TIER_PRODUCT_NAME =
		"Liferay DXP - Free Tier";

	private static final int _FREE_TIER_RENEWAL_THRESHOLD_DAYS = 90;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

	@Autowired
	private LicenseKeyValidator _licenseKeyValidator;

	@Autowired
	@Lazy
	private ProductVersionService _productVersionService;

}