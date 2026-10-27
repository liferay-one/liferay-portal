/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.model;

import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * @author Ryan Schuhler
 */
public class SalesforceRecordComparison {

	public static final String STATUS_DIFFERS = "differs-from-salesforce";

	public static final String STATUS_IN_SYNC = "in-sync";

	public static final String STATUS_MISSING_IN_LIFERAY = "missing-in-liferay";

	public static final String STATUS_MISSING_IN_SALESFORCE =
		"missing-in-salesforce";

	public static final String TYPE_ACCOUNT = "account";

	public static final String TYPE_CONTRACT = "contract";

	public static final String TYPE_PROJECT = "project";

	public SalesforceRecordComparison(
		List<JSONObject> differenceJSONObjects, String externalReferenceCode,
		JSONObject liferayJSONObject, String name,
		JSONObject salesforceJSONObject, String status, String type) {

		_differenceJSONObjects = List.copyOf(differenceJSONObjects);
		_externalReferenceCode = externalReferenceCode;
		_liferayJSONObject = liferayJSONObject;
		_name = name;
		_salesforceJSONObject = salesforceJSONObject;
		_status = status;
		_type = type;
	}

	public List<JSONObject> getDifferenceJSONObjects() {
		return _differenceJSONObjects;
	}

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	public JSONObject getLiferayJSONObject() {
		return _liferayJSONObject;
	}

	public String getName() {
		return _name;
	}

	public JSONObject getSalesforceJSONObject() {
		return _salesforceJSONObject;
	}

	public String getStatus() {
		return _status;
	}

	public String getType() {
		return _type;
	}

	public JSONObject toJSONObject() {
		return new JSONObject(
		).put(
			"differences", new JSONArray(_differenceJSONObjects)
		).put(
			"externalReferenceCode", _externalReferenceCode
		).put(
			"name", _name
		).put(
			"status", _status
		).put(
			"type", _type
		);
	}

	private final List<JSONObject> _differenceJSONObjects;
	private final String _externalReferenceCode;
	private final JSONObject _liferayJSONObject;
	private final String _name;
	private final JSONObject _salesforceJSONObject;
	private final String _status;
	private final String _type;

}