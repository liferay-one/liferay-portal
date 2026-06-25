/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.exception;

/**
 * @author Drew Brokke
 */
public class JiraAssetSchemaException extends RuntimeException {

	public JiraAssetSchemaException(String message) {
		super(message);
	}

	public JiraAssetSchemaException(String message, Throwable throwable) {
		super(message, throwable);
	}

}