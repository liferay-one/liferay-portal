/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Set;

/**
 * @author Felipe Veloso
 */
public class ProductSpecificationConstants {

	public static final String KEY_PRICE_MODEL = "price-model";

	public static final String KEY_PROJECT_UTILIZATION_PROFILE =
		"project-utilization-profile";

	public static final String KEY_SOLUTION_TYPE = "solution-type";

	public static final String PRICE_MODEL_PAID = "Paid";

	public static final String SOLUTION_TYPE_CMP = "cmp";

	public static final String SOLUTION_TYPE_DSR = "dsr";

	public static final String SOLUTION_TYPE_LIFERAY_DATA_PLATFORM =
		"liferay-data-platform";

	public static final String UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD =
		"experience-dashboard";

	public static final String UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD =
		"saas-plan-dashboard";

	public static final String UTILIZATION_PROFILE_USAGE_METRICS =
		"usage-metrics";

	public static final Set<String> utilizationProfilesUsageDashboard = Set.of(
		UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD,
		UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD,
		UTILIZATION_PROFILE_USAGE_METRICS);

}