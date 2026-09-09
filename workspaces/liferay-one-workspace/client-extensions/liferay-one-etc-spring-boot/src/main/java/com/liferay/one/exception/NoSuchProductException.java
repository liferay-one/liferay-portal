/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Amos Fong
 */
public class NoSuchProductException extends Exception {

	public NoSuchProductException() {
	}

	public NoSuchProductException(String message) {
		super(message);
	}

	public NoSuchProductException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public NoSuchProductException(Throwable throwable) {
		super(throwable);
	}

}