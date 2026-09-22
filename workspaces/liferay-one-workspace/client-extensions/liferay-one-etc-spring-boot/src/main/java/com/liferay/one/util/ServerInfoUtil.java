/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

/**
 * @author Pedro Oliveira
 */
public class ServerInfoUtil {

	public static String toCommaSeparated(String value) {
		if (Validator.isNull(value)) {
			return StringPool.BLANK;
		}

		List<String> lines = new ArrayList<>();

		for (String line : value.split("\\R")) {
			String trimmedLine = line.trim();

			if (!trimmedLine.isEmpty()) {
				lines.add(trimmedLine);
			}
		}

		return String.join(StringPool.COMMA, lines);
	}

	private ServerInfoUtil() {
	}

}