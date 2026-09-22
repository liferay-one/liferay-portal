/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyEntitlementException extends Exception {

	public LicenseKeyEntitlementException() {
	}

	public LicenseKeyEntitlementException(String message) {
		super(message);
	}

	public LicenseKeyEntitlementException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public LicenseKeyEntitlementException(Throwable throwable) {
		super(throwable);
	}

}