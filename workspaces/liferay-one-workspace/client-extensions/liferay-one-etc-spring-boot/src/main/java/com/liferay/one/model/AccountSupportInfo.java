/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

/**
 * @author Drew Brokke
 */
public class AccountSupportInfo {

	public AccountSupportInfo(String supportLanguage, String supportRegion) {
		_supportLanguage = supportLanguage;
		_supportRegion = supportRegion;
	}

	public String getSupportLanguage() {
		return _supportLanguage;
	}

	public String getSupportRegion() {
		return _supportRegion;
	}

	private final String _supportLanguage;
	private final String _supportRegion;

}