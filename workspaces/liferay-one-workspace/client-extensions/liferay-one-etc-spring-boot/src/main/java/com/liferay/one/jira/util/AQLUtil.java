/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.util;

import com.liferay.petra.string.StringUtil;

/**
 * @author Drew Brokke
 */
public class AQLUtil {

	public static String and(String... expressions) {
		return StringUtil.merge(expressions, " AND ");
	}

	public static String getBaseAQL(String objectSchema, String objectType) {
		return and(
			"objectSchema = " + quote(objectSchema),
			"objectType = " + quote(objectType));
	}

	public static String quote(String s) {
		return "\"" + s + "\"";
	}

}