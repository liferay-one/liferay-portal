/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.regex.Matcher;

/**
 * @author Kyle Bischof
 */
public class LicenseVersion {

	public static int getAppLicenseVersion() {
		return 3;
	}

	public static int getLicenseVersion(
		String productName, String productVersion) {

		if (productName.contains("Commerce")) {
			return getAppLicenseVersion();
		}

		if (productVersion.equals(ProductVersion.DXP_VERSION_7_1) ||
			productVersion.equals(ProductVersion.DXP_VERSION_7_2) ||
			productVersion.equals(ProductVersion.DXP_VERSION_7_3) ||
			productVersion.equals(ProductVersion.DXP_VERSION_7_4)) {

			return 6;
		}

		Matcher matcher = ProductVersion.getQuarterlyReleaseMatcher(
			productVersion);

		if (matcher.matches()) {
			return 6;
		}

		if (productVersion.equals(ProductVersion.DXP_VERSION_7_0)) {
			return 5;
		}

		if (productVersion.equals(ProductVersion.PORTAL_VERSION_6_1_20) ||
			productVersion.equals(ProductVersion.PORTAL_VERSION_6_1_30) ||
			productVersion.equals(ProductVersion.PORTAL_VERSION_6_2_10)) {

			return 4;
		}

		return 3;
	}

}