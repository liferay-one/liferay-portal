/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Ryan Schuhler
 */
public class SalesforceQueryJobException extends Exception {

	public SalesforceQueryJobException() {
	}

	public SalesforceQueryJobException(String message) {
		super(message);
	}

	public SalesforceQueryJobException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public SalesforceQueryJobException(Throwable throwable) {
		super(throwable);
	}

}