/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * @author Amos Fong
 */
public class LicenseKey {

	public LicenseKey(JSONObject jsonObject) {
		_accountEntryId = jsonObject.optLong(
			"r_accountEntryToLicenseKey_accountEntryId");
		_accountName = jsonObject.optString("accountName");
		_active = jsonObject.optBoolean("active");
		_additionalInfo = jsonObject.optString("additionalInfo");
		_clusterId = jsonObject.optLong("clusterId");
		_complimentary = jsonObject.optBoolean("complimentary");
		_customExpirationDateInstant = Instant.parse(
			jsonObject.getString("customExpirationDate"));
		_description = jsonObject.optString("description");
		_domains = jsonObject.optString("domains");
		_entitlementDefinitionId = jsonObject.optLong(
			"entitlementDefinitionId");
		_entitlementId = jsonObject.optLong("entitlementId");
		_hostName = jsonObject.optString("hostName");
		_ipAddresses = jsonObject.optString("ipAddresses");
		_key = jsonObject.optString("key");
		_licenseKeyId = jsonObject.getLong("id");
		_licenseName = jsonObject.optString("licenseName");
		_licenseType = jsonObject.optString("licenseType");
		_licenseVersion = jsonObject.optInt("licenseVersion");
		_macAddresses = jsonObject.optString("macAddresses");
		_maxClusterNodes = jsonObject.optInt("maxClusterNodes");
		_maxConcurrentUsers = jsonObject.optLong("maxConcurrentUsers");
		_maxHttpSessions = jsonObject.optInt("maxHttpSessions");
		_maxServers = jsonObject.optInt("maxServers");
		_maxUsers = jsonObject.optLong("maxUsers");
		_name = jsonObject.optString("name");
		_orderId = jsonObject.optString("orderId");
		_owner = jsonObject.optString("owner");
		_productExternalId = jsonObject.optString("productExternalId");
		_productName = jsonObject.optString("productName");
		_productVersion = jsonObject.optString("productVersion");
		_productVersionLabel = jsonObject.optString("productVersionLabel");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToLicenseKey_c_projectERC");
		_serverId = jsonObject.optString("serverId");
		_sizing = jsonObject.optString("sizing");
		_startDateInstant = Instant.parse(jsonObject.getString("startDate"));
	}

	public long getAccountEntryId() {
		return _accountEntryId;
	}

	public String getAccountName() {
		return _accountName;
	}

	public String getAdditionalInfo() {
		return _additionalInfo;
	}

	public long getClusterId() {
		return _clusterId;
	}

	public Instant getCustomExpirationDateInstant() {
		return _customExpirationDateInstant;
	}

	public String getDescription() {
		return _description;
	}

	public String getDomains() {
		return _domains;
	}

	public long getEntitlementDefinitionId() {
		return _entitlementDefinitionId;
	}

	public long getEntitlementId() {
		return _entitlementId;
	}

	public List<Long> getEntitlementIds() {
		List<Long> entitlementIds = new ArrayList<>();

		JSONArray jsonArray = _getAdditionalInfoJSONArray("entitlementIds");

		if (jsonArray != null) {
			for (int i = 0; i < jsonArray.length(); i++) {
				entitlementIds.add(jsonArray.getLong(i));
			}
		}

		if (entitlementIds.isEmpty() && (_entitlementId > 0)) {
			entitlementIds.add(_entitlementId);
		}

		return entitlementIds;
	}

	public String getHostName() {
		return _hostName;
	}

	public String getIpAddresses() {
		return _ipAddresses;
	}

	@JsonIgnore
	public String getKey() {
		return _key;
	}

	public long getLicenseKeyId() {
		return _licenseKeyId;
	}

	public String getLicenseName() {
		return _licenseName;
	}

	public String getLicenseType() {
		return _licenseType;
	}

	public int getLicenseVersion() {
		return _licenseVersion;
	}

	public String getMacAddresses() {
		return _macAddresses;
	}

	public int getMaxClusterNodes() {
		return _maxClusterNodes;
	}

	public long getMaxConcurrentUsers() {
		return _maxConcurrentUsers;
	}

	public int getMaxHttpSessions() {
		return _maxHttpSessions;
	}

	public int getMaxServers() {
		return _maxServers;
	}

	public long getMaxUsers() {
		return _maxUsers;
	}

	public String getName() {
		return _name;
	}

	public String getOrderId() {
		return _orderId;
	}

	public String getOwner() {
		return _owner;
	}

	public String getProductExternalId() {
		return _productExternalId;
	}

	public String getProductName() {
		return _productName;
	}

	public String getProductVersion() {
		return _productVersion;
	}

	public String getProductVersionLabel() {
		return _productVersionLabel;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
	}

	public String getServerId() {
		return _serverId;
	}

	public String getSizing() {
		return _sizing;
	}

	public Instant getStartDateInstant() {
		return _startDateInstant;
	}

	public boolean isActive() {
		return _active;
	}

	public boolean isComplimentary() {
		return _complimentary;
	}

	private JSONArray _getAdditionalInfoJSONArray(String name) {
		if ((_additionalInfo == null) || _additionalInfo.isEmpty()) {
			return null;
		}

		try {
			JSONObject jsonObject = new JSONObject(_additionalInfo);

			return jsonObject.optJSONArray(name);
		}
		catch (JSONException jsonException) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to read the additional info of license key " +
						_licenseKeyId,
					jsonException);
			}

			return null;
		}
	}

	private static final Log _log = LogFactory.getLog(LicenseKey.class);

	private final long _accountEntryId;
	private final String _accountName;
	private final boolean _active;
	private final String _additionalInfo;
	private final long _clusterId;
	private final boolean _complimentary;
	private final Instant _customExpirationDateInstant;
	private final String _description;
	private final String _domains;
	private final long _entitlementDefinitionId;
	private final long _entitlementId;
	private final String _hostName;
	private final String _ipAddresses;
	private final String _key;
	private final long _licenseKeyId;
	private final String _licenseName;
	private final String _licenseType;
	private final int _licenseVersion;
	private final String _macAddresses;
	private final int _maxClusterNodes;
	private final long _maxConcurrentUsers;
	private final int _maxHttpSessions;
	private final int _maxServers;
	private final long _maxUsers;
	private final String _name;
	private final String _orderId;
	private final String _owner;
	private final String _productExternalId;
	private final String _productName;
	private final String _productVersion;
	private final String _productVersionLabel;
	private final String _projectExternalReferenceCode;
	private final String _serverId;
	private final String _sizing;
	private final Instant _startDateInstant;

}