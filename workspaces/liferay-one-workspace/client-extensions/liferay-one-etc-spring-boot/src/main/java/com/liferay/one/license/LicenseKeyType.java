/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.petra.string.StringPool;
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
			if (licenseKeyType.matches(licenseEntry, false) ||
				licenseKeyType.matches(licenseEntry, true)) {

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

	/**
	 * Returns the license type of a key of the given key type that no license
	 * entry backs, such as the key of a product licensed as an app. A
	 * complimentary key takes the license type of a production key, as it does
	 * when a license entry backs it.
	 */
	public static String fetchLicenseType(String key) {
		LicenseKeyType licenseKeyType = fetchLicenseKeyType(key);

		if (licenseKeyType == COMPLIMENTARY) {
			licenseKeyType = PRODUCTION;
		}

		if (licenseKeyType == null) {
			return null;
		}

		return licenseKeyType.getType();
	}

	public String getKey() {
		return _key;
	}

	public String getType() {
		return _type;
	}

	public boolean isLicenseEntryBacked() {
		return Validator.isNotNull(_type);
	}

	public boolean isVirtualClusterSupported() {
		if (Objects.equals(_type, _TYPE_PRODUCTION) &&
			Validator.isNotNull(_nameSuffix)) {

			return true;
		}

		return false;
	}

	public boolean matches(LicenseEntry licenseEntry, boolean virtualCluster) {
		if (virtualCluster) {
			if (!isVirtualClusterSupported() ||
				!Objects.equals(
					_TYPE_VIRTUAL_CLUSTER, licenseEntry.getType())) {

				return false;
			}

			return _matchesName(
				licenseEntry.getName(), _NAME_SUFFIX_VIRTUAL_CLUSTER);
		}

		if (Validator.isNull(_type) ||
			!Objects.equals(_type, licenseEntry.getType())) {

			return false;
		}

		return _matchesName(licenseEntry.getName(), StringPool.BLANK);
	}

	private LicenseKeyType(
		String excludedNameSuffix, String key, String nameSuffix, String type) {

		_excludedNameSuffix = excludedNameSuffix;
		_key = key;
		_nameSuffix = nameSuffix;
		_type = type;
	}

	private boolean _matchesName(String name, String suffix) {
		if (Validator.isNotNull(_excludedNameSuffix) &&
			name.endsWith(_excludedNameSuffix + suffix)) {

			return false;
		}

		if (Validator.isNotNull(_nameSuffix) &&
			!name.endsWith(_nameSuffix + suffix)) {

			return false;
		}

		return true;
	}

	private static final String _NAME_SUFFIX_VIRTUAL_CLUSTER =
		" (Virtual Cluster)";

	private static final String _TYPE_PRODUCTION = "production";

	private static final String _TYPE_VIRTUAL_CLUSTER = "virtual-cluster";

	private final String _excludedNameSuffix;
	private final String _key;
	private final String _nameSuffix;
	private final String _type;

}