/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Amos Fong
 */
@DisplayName("[SVC-LICENSEKEYGENERATIONSERVICE] LicenseVersion")
public class LicenseVersionTest {

	@Test
	public void testGetLicenseVersion() {
		Assertions.assertEquals(
			6, LicenseVersion.getLicenseVersion("Liferay DXP", "2026.Q3"));
		Assertions.assertEquals(
			6, LicenseVersion.getLicenseVersion("Liferay DXP", "2025.Q1"));
		Assertions.assertEquals(
			6, LicenseVersion.getLicenseVersion("Liferay DXP", "7.4"));
		Assertions.assertEquals(
			6, LicenseVersion.getLicenseVersion("Liferay DXP", "7.1"));
		Assertions.assertEquals(
			5, LicenseVersion.getLicenseVersion("Liferay DXP", "7.0"));
		Assertions.assertEquals(
			4, LicenseVersion.getLicenseVersion("Liferay Portal", "6.2 EE"));
		Assertions.assertEquals(
			3, LicenseVersion.getLicenseVersion("Liferay Portal", "6.1 GA1"));
	}

	@Test
	public void testGetLicenseVersionWithCommerce() {
		Assertions.assertEquals(
			3, LicenseVersion.getLicenseVersion("Liferay Commerce", "2026.Q3"));
	}

}