/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

/**
 * @author Allen Ziegenfus
 */
public class LicenseEntry {

	public LicenseEntry(
		String productKey, String name, String type, String versionMin,
		String versionMax) {

		_productKey = productKey;
		_name = name;
		_type = type;
		_versionMin = versionMin;
		_versionMax = versionMax;
	}

	public String getName() {
		return _name;
	}

	public String getProductKey() {
		return _productKey;
	}

	/**
	 * Returns the name of the entry without the qualifier in parentheses that
	 * some entries end with, such as "DXP Production" for "DXP Production
	 * (Virtual Cluster)". The legacy provisioning system used this name as the
	 * product name of a key.
	 */
	public String getProductName() {
		int index = _name.lastIndexOf(" (");

		if ((index > 0) && _name.endsWith(")")) {
			return _name.substring(0, index);
		}

		return _name;
	}

	public String getType() {
		return _type;
	}

	public String getVersionMax() {
		return _versionMax;
	}

	public String getVersionMin() {
		return _versionMin;
	}

	private final String _name;
	private final String _productKey;
	private final String _type;
	private final String _versionMax;
	private final String _versionMin;

}