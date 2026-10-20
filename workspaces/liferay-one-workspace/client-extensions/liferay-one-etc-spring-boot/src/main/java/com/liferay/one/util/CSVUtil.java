/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.StringUtil;

/**
 * @author Ryan Schuhler
 */
public class CSVUtil {

	/**
	 * Returns one CSV line that quotes every value. A value that a
	 * spreadsheet reads as a formula gets an apostrophe in front, so an export
	 * of customer text cannot run a formula on the machine that opens it.
	 */
	public static String formatFields(Object... objects) {
		StringBundler sb = new StringBundler((4 * objects.length) + 1);

		for (int i = 0; i < objects.length; i++) {
			sb.append(StringPool.QUOTE);
			sb.append(_escape(objects[i]));
			sb.append(StringPool.QUOTE);

			if (i >= (objects.length - 1)) {
				continue;
			}

			sb.append(StringPool.COMMA);
		}

		sb.append(StringPool.NEW_LINE);

		return sb.toString();
	}

	private static String _escape(Object object) {
		if (object == null) {
			return StringPool.BLANK;
		}

		String value = StringUtil.replace(
			String.valueOf(object), CharPool.QUOTE, "\"\"");

		if (value.isEmpty()) {
			return value;
		}

		char c = value.charAt(0);

		if ((c == CharPool.AT) || (c == CharPool.DASH) ||
			(c == CharPool.EQUAL) || (c == CharPool.PLUS) ||
			(c == CharPool.RETURN) || (c == CharPool.TAB)) {

			return StringPool.APOSTROPHE.concat(value);
		}

		return value;
	}

}