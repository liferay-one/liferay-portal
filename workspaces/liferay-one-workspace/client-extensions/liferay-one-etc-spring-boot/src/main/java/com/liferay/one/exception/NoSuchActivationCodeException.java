/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.exception;

import com.liferay.petra.string.StringBundler;

/**
 * @author Amos Fong
 */
public class NoSuchActivationCodeException extends Exception {

	public NoSuchActivationCodeException(
		String activationCode, String environmentId) {

		super(
			StringBundler.concat(
				"No cloud native environment exists for activation code ",
				activationCode, " requested by environment ", environmentId));
	}

}