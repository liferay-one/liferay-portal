/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.util.Locale;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-LOCALEUTIL] LocaleUtil")
public class LocaleUtilTest {

	@Test
	public void testFromLanguageIdConvertsUnderscoreLanguageID() {
		Assertions.assertEquals(
			Locale.forLanguageTag("en-US"), LocaleUtil.fromLanguageId("en_US"));
		Assertions.assertEquals(
			Locale.forLanguageTag("pt-BR"), LocaleUtil.fromLanguageId("pt_BR"));
		Assertions.assertEquals(
			Locale.forLanguageTag("ja"), LocaleUtil.fromLanguageId("ja"));
	}

	@Test
	public void testUS() {
		Assertions.assertEquals(Locale.forLanguageTag("en-US"), LocaleUtil.US);
	}

}