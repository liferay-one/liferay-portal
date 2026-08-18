/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Amos Fong
 */
public class ProductVersionTest {

	@Test
	public void testExtractQuarterlyPatchRelease() {
		Assertions.assertEquals(
			"2025.Q3.1",
			ProductVersion.extractQuarterlyPatchRelease("DXP 2025.Q3.1"));
		Assertions.assertEquals(
			"2024.Q1.10",
			ProductVersion.extractQuarterlyPatchRelease("2024.q1.10"));
		Assertions.assertEquals(
			"2026.Q4.2",
			ProductVersion.extractQuarterlyPatchRelease(
				"Liferay DXP 2026.Q4.2 GA1"));
	}

	@Test
	public void testExtractQuarterlyPatchReleaseWithoutPatch() {
		Assertions.assertEquals(
			"", ProductVersion.extractQuarterlyPatchRelease("DXP 2025.Q3"));
		Assertions.assertEquals(
			"", ProductVersion.extractQuarterlyPatchRelease("7.4"));
		Assertions.assertEquals(
			"", ProductVersion.extractQuarterlyPatchRelease(null));
	}

	@Test
	public void testExtractQuarterlyRelease() {
		Assertions.assertEquals(
			"2025.Q3", ProductVersion.extractQuarterlyRelease("DXP 2025.Q3.1"));
		Assertions.assertEquals(
			"2024.Q1", ProductVersion.extractQuarterlyRelease("2024.q1"));
		Assertions.assertEquals(
			"", ProductVersion.extractQuarterlyRelease("7.4"));
	}

}