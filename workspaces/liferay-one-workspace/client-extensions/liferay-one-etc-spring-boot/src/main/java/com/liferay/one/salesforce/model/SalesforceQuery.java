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
public class SalesforceQuery {

	public SalesforceQuery(String object, List<String> fields, String where) {
		_object = object;
		_fields = List.copyOf(fields);
		_where = where;
	}

	public String getObject() {
		return _object;
	}

	public String getWhere() {
		return _where;
	}

	public JSONObject toJSONObject() {
		return new JSONObject(
		).put(
			"fields", new JSONArray(_fields)
		).put(
			"object", _object
		).put(
			"where", _where
		);
	}

	private final List<String> _fields;
	private final String _object;
	private final String _where;

}