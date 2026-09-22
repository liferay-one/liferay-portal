/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Pedro Oliveira
 */
public class ServerInfoUtilTest {

	@Test
	public void testToCommaSeparatedDropsBlankLines() {
		Assertions.assertEquals(
			"1.1.1.1,2.2.2.2",
			ServerInfoUtil.toCommaSeparated("1.1.1.1\n\n2.2.2.2\n"));
	}

	@Test
	public void testToCommaSeparatedJoinsEveryLine() {
		Assertions.assertEquals(
			"1.1.1.1,2.2.2.2,3.3.3.3",
			ServerInfoUtil.toCommaSeparated("1.1.1.1\n2.2.2.2\n3.3.3.3"));
	}

	@Test
	public void testToCommaSeparatedJoinsWindowsLineEndings() {
		Assertions.assertEquals(
			"1.1.1.1,2.2.2.2,3.3.3.3",
			ServerInfoUtil.toCommaSeparated("1.1.1.1\r\n2.2.2.2\r\n3.3.3.3"));
	}

	@Test
	public void testToCommaSeparatedReturnsBlankWhenNull() {
		Assertions.assertEquals("", ServerInfoUtil.toCommaSeparated(null));
	}

	@Test
	public void testToCommaSeparatedTrimsEachLine() {
		Assertions.assertEquals(
			"1.1.1.1,2.2.2.2",
			ServerInfoUtil.toCommaSeparated("  1.1.1.1  \n\t2.2.2.2 "));
	}

	@Test
	public void testToCommaSeparatedWithSingleValue() {
		Assertions.assertEquals(
			"host.example.com",
			ServerInfoUtil.toCommaSeparated("host.example.com"));
	}

}