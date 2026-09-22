/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyGenerationConstants {

	public static final int DEVELOPER_MAJOR_VERSION_COUNT = 2;

	public static final String ENTITLEMENT_DEFINITION_NAME_LICENSE_GENERATION =
		"licenseGeneration";

	public static final String[] KEY_TYPE_NAME_SUFFIXES = {
		"Backup", "Development", "Flex", "Non-Production"
	};

	public static final String[] LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES = {
		"PRDCT-CLOUD-NATIVE", "PRDCT-DXP", "PRDCT-PORTAL"
	};

	public static final String MINIMUM_DEVELOPER_VERSION = "7.4";

	public static final String PRODUCT_GROUP_DXP = "dxp";

	public static final String[] UNSUPPORTED_LICENSE_ENTRY_TYPES = {
		"free", "virtual-cluster"
	};

}