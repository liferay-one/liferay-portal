/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * @author Kyle Bischof
 */
public class CommerceProductConstants {

	public static final String
		NAME_LIFERAY_CLOUD_NATIVE_DIGITAL_ACCELERATOR_BUNDLE =
			"Liferay Cloud Native - Digital Accelerator Bundle";

	public static final String
		NAME_LIFERAY_CLOUD_NATIVE_ENHANCED_RESILIENCE_BUNDLE =
			"Liferay Cloud Native - Enhanced Resilience Bundle";

	public static final String
		NAME_LIFERAY_CLOUD_NATIVE_MAXIMUM_RESILIENCE_BUNDLE =
			"Liferay Cloud Native - Maximum Resilience Bundle";

	public static final String
		NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE =
			"Liferay Cloud Native - Standard Operations Bundle";

	public static final String NAME_PAAS_EXPERIENCE = "PaaS Experience";

	public static final String SPECIFICATION_KEY_CLOUD_ENABLED =
		"cloud-enabled";

	public static final String SPECIFICATION_KEY_PROJECT_ENVIRONMENT_PROFILE =
		"project-environment-profile";

	public static final List<String> namesCloudNativeProducts =
		Collections.unmodifiableList(
			Arrays.asList(
				NAME_LIFERAY_CLOUD_NATIVE_DIGITAL_ACCELERATOR_BUNDLE,
				NAME_LIFERAY_CLOUD_NATIVE_ENHANCED_RESILIENCE_BUNDLE,
				NAME_LIFERAY_CLOUD_NATIVE_MAXIMUM_RESILIENCE_BUNDLE,
				NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE));

}