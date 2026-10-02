/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.math.BigDecimal;
import java.math.MathContext;

import java.util.Map;

/**
 * Converts a quantity between the units a usage source reports in and the
 * units a usage definition is sold in. Only byte scale units convert. Two
 * units outside that scale are taken as the same thing spelled two ways, such
 * as <code>count</code> and <code>events</code>, since there is no exchange
 * rate to apply; a byte scale unit paired with anything else is a mismatch.
 *
 * @author Drew Brokke
 */
public class UsageUnitUtil {

	public static final String UNIT_BYTES = "bytes";

	public static final String UNIT_GB = "GB";

	public static final String UNIT_GIB = "GiB";

	public static final String UNIT_TB = "TB";

	public static final String UNIT_TIB = "TiB";

	public static double convert(
		double quantity, String fromUnit, String toUnit) {

		if (_isSameUnit(fromUnit, toUnit)) {
			return quantity;
		}

		BigDecimal fromBytes = _getBytes(fromUnit);
		BigDecimal toBytes = _getBytes(toUnit);

		if ((fromBytes == null) && (toBytes == null)) {
			return quantity;
		}

		if ((fromBytes == null) || (toBytes == null)) {
			throw new IllegalArgumentException(
				StringBundler.concat(
					"Unable to convert ", quantity, " from \"", fromUnit,
					"\" to \"", toUnit, "\""));
		}

		BigDecimal bigDecimal = BigDecimal.valueOf(
			quantity
		).multiply(
			fromBytes
		).divide(
			toBytes, MathContext.DECIMAL64
		);

		return bigDecimal.doubleValue();
	}

	private static BigDecimal _getBytes(String unit) {
		if (Validator.isNull(unit)) {
			return null;
		}

		return _bytesByUnit.get(StringUtil.toLowerCase(unit));
	}

	private static boolean _isSameUnit(String fromUnit, String toUnit) {
		if (Validator.isNull(fromUnit) || Validator.isNull(toUnit)) {
			return false;
		}

		return StringUtil.equalsIgnoreCase(fromUnit, toUnit);
	}

	private static final Map<String, BigDecimal> _bytesByUnit =
		HashMapBuilder.<String, BigDecimal>put(
			StringUtil.toLowerCase(UNIT_BYTES), BigDecimal.ONE
		).put(
			StringUtil.toLowerCase(UNIT_GB), BigDecimal.valueOf(1000000000L)
		).put(
			StringUtil.toLowerCase(UNIT_GIB),
			BigDecimal.valueOf(1024L * 1024L * 1024L)
		).put(
			StringUtil.toLowerCase(UNIT_TB), BigDecimal.valueOf(1000000000000L)
		).put(
			StringUtil.toLowerCase(UNIT_TIB),
			BigDecimal.valueOf(1024L * 1024L * 1024L * 1024L)
		).build();

}