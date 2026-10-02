/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
@DisplayName("[CLS-USAGEUNITUTIL] UsageUnitUtil")
public class UsageUnitUtilTest {

	@Test
	public void testConvertsBytesToGibibytes() {
		Assertions.assertEquals(
			4D,
			UsageUnitUtil.convert(
				4L * 1024L * 1024L * 1024L, UsageUnitUtil.UNIT_BYTES,
				UsageUnitUtil.UNIT_GIB));
		Assertions.assertEquals(
			0.5D,
			UsageUnitUtil.convert(
				512L * 1024L * 1024L, UsageUnitUtil.UNIT_BYTES,
				UsageUnitUtil.UNIT_GIB));
	}

	@Test
	public void testConvertsTebibytesToGibibytes() {
		Assertions.assertEquals(
			1024D,
			UsageUnitUtil.convert(
				1, UsageUnitUtil.UNIT_TIB, UsageUnitUtil.UNIT_GIB));
		Assertions.assertEquals(
			2D,
			UsageUnitUtil.convert(
				2048, UsageUnitUtil.UNIT_GIB, UsageUnitUtil.UNIT_TIB));
	}

	@Test
	public void testIgnoresUnitCase() {
		Assertions.assertEquals(1024D, UsageUnitUtil.convert(1, "tib", "gib"));
		Assertions.assertEquals(
			7D, UsageUnitUtil.convert(7, "events", "Events"));
	}

	@Test
	public void testPassesThroughUnitsOutsideByteScale() {
		Assertions.assertEquals(
			7D, UsageUnitUtil.convert(7, "count", "events"));
		Assertions.assertEquals(7D, UsageUnitUtil.convert(7, null, "vCPU"));
		Assertions.assertEquals(7D, UsageUnitUtil.convert(7, null, null));
	}

	@Test
	public void testRejectsByteScaleUnitPairedWithAnother() {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> UsageUnitUtil.convert(7, "events", UsageUnitUtil.UNIT_GIB));
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> UsageUnitUtil.convert(7, UsageUnitUtil.UNIT_GIB, null));
	}

	@Test
	public void testSameUnitIsUnchanged() {
		Assertions.assertEquals(
			7D, UsageUnitUtil.convert(7, "events", "events"));
		Assertions.assertEquals(
			7D,
			UsageUnitUtil.convert(
				7, UsageUnitUtil.UNIT_GIB, UsageUnitUtil.UNIT_GIB));
	}

}