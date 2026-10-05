/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util.comparator;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-VERSIONCOMPARATOR] VersionComparator")
public class VersionComparatorTest {

	@Test
	public void testCompareNonquarterlyVersionsAsStrings() {
		VersionComparator versionComparator = new VersionComparator();

		Assertions.assertTrue(versionComparator.compare("7.3", "7.4") < 0);
		Assertions.assertTrue(versionComparator.compare("7.4", "7.3") > 0);
		Assertions.assertEquals(0, versionComparator.compare("7.4", "7.4"));
	}

	@Test
	public void testCompareQuarterlyVersionsByYearThenQuarter() {
		VersionComparator versionComparator = new VersionComparator();

		Assertions.assertTrue(
			versionComparator.compare("2025.Q4", "2026.Q1") < 0);
		Assertions.assertTrue(
			versionComparator.compare("2026.Q3", "2026.Q2") > 0);
		Assertions.assertEquals(
			0, versionComparator.compare("2026.q1", "2026.Q1"));
	}

	@Test
	public void testCompareSortsQuarterlyAboveNonquarterly() {
		VersionComparator versionComparator = new VersionComparator();

		Assertions.assertTrue(versionComparator.compare("2023.Q1", "7.4") > 0);
		Assertions.assertTrue(versionComparator.compare("7.4", "2023.Q1") < 0);
	}

	@Test
	public void testDescendingReversesResult() {
		VersionComparator versionComparator = new VersionComparator(false);

		Assertions.assertFalse(versionComparator.isAscending());
		Assertions.assertTrue(
			versionComparator.compare("2025.Q4", "2026.Q1") > 0);
		Assertions.assertTrue(versionComparator.compare("2023.Q1", "7.4") < 0);
		Assertions.assertTrue(versionComparator.compare("7.3", "7.4") > 0);

		List<String> versions = new ArrayList<>(
			List.of("7.3", "2026.Q1", "7.4", "2025.Q4"));

		versions.sort(versionComparator);

		Assertions.assertEquals(
			List.of("2026.Q1", "2025.Q4", "7.4", "7.3"), versions);
	}

	@Test
	public void testIsAscendingByDefault() {
		Assertions.assertTrue(
			new VersionComparator(
			).isAscending());
	}

}