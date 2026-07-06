/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
public class LicenseEntryServiceTest {

	@Test
	public void testGetLicenseEntries() {
		List<LicenseEntry> licenseEntries =
			_licenseEntryService.getLicenseEntries("KOR-36354");

		Assertions.assertEquals(3, licenseEntries.size());
	}

	@Test
	public void testGetLicenseEntriesByNameVersion() {
		List<LicenseEntry> licenseEntries =
			_licenseEntryService.getLicenseEntriesByNameVersion(
				"%DXP Production%", "7.0");

		Assertions.assertEquals(2, licenseEntries.size());
	}

	@Test
	public void testGetLicenseEntriesByProductKeyVersionExcludesVersionMax() {
		List<LicenseEntry> licenseEntries =
			_licenseEntryService.getLicenseEntriesByProductKeyVersion(
				"KOR-36134", "6.1 GA1");

		Assertions.assertEquals(1, licenseEntries.size());
	}

	@Test
	public void testGetLicenseEntriesByProductKeyVersionWithinRange() {
		List<LicenseEntry> licenseEntries =
			_licenseEntryService.getLicenseEntriesByProductKeyVersion(
				"KOR-36134", "6.0");

		Assertions.assertEquals(2, licenseEntries.size());
	}

	@Test
	public void testGetLicenseEntriesByType() {
		List<LicenseEntry> licenseEntries =
			_licenseEntryService.getLicenseEntriesByType("oem");

		Assertions.assertEquals(2, licenseEntries.size());
	}

	@Test
	public void testGetLicenseEntry() {
		LicenseEntry licenseEntry = _licenseEntryService.getLicenseEntry(
			"KOR-36354", "production");

		Assertions.assertEquals("DXP Production", licenseEntry.getName());
		Assertions.assertEquals("7.0", licenseEntry.getVersionMin());
	}

	@Test
	public void testGetLicenseEntryReturnsNullWhenUnknown() {
		Assertions.assertNull(
			_licenseEntryService.getLicenseEntry("KOR-00000", "production"));
	}

	private final LicenseEntryService _licenseEntryService =
		new LicenseEntryService();

}