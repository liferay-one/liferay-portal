/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;
import java.time.format.DateTimeParseException;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

/**
 * @author Pedro Oliveira
 */
public class ActivationKey {

	public ActivationKey(JSONObject jsonObject) {
		_accountEntryId = jsonObject.optLong(
			"r_accountEntryToActivationKey_accountEntryId");
		_activationKeyId = jsonObject.optLong("id");
		_active = jsonObject.optBoolean("active");
		_complimentary = jsonObject.optBoolean("complimentary");
		_customExpirationDateInstant = _toInstant(
			jsonObject, "customExpirationDate");
		_description = jsonObject.optString("description");
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

	public long getActivationKeyId() {
		return _activationKeyId;
	}

	public Instant getCustomExpirationDateInstant() {
		return _customExpirationDateInstant;
	}

	public String getDescription() {
		return _description;
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

		try {
			return Instant.parse(value);
		}
		catch (DateTimeParseException dateTimeParseException) {
			_log.error(
				"Unable to read the date " + value, dateTimeParseException);

			return null;
		}
	}

	private static final Log _log = LogFactory.getLog(ActivationKey.class);

	private final long _accountEntryId;
	private final long _activationKeyId;
	private final boolean _active;
	private final boolean _complimentary;
	private final Instant _customExpirationDateInstant;
	private final String _description;
	private final String _externalReferenceCode;
	private final String _keyType;
	private final String _licenseType;
	private final String _name;
	private final String _productVersion;
	private final String _projectExternalReferenceCode;
	private final Instant _startDateInstant;

}