/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

/**
 * @author Pedro Oliveira
 */
public class NoSuchActivationKeyException extends Exception {

	public NoSuchActivationKeyException() {
	}

	public NoSuchActivationKeyException(String message) {
		super(message);
	}

	public NoSuchActivationKeyException(String message, Throwable throwable) {
		super(message, throwable);
	}

	public NoSuchActivationKeyException(Throwable throwable) {
		super(throwable);
	}

}