/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import org.json.JSONObject;

/**
 * @author Amos Fong
 */
public class Environment {

	public Environment(JSONObject jsonObject) {
		_accountEntryId = jsonObject.optLong(
			"r_accountEntryToEnvironment_accountEntryId");
		_activationCode = jsonObject.optString("activationCode");
		_activationMode = jsonObject.optString("activationMode");
		_activationStatus = jsonObject.optString("activationStatus");
		_contractId = jsonObject.optLong(
			"r_contractToEnvironment_c_contractId");
		_currentEntitlementHash = jsonObject.optString(
			"currentEntitlementHash");
		_environmentName = jsonObject.optString("environmentName");
		_environmentType = jsonObject.optString("environmentType");
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_id = jsonObject.getLong("id");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToEnvironment_c_projectERC");
		_publicKey = jsonObject.optString("publicKey");
		_region = jsonObject.optString("region");
		_type = jsonObject.optString("type");

		String lastHeartbeatAt = jsonObject.optString("lastHeartbeatAt");

		if (Validator.isNull(lastHeartbeatAt)) {
			_lastHeartbeatAtInstant = null;
		}
		else {
			_lastHeartbeatAtInstant = Instant.parse(lastHeartbeatAt);
		}
	}

	public long getAccountEntryId() {
		return _accountEntryId;
	}

	public String getActivationCode() {
		return _activationCode;
	}

	public String getActivationMode() {
		return _activationMode;
	}

	public String getActivationStatus() {
		return _activationStatus;
	}

	public long getContractId() {
		return _contractId;
	}

	public String getCurrentEntitlementHash() {
		return _currentEntitlementHash;
	}

	public String getEnvironmentName() {
		return _environmentName;
	}

	public String getEnvironmentType() {
		return _environmentType;
	}

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	public long getId() {
		return _id;
	}

	public Instant getLastHeartbeatAtInstant() {
		return _lastHeartbeatAtInstant;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
	}

	public String getPublicKey() {
		return _publicKey;
	}

	public String getRegion() {
		return _region;
	}

	public String getType() {
		return _type;
	}

	private final long _accountEntryId;
	private final String _activationCode;
	private final String _activationMode;
	private final String _activationStatus;
	private final long _contractId;
	private final String _currentEntitlementHash;
	private final String _environmentName;
	private final String _environmentType;
	private final String _externalReferenceCode;
	private final long _id;
	private final Instant _lastHeartbeatAtInstant;
	private final String _projectExternalReferenceCode;
	private final String _publicKey;
	private final String _region;
	private final String _type;

}