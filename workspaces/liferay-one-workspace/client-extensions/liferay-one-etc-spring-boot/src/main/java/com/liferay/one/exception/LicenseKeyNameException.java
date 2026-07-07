/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyNameException extends LicenseKeyValidationException {

	public LicenseKeyNameException() {
	}

	public LicenseKeyNameException(String message) {
		super(message);
	}

	public LicenseKeyNameException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public LicenseKeyNameException(Throwable throwable) {
		super(throwable);
	}

}