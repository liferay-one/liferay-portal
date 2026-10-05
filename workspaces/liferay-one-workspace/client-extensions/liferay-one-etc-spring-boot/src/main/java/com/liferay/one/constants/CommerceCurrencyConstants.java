/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * @author Kyle Bischof
 */
public class CommerceCurrencyConstants {

	public static final List<String> codesSupportedCurrencies =
		Collections.unmodifiableList(
			Arrays.asList(
				"AUD", "BRL", "EUR", "GBP", "INR", "JPY", "SGD", "USD"));

}