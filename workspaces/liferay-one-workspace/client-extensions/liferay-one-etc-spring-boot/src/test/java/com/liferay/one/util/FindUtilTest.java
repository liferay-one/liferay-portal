/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class FindUtilTest {

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