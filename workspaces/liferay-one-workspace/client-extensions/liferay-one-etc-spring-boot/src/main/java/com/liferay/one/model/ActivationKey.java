/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.LicenseKeyGenerationConstants;

import java.time.Instant;
import java.time.format.DateTimeParseException;

import java.util.Objects;

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
		_endDateInstant = _toInstant(jsonObject, "endDate");
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToActivationKey_c_projectERC");
		_startDateInstant = _toInstant(jsonObject, "startDate");
		_type = jsonObject.optString("type");
	}

	public long getAccountEntryId() {
		return _accountEntryId;
	}

	public long getActivationKeyId() {
		return _activationKeyId;
	}

	public Instant getEndDateInstant() {
		return _endDateInstant;
	}

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
	}

	public Instant getStartDateInstant() {
		return _startDateInstant;
	}

	public String getType() {
		return _type;
	}

	public boolean isActive() {
		return _active;
	}

	// A complimentary key is the one the customer was granted rather than
	// bought, which the key type already says. It is read often enough, and by
	// callers that have no reason to know the constant, to name here.

	public boolean isComplimentary() {
		return Objects.equals(
			LicenseKeyGenerationConstants.KEY_TYPE_COMPLIMENTARY, _type);
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
	private final Instant _endDateInstant;
	private final String _externalReferenceCode;
	private final String _projectExternalReferenceCode;
	private final Instant _startDateInstant;
	private final String _type;

}