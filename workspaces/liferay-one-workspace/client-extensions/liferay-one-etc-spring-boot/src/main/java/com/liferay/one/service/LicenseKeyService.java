/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.exception.LicenseKeyActiveException;
import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.license.LicenseKeyValidator;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.text.DateFormat;
import java.text.SimpleDateFormat;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Amos Fong
 * @author Allen Ziegenfus
 */
@Component
public class LicenseKeyService extends OneBaseService {

	public LicenseKey addLicenseKey(
			String licenseType, String licenseName, String productExternalId,
			String productName, String productVersion, int licenseVersion,
			String name, String owner, String description, String domains,
			String hostName, String ipAddresses, String macAddresses,
			String serverId, String accountName, int maxClusterNodes,
			int maxServers, int maxHttpSessions, long maxConcurrentUsers,
			long maxUsers, String sizing, String additionalInfo, String orderId,
			Date startDate, Date expirationDate, boolean complimentary,
			boolean active)
		throws Exception {

		_licenseKeyValidator.validateMetadata(
			description, licenseType, maxClusterNodes, name, owner,
			productVersion);

		_licenseKeyValidator.validateDates(
			expirationDate, hostName, ipAddresses, licenseType, macAddresses,
			startDate);

		String key = _licenseKeyGenerator.generateKey(
			accountName, licenseName, licenseType, licenseVersion, productName,
			productExternalId, productVersion, owner, maxClusterNodes,
			maxServers, maxHttpSessions, maxConcurrentUsers, maxUsers, sizing,
			description, domains, hostName, ipAddresses, macAddresses, serverId,
			startDate, expirationDate, new Date());

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
			"description", description
		).put(
			"domains", domains
		).put(
			"hostName", hostName
		).put(
			"ipAddresses", ipAddresses
		).put(
			"key", key
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
			"serverId", serverId
		).put(
			"sizing", sizing
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

	public LicenseKey extendLicenseKey(
			long licenseKeyId, Date startDate, Date expirationDate)
		throws Exception {

		LicenseKey newLicenseKey = _copyLicenseKey(
			getLicenseKey(licenseKeyId), startDate, expirationDate);

		List<SubscriptionEntry> subscriptionEntries =
			_subscriptionEntryService.getSubscriptionEntries(
				StringBundler.concat(
					"(className eq '", ClassNameConstants.LICENSE_KEY,
					"') and (classPK eq ", licenseKeyId, ")"));

		for (SubscriptionEntry subscriptionEntry : subscriptionEntries) {
			_subscriptionEntryService.addSubscriptionEntry(
				ClassNameConstants.LICENSE_KEY, newLicenseKey.getLicenseKeyId(),
				subscriptionEntry.getCustomUserId());
		}

		return newLicenseKey;
	}

	public List<LicenseKey> getAssetReceiptLicenseLicenseKeys(
			String orderId, boolean complimentary, boolean active)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(orderId eq '", orderId, "') and (complimentary eq ",
				complimentary, ") and (active eq ", active, ")"));
	}

	public int getAssetReceiptLicenseLicenseKeysCount(
			String orderId, boolean complimentary, boolean active)
		throws Exception {

		return _getCount(
			StringBundler.concat(
				"(orderId eq '", orderId, "') and (complimentary eq ",
				complimentary, ") and (active eq ", active, ")"));
	}

	public LicenseKey getLicenseKey(long licenseKeyId) throws Exception {
		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys/{id}"
			).buildAndExpand(
				licenseKeyId
			).toUri());

		return new LicenseKey(new JSONObject(response));
	}

	public LicenseKey getLicenseKeyByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		List<LicenseKey> licenseKeys = getLicenseKeys(
			StringBundler.concat(
				"externalReferenceCode eq '", externalReferenceCode, "'"));

		if (licenseKeys.isEmpty()) {
			throw new NoSuchLicenseKeyException(
				"{externalReferenceCode=" + externalReferenceCode + "}");
		}

		return licenseKeys.get(0);
	}

	public List<LicenseKey> getLicenseKeys(
			long entitlementId, boolean complimentary, boolean active)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(entitlementId eq '", entitlementId,
				"') and (complimentary eq ", complimentary, ") and (active eq ",
				active, ")"));
	}

	public List<LicenseKey> getLicenseKeys(String filterString)
		throws Exception {

		return getAllItems("/o/c/licensekeys", filterString, LicenseKey::new);
	}

	public List<LicenseKey> getLicenseKeys(
			String productExternalId, String serverId)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(productExternalId eq '", productExternalId,
				"') and (serverId eq '", serverId, "')"));
	}

	public List<LicenseKey> getLicenseKeys(
			String licenseType, String owner, String domains)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(licenseType eq '", licenseType, "') and (owner eq '", owner,
				"') and (domains eq '", domains, "')"));
	}

	public List<LicenseKey> getLicenseKeys(
			String orderId, String productExternalId, String serverId,
			boolean active)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(orderId eq '", orderId, "') and (productExternalId eq '",
				productExternalId, "') and (serverId eq '", serverId,
				"') and (active eq ", active, ")"));
	}

	public List<LicenseKey> getLicenseKeysByName(
			String productName, String serverId, boolean active)
		throws Exception {

		return getLicenseKeys(
			StringBundler.concat(
				"(productName eq '", productName, "') and (serverId eq '",
				serverId, "') and (active eq ", active, ")"));
	}

	public LicenseKey replaceLicenseKey(
			long licenseKeyId, Date startDate, Date expirationDate)
		throws Exception {

		LicenseKey licenseKey = getLicenseKey(licenseKeyId);

		if (Validator.isNotNull(licenseKey.getOrderId()) &&
			!licenseKey.isActive()) {

			throw new LicenseKeyActiveException();
		}

		updateLicenseKey(licenseKeyId, licenseKey.isComplimentary(), false);

		return _copyLicenseKey(licenseKey, startDate, expirationDate);
	}

	public List<LicenseKey> search(
			String licenseType, String owner, String description,
			String hostName, String ipAddress, String macAddress,
			String serverId, String productName, String productExternalId,
			Boolean active)
		throws Exception {

		return getLicenseKeys(
			_buildSearchFilter(
				licenseType, owner, description, hostName, ipAddress,
				macAddress, serverId, productName, productExternalId, active));
	}

	public int searchCount(
			String licenseType, String owner, String description,
			String hostName, String ipAddress, String macAddress,
			String serverId, String productName, String productExternalId,
			Boolean active)
		throws Exception {

		return _getCount(
			_buildSearchFilter(
				licenseType, owner, description, hostName, ipAddress,
				macAddress, serverId, productName, productExternalId, active));
	}

	public LicenseKey updateLicenseKey(
			long licenseKeyId, boolean complimentary, boolean active)
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

	public LicenseKey updateLicenseKeyActive(long licenseKeyId, boolean active)
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

	private String _buildSearchFilter(
		String licenseType, String owner, String description, String hostName,
		String ipAddress, String macAddress, String serverId,
		String productName, String productExternalId, Boolean active) {

		List<String> conditions = new ArrayList<>();

		if (Validator.isNotNull(licenseType)) {
			conditions.add("(licenseType eq '" + licenseType + "')");
		}

		if (Validator.isNotNull(owner)) {
			conditions.add("(owner eq '" + owner + "')");
		}

		if (Validator.isNotNull(description)) {
			conditions.add("(description eq '" + description + "')");
		}

		if (Validator.isNotNull(hostName)) {
			conditions.add("(hostName eq '" + hostName + "')");
		}

		if (Validator.isNotNull(ipAddress)) {
			conditions.add("(ipAddresses eq '" + ipAddress + "')");
		}

		if (Validator.isNotNull(macAddress)) {
			conditions.add("(macAddresses eq '" + macAddress + "')");
		}

		if (Validator.isNotNull(serverId)) {
			conditions.add("(serverId eq '" + serverId + "')");
		}

		if (Validator.isNotNull(productName)) {
			conditions.add("(productName eq '" + productName + "')");
		}

		if (Validator.isNotNull(productExternalId)) {
			conditions.add(
				"(productExternalId eq '" + productExternalId + "')");
		}

		if (active != null) {
			conditions.add("(active eq " + active + ")");
		}

		if (conditions.isEmpty()) {
			return null;
		}

		return String.join(" and ", conditions);
	}

	private LicenseKey _copyLicenseKey(
			LicenseKey licenseKey, Date startDate, Date expirationDate)
		throws Exception {

		return addLicenseKey(
			licenseKey.getLicenseType(), licenseKey.getLicenseName(),
			licenseKey.getProductExternalId(), licenseKey.getProductName(),
			licenseKey.getProductVersion(), licenseKey.getLicenseVersion(),
			licenseKey.getName(), licenseKey.getOwner(),
			licenseKey.getDescription(), licenseKey.getDomains(),
			licenseKey.getHostName(), licenseKey.getIpAddresses(),
			licenseKey.getMacAddresses(), licenseKey.getServerId(),
			licenseKey.getAccountName(), licenseKey.getMaxClusterNodes(),
			licenseKey.getMaxServers(), licenseKey.getMaxHttpSessions(),
			licenseKey.getMaxConcurrentUsers(), licenseKey.getMaxUsers(),
			licenseKey.getSizing(), licenseKey.getAdditionalInfo(),
			licenseKey.getOrderId(), startDate, expirationDate,
			licenseKey.isComplimentary(), true);
	}

	private int _getCount(String filterString) throws Exception {
		UriComponentsBuilder uriComponentsBuilder =
			UriComponentsBuilder.fromPath(
				"/o/c/licensekeys"
			).queryParam(
				"pageSize", 1
			);

		if (filterString != null) {
			uriComponentsBuilder.queryParam("filter", filterString);
		}

		String response = get(
			getAuthorization(),
			uriComponentsBuilder.build(
			).toUri());

		JSONObject jsonObject = new JSONObject(response);

		return jsonObject.optInt("totalCount");
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

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

	@Autowired
	private LicenseKeyValidator _licenseKeyValidator;

	@Autowired
	@Lazy
	private SubscriptionEntryService _subscriptionEntryService;

}