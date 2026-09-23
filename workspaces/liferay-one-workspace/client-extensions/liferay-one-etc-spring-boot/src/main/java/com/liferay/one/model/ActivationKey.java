/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;

import org.json.JSONObject;

/**
 * @author Pedro Oliveira
 */
public class ActivationKey {

	public ActivationKey(JSONObject jsonObject) {
		_accountEntryId = jsonObject.optLong(
			"r_accountEntryToActivationKey_accountEntryId");
		_accountName = jsonObject.optString("accountName");
		_activationKeyId = jsonObject.optLong("id");
		_active = jsonObject.optBoolean("active");
		_additionalInfo = jsonObject.optString("additionalInfo");
		_complimentary = jsonObject.optBoolean("complimentary");
		_customExpirationDateInstant = _toInstant(
			jsonObject, "customExpirationDate");
		_description = jsonObject.optString("description");
		_domains = jsonObject.optString("domains");
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_keyType = jsonObject.optString("keyType");
		_licenseType = jsonObject.optString("licenseType");
		_name = jsonObject.optString("name");
		_productVersion = jsonObject.optString("productVersion");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToActivationKey_c_projectERC");
		_startDateInstant = _toInstant(jsonObject, "startDate");
	}

	public long getAccountEntryId() {
		return _accountEntryId;
	}

	public String getAccountName() {
		return _accountName;
	}

	public long getActivationKeyId() {
		return _activationKeyId;
	}

	public String getAdditionalInfo() {
		return _additionalInfo;
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

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	public String getKeyType() {
		return _keyType;
	}

	public String getLicenseType() {
		return _licenseType;
	}

	public String getName() {
		return _name;
	}

	public String getProductVersion() {
		return _productVersion;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
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

	private Instant _toInstant(JSONObject jsonObject, String name) {
		String value = jsonObject.optString(name, null);

		if ((value == null) || value.isEmpty()) {
			return null;
		}

		return Instant.parse(value);
	}

	private final long _accountEntryId;
	private final String _accountName;
	private final long _activationKeyId;
	private final boolean _active;
	private final String _additionalInfo;
	private final boolean _complimentary;
	private final Instant _customExpirationDateInstant;
	private final String _description;
	private final String _domains;
	private final String _externalReferenceCode;
	private final String _keyType;
	private final String _licenseType;
	private final String _name;
	private final String _productVersion;
	private final String _projectExternalReferenceCode;
	private final Instant _startDateInstant;

}