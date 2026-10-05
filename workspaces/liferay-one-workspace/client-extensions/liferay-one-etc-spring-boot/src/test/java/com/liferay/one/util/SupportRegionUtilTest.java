/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.one.constants.SupportRegionConstants;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-SUPPORTREGIONUTIL] SupportRegionUtil")
public class SupportRegionUtilTest {

	@Test
	public void testGetSupportRegionForBlankSellingEntity() {
		Assertions.assertEquals(
			SupportRegionConstants.GLOBAL,
			SupportRegionUtil.getSupportRegion(null, "Spain"));
		Assertions.assertEquals(
			SupportRegionConstants.GLOBAL,
			SupportRegionUtil.getSupportRegion("", "Spain"));
	}

	@Test
	public void testGetSupportRegionForEachSellingEntity() {
		_assertSupportRegion(
			SupportRegionConstants.AUSTRALIA, "Liferay Australia");
		_assertSupportRegion(SupportRegionConstants.BRAZIL, "Liferay Brazil");
		_assertSupportRegion(
			SupportRegionConstants.CHINA, "Liferay China", "Liferay Singapore");
		_assertSupportRegion(SupportRegionConstants.GLOBAL, "Liferay Unknown");
		_assertSupportRegion(
			SupportRegionConstants.HUNGARY, "Liferay Africa", "Liferay France",
			"Liferay Germany", "Liferay Hungary", "Liferay International",
			"Liferay Italy", "Liferay Middle East", "Liferay Netherlands",
			"Liferay Nordic", "Liferay UK");
		_assertSupportRegion(SupportRegionConstants.INDIA, "Liferay India");
		_assertSupportRegion(SupportRegionConstants.JAPAN, "Liferay Japan");
		_assertSupportRegion(
			SupportRegionConstants.UNITED_STATES, "Liferay Canada",
			"Liferay US");
	}

	@Test
	public void testGetSupportRegionForSpain() {
		for (String countryName : new String[] {"Cyprus", "Greece", "Italy"}) {
			Assertions.assertEquals(
				SupportRegionConstants.HUNGARY,
				SupportRegionUtil.getSupportRegion(
					"Liferay Spain", countryName),
				countryName);
		}

		for (String countryName : new String[] {"Portugal", "Spain", null}) {
			Assertions.assertEquals(
				SupportRegionConstants.SPAIN,
				SupportRegionUtil.getSupportRegion(
					"Liferay Spain", countryName),
				countryName);
		}
	}

	private void _assertSupportRegion(String supportRegion, String... soldBys) {
		for (String soldBy : soldBys) {
			Assertions.assertEquals(
				supportRegion,
				SupportRegionUtil.getSupportRegion(soldBy, "Cyprus"), soldBy);
		}
	}

}