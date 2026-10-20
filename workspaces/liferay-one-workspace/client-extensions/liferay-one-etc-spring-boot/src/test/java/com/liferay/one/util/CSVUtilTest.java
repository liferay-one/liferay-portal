/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-CSVUTIL] CSVUtil")
public class CSVUtilTest {

	@Test
	public void testFormatFieldsEscapesQuotes() {
		Assertions.assertEquals(
			"\"Acme \"\"North\"\"\",\"\"\n",
			CSVUtil.formatFields("Acme \"North\"", null));
	}

	@Test
	public void testFormatFieldsNeutralizesFormulas() {
		Assertions.assertEquals(
			"\"'=1+1\",\"'+1\",\"'-1\",\"'@SUM(A1)\",\"'\t=1\",\"'\r=1\"\n",
			CSVUtil.formatFields(
				"=1+1", "+1", "-1", "@SUM(A1)", "\t=1", "\r=1"));
	}

	@Test
	public void testFormatFieldsQuotesPlainValues() {
		Assertions.assertEquals(
			"\"Acme\",\"42\"\n", CSVUtil.formatFields("Acme", 42));
	}

}