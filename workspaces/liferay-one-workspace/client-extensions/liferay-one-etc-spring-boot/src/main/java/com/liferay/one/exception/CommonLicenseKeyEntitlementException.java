/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeyEntitlementException extends Exception {

	public CommonLicenseKeyEntitlementException(String productFamily) {
		_productFamily = productFamily;
	}

	public String getProductFamily() {
		return _productFamily;
	}

	private final String _productFamily;

}