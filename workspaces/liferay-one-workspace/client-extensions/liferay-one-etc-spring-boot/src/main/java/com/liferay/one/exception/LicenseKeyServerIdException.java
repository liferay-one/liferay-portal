/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyServerIdException extends LicenseKeyValidationException {

	public LicenseKeyServerIdException() {
	}

	public LicenseKeyServerIdException(String message) {
		super(message);
	}

	public LicenseKeyServerIdException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public LicenseKeyServerIdException(Throwable throwable) {
		super(throwable);
	}

}