/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.portal.kernel.util.Validator;

import java.util.Objects;

/**
 * @author Ryan Schuhler
 */
public enum LicenseKeyType {

	BACKUP(null, "backup", "Backup", "production"),
	COMPLIMENTARY(null, "complimentary", null, null),
	DEVELOPER(null, "developer", null, "developer"),
	DEVELOPER_CLUSTER(null, "developer-cluster", null, "developer-cluster"),
	ENTERPRISE(null, "enterprise", null, "enterprise"),
	FREE(null, "free", null, "free"),
	NON_PRODUCTION(null, "non-production", "Non-Production", "production"),
	OEM(null, "oem", null, "oem"),
	PRODUCTION("Non-Production", "production", "Production", "production"),
	UAT(null, "uat", null, null);

	public static LicenseKeyType fetchLicenseKeyType(
		LicenseEntry licenseEntry) {

		for (LicenseKeyType licenseKeyType : values()) {
			if (licenseKeyType.matches(licenseEntry)) {
				return licenseKeyType;
			}
		}

		return null;
	}

	public static LicenseKeyType fetchLicenseKeyType(String key) {
		for (LicenseKeyType licenseKeyType : values()) {
			if (Objects.equals(licenseKeyType.getKey(), key)) {
				return licenseKeyType;
			}
		}

		return null;
	}

	public String getKey() {
		return _key;
	}

	public boolean isLicenseEntryBacked() {
		return Validator.isNotNull(_type);
	}

	public boolean matches(LicenseEntry licenseEntry) {
		if (Validator.isNull(_type) ||
			!Objects.equals(_type, licenseEntry.getType())) {

			return false;
		}

		String name = licenseEntry.getName();

		if (Validator.isNotNull(_excludedNameSuffix) &&
			name.endsWith(_excludedNameSuffix)) {

			return false;
		}

		if (Validator.isNotNull(_nameSuffix) && !name.endsWith(_nameSuffix)) {
			return false;
		}

		return true;
	}

	private LicenseKeyType(
		String excludedNameSuffix, String key, String nameSuffix, String type) {

		_excludedNameSuffix = excludedNameSuffix;
		_key = key;
		_nameSuffix = nameSuffix;
		_type = type;
	}

	private final String _excludedNameSuffix;
	private final String _key;
	private final String _nameSuffix;
	private final String _type;

}