/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyTypeException extends LicenseKeyValidationException {

	public LicenseKeyTypeException() {
	}

	public LicenseKeyTypeException(String message) {
		super(message);
	}

	public LicenseKeyTypeException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public LicenseKeyTypeException(Throwable throwable) {
		super(throwable);
	}

}