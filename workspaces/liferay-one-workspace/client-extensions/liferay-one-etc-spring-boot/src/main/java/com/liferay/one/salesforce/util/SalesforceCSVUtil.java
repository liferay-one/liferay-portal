/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.util;

import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;

/**
 * Reads the CSV that a Salesforce Bulk API query job returns. The first row
 * holds the field names, and a quoted value may hold a comma, a line break,
 * or a doubled quote. An empty value is left out of the record, so that the
 * record reads it as null, as it does in a Pub/Sub event.
 *
 * @author Ryan Schuhler
 */
public class SalesforceCSVUtil {

	public static List<JSONObject> toJSONObjects(String csv) {
		List<JSONObject> jsonObjects = new ArrayList<>();

		if (Validator.isNull(csv)) {
			return jsonObjects;
		}

		List<List<String>> rows = _getRows(csv);

		if (rows.isEmpty()) {
			return jsonObjects;
		}

		List<String> fieldNames = rows.get(0);

		for (int i = 1; i < rows.size(); i++) {
			List<String> values = rows.get(i);

			JSONObject jsonObject = new JSONObject();

			for (int j = 0; (j < fieldNames.size()) && (j < values.size());
				 j++) {

				String value = values.get(j);

				if (value.isEmpty()) {
					continue;
				}

				jsonObject.put(fieldNames.get(j), value);
			}

			jsonObjects.add(jsonObject);
		}

		return jsonObjects;
	}

	private static List<List<String>> _getRows(String csv) {
		List<List<String>> rows = new ArrayList<>();

		List<String> row = new ArrayList<>();
		StringBuilder sb = new StringBuilder();

		boolean quoted = false;
		boolean quotedValue = false;

		for (int i = 0; i < csv.length(); i++) {
			char c = csv.charAt(i);

			if (quoted) {
				if (c != '"') {
					sb.append(c);
				}
				else if (((i + 1) < csv.length()) &&
						 (csv.charAt(i + 1) == '"')) {

					sb.append('"');

					i++;
				}
				else {
					quoted = false;
				}
			}
			else if ((c == '"') && (sb.length() == 0) && !quotedValue) {
				quoted = true;
				quotedValue = true;
			}
			else if (c == ',') {
				row.add(sb.toString());

				quotedValue = false;

				sb.setLength(0);
			}
			else if ((c == '\n') || (c == '\r')) {
				if ((c == '\r') && ((i + 1) < csv.length()) &&
					(csv.charAt(i + 1) == '\n')) {

					i++;
				}

				row.add(sb.toString());

				rows.add(row);

				row = new ArrayList<>();

				quotedValue = false;

				sb.setLength(0);
			}
			else {
				sb.append(c);
			}
		}

		if ((sb.length() > 0) || quotedValue || !row.isEmpty()) {
			row.add(sb.toString());

			rows.add(row);
		}

		return rows;
	}

}