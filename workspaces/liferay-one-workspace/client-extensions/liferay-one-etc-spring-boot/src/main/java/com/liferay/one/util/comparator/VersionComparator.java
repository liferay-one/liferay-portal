/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util.comparator;

import com.liferay.one.constants.ProductVersion;
import com.liferay.portal.kernel.util.GetterUtil;

import java.util.Comparator;
import java.util.regex.Matcher;

/**
 * @author Jenny Chen
 */
public class VersionComparator implements Comparator<String> {

	public VersionComparator() {
		this(true);
	}

	public VersionComparator(boolean ascending) {
		_ascending = ascending;
	}

	@Override
	public int compare(String version1, String version2) {
		Matcher matcher1 = ProductVersion.getQuarterlyReleaseMatcher(version1);
		Matcher matcher2 = ProductVersion.getQuarterlyReleaseMatcher(version2);

		boolean quarterlyVersion1 = matcher1.matches();
		boolean quarterlyVersion2 = matcher2.matches();

		int result = 0;

		if (quarterlyVersion1 && quarterlyVersion2) {
			int year1 = GetterUtil.getInteger(matcher1.group(1));
			int year2 = GetterUtil.getInteger(matcher2.group(1));

			result = Integer.compare(year1, year2);

			if (result == 0) {
				int quarter1 = GetterUtil.getInteger(matcher1.group(2));
				int quarter2 = GetterUtil.getInteger(matcher2.group(2));

				result = Integer.compare(quarter1, quarter2);
			}
		}
		else if (quarterlyVersion1) {
			result = 1;
		}
		else if (quarterlyVersion2) {
			result = -1;
		}
		else {
			result = version1.compareTo(version2);
		}

		if (_ascending) {
			return result;
		}

		return -result;
	}

	public boolean isAscending() {
		return _ascending;
	}

	private final boolean _ascending;

}