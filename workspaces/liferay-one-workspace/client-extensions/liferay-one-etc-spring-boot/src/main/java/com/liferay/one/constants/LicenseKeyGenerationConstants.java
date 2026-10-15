/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyGenerationConstants {

	public static final int COMPLIMENTARY_DURATION_DAYS = 30;

	public static final int COMPLIMENTARY_PURPOSE_MAX_LENGTH = 255;

	public static final int DEVELOPER_MAJOR_VERSION_COUNT = 2;

	public static final int DEVELOPER_MAX_HTTP_SESSIONS = 5;

	public static final String ENTITLEMENT_DEFINITION_NAME_LICENSE_GENERATION =
		"licenseGeneration";

	public static final String KEY_TYPE_COMPLIMENTARY = "complimentary";

	public static final String KEY_TYPE_PRODUCTION = "production";

	public static final String LICENSE_KEY_FAMILY_CLOUD_NATIVE = "Cloud Native";

	public static final String LICENSE_KEY_FAMILY_DXP = "DXP";

	public static final String LICENSE_KEY_FAMILY_PORTAL = "Portal";

	public static final String MINIMUM_DEVELOPER_VERSION = "7.4";

	public static final int PERMANENT_LICENSE_KEY_DURATION_DAYS = 36500;

	public static final int PERMANENT_LICENSE_KEY_MIN_YEARS = 80;

	public static final String PRODUCT_GROUP_DXP = "dxp";

	public static final int SELF_SERVICE_TRIAL_DURATION_DAYS_CUSTOMER = 90;

	public static final int SELF_SERVICE_TRIAL_DURATION_DAYS_PROSPECT = 30;

	public static final int TERMED_LICENSE_KEY_EXTENSION_DAYS = 180;

	public static final List<String> downloadableKeyTypes =
		Collections.unmodifiableList(
			Arrays.asList("developer", "developer-cluster"));
	public static final Map<String, String>
		leadingLicenseKeyFamilyProductNames = Map.of(
			LICENSE_KEY_FAMILY_CLOUD_NATIVE, "Cloud Native",
			LICENSE_KEY_FAMILY_DXP, "Liferay DXP", LICENSE_KEY_FAMILY_PORTAL,
			"Liferay Portal");

}