/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * @author Amos Fong
 */
public final class Environment {

	public Environment(JSONObject jsonObject) {
		_accountEntryId = jsonObject.optLong(
			"r_accountEntryToEnvironment_accountEntryId");
		_activationCode = jsonObject.optString("activationCode");
		_activationMode = jsonObject.optString("activationMode");
		_activationStatus = jsonObject.optString("activationStatus");
		_bundledEntitlementIds = _toLongs(
			jsonObject.optString("bundledEntitlementIds"));
		_contractId = jsonObject.optLong(
			"r_contractToEnvironment_c_contractId");
		_currentEntitlementHash = jsonObject.optString(
			"currentEntitlementHash");
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_id = jsonObject.getLong("id");
		_name = jsonObject.optString("name");
		_offering = jsonObject.optString("offering");
		_projectExternalReferenceCode = jsonObject.optString(
			"r_projectToEnvironment_c_projectERC");
		_publicKey = jsonObject.optString("publicKey");
		_region = jsonObject.optString("region");
		_requestedVersion = jsonObject.optString("requestedVersion");
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

	public List<Long> getBundledEntitlementIds() {
		return _bundledEntitlementIds;
	}

	public long getContractId() {
		return _contractId;
	}

	public String getCurrentEntitlementHash() {
		return _currentEntitlementHash;
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

	public String getName() {
		return _name;
	}

	public String getOffering() {
		return _offering;
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

	public String getRequestedVersion() {
		return _requestedVersion;
	}

	public String getType() {
		return _type;
	}

	private List<Long> _toLongs(String json) {
		if (Validator.isNull(json)) {
			return Collections.emptyList();
		}

		// An unreadable value leaves the environment without a bundle rather
		// than failing every endpoint that lists environments for its project.

		try {
			JSONArray jsonArray = new JSONArray(json);

			List<Long> longs = new ArrayList<>(jsonArray.length());

			for (int i = 0; i < jsonArray.length(); i++) {
				longs.add(jsonArray.getLong(i));
			}

			return longs;
		}
		catch (JSONException jsonException) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to read the bundled entitlement IDs",
					jsonException);
			}

			return Collections.emptyList();
		}
	}

	private static final Log _log = LogFactory.getLog(Environment.class);

	private final long _accountEntryId;
	private final String _activationCode;
	private final String _activationMode;
	private final String _activationStatus;
	private final List<Long> _bundledEntitlementIds;
	private final long _contractId;
	private final String _currentEntitlementHash;
	private final String _externalReferenceCode;
	private final long _id;
	private final Instant _lastHeartbeatAtInstant;
	private final String _name;
	private final String _offering;
	private final String _projectExternalReferenceCode;
	private final String _publicKey;
	private final String _region;
	private final String _requestedVersion;
	private final String _type;

}