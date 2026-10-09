/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

import com.liferay.portal.kernel.security.auth.PrincipalException;

/**
 * @author Allen Ziegenfus
 */
public class ExpiredActivationTokenException extends PrincipalException {

	public ExpiredActivationTokenException() {
		super("The activation token has expired");
	}

}