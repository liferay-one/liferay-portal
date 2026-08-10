/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class FindUtilTest {

	@Test
	public void testContainsIgnoreCase() {
		List<String> values = List.of("Apple", "banana");

		Assertions.assertTrue(FindUtil.containsIgnoreCase(values, "Apple"));
		Assertions.assertTrue(FindUtil.containsIgnoreCase(values, "apple"));
		Assertions.assertTrue(FindUtil.containsIgnoreCase(values, "BANANA"));

		Assertions.assertFalse(FindUtil.containsIgnoreCase(values, "cherry"));
		Assertions.assertFalse(FindUtil.containsIgnoreCase(values, null));

		Assertions.assertFalse(FindUtil.containsIgnoreCase(null, "apple"));
		Assertions.assertFalse(
			FindUtil.containsIgnoreCase(Collections.emptyList(), "apple"));

		Assertions.assertTrue(
			FindUtil.containsIgnoreCase(Arrays.asList("apple", null), null));
		Assertions.assertFalse(
			FindUtil.containsIgnoreCase(
				Arrays.asList("apple", null), "cherry"));
	}

	@Test
	public void testFindFirst() {
		Assertions.assertEquals(
			"banana",
			FindUtil.findFirst(
				List.of("apple", "banana", "cherry"),
				value -> value.startsWith("b")));
		Assertions.assertEquals(
			"banana",
			FindUtil.findFirst(
				new String[] {"apple", "banana", "cherry"},
				value -> value.startsWith("b")));

		Assertions.assertNull(
			FindUtil.findFirst(
				List.of("apple", "banana", "cherry"),
				value -> value.startsWith("z")));
		Assertions.assertNull(
			FindUtil.findFirst(
				new String[] {"apple", "banana", "cherry"},
				value -> value.startsWith("z")));

		Assertions.assertNull(
			FindUtil.findFirst((List<String>)null, value -> true));
		Assertions.assertNull(
			FindUtil.findFirst((String[])null, value -> true));
	}

}