/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.constants.SupportLanguageConstants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-SUPPORTLANGUAGEUTIL] SupportLanguageUtil")
public class SupportLanguageUtilTest {

	@Test
	public void testGetLanguageForBlankSellingEntity() {
		Assertions.assertEquals(
			SupportLanguageConstants.ENGLISH,
			SupportLanguageUtil.getLanguage(null, "Brazil"));
		Assertions.assertEquals(
			SupportLanguageConstants.ENGLISH,
			SupportLanguageUtil.getLanguage("", "Japan"));
	}

	@Test
	public void testGetLanguageForBrazil() {
		Assertions.assertEquals(
			SupportLanguageConstants.PORTUGUESE,
			SupportLanguageUtil.getLanguage("Liferay Brazil", "Brazil"));
		Assertions.assertEquals(
			SupportLanguageConstants.SPANISH,
			SupportLanguageUtil.getLanguage("Liferay Brazil", "Mexico"));
		Assertions.assertEquals(
			SupportLanguageConstants.SPANISH,
			SupportLanguageUtil.getLanguage("Liferay Brazil", null));
	}

	@Test
	public void testGetLanguageForChina() {
		Assertions.assertEquals(
			SupportLanguageConstants.CHINESE,
			SupportLanguageUtil.getLanguage("Liferay China", "China"));
		Assertions.assertEquals(
			SupportLanguageConstants.ENGLISH,
			SupportLanguageUtil.getLanguage("Liferay China", "Taiwan"));
	}

	@Test
	public void testGetLanguageForEnglishSellingEntities() {
		for (String soldBy :
				new String[] {
					"Liferay Africa", "Liferay Australia", "Liferay Canada",
					"Liferay France", "Liferay Germany", "Liferay Hungary",
					"Liferay India", "Liferay International", "Liferay Italy",
					"Liferay Middle East", "Liferay Netherlands",
					"Liferay Nordic", "Liferay Singapore", "Liferay UK",
					"Liferay US", "Liferay Unknown"
				}) {

			Assertions.assertEquals(
				SupportLanguageConstants.ENGLISH,
				SupportLanguageUtil.getLanguage(soldBy, "Brazil"), soldBy);
		}
	}

	@Test
	public void testGetLanguageForJapan() {
		Assertions.assertEquals(
			SupportLanguageConstants.JAPANESE,
			SupportLanguageUtil.getLanguage("Liferay Japan", "United States"));
	}

	@Test
	public void testGetLanguageForSpain() {
		for (String countryName :
				new String[] {"Cyprus", "Greece", "Italy", "Portugal"}) {

			Assertions.assertEquals(
				SupportLanguageConstants.ENGLISH,
				SupportLanguageUtil.getLanguage("Liferay Spain", countryName),
				countryName);
		}

		Assertions.assertEquals(
			SupportLanguageConstants.SPANISH,
			SupportLanguageUtil.getLanguage("Liferay Spain", "Spain"));
		Assertions.assertEquals(
			SupportLanguageConstants.SPANISH,
			SupportLanguageUtil.getLanguage("Liferay Spain", null));
	}

}