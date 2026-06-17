/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.exception;

/**
 * @author Karoline Silva
 */
public class OrganizationNotFoundException extends Exception {

	public OrganizationNotFoundException() {
	}

	public OrganizationNotFoundException(String message) {
		super(message);
	}

	public OrganizationNotFoundException(Throwable throwable) {
		super(throwable);
	}

}