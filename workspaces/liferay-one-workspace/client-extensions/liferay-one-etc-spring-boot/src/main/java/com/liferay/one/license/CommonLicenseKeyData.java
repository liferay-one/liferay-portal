/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import java.time.Instant;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeyData {

	public CommonLicenseKeyData(
		String productEnvironment, Instant startDateInstant,
		Instant endDateInstant) {

		_productEnvironment = productEnvironment;
		_startDateInstant = startDateInstant;
		_endDateInstant = endDateInstant;
	}

	public Instant getEndDateInstant() {
		return _endDateInstant;
	}

	public String getProductEnvironment() {
		return _productEnvironment;
	}

	public Instant getStartDateInstant() {
		return _startDateInstant;
	}

	private final Instant _endDateInstant;
	private final String _productEnvironment;
	private final Instant _startDateInstant;

}