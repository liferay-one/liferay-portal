/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {UtilizationProfile} from './resolveUtilizationProfile';

/**
 * The utilization profile of a Salesforce SKU whose product groups it with
 * SKUs that need another dashboard. The products come from the Salesforce
 * migration, so the SKUs cannot move to other products.
 */
export const SKU_UTILIZATION_PROFILES: Record<string, UtilizationProfile> = {

	// Liferay SaaS: legacy site plans show the legacy billing notice

	// Liferay SaaS Subscription - Engage Site

	'01t4u00000dZBxAAAW': 'legacy',

	// Liferay SaaS Subscription - Support Site

	'01t4u00000dZBxBAAW': 'legacy',

	// Liferay SaaS Subscription - Transact Site

	'01t4u00000dZBxCAAW': 'legacy',

	// Liferay SaaS: the trial plan and the bundles are add-ons without a dashboard

	// Liferay Experience Cloud - Trial Plan

	'01tVO000000jLLGYA2': 'none',

	// Liferay SaaS - Digital Accelerator Bundle

	'01tVO00000QYrl8YAD': 'none',

	// Liferay SaaS - Standard Operations Bundle

	'01tVO00000QYrl9YAD': 'none',

	// Liferay SaaS - Enhanced Resilience Bundle

	'01tVO00000QYrlAYAT': 'none',

	// Liferay SaaS - Maximum Resilience Bundle

	'01tVO00000QYrlBYAT': 'none',

	// Liferay PaaS - Environments: legacy PaaS plans have no dashboard

	// Liferay PaaS Subscription - HA Prod Env

	'01t0g00000UvVonAAF': 'none',

	// Liferay PaaS Subscription - HA UAT Env

	'01t0g00000UvVosAAF': 'none',

	// Liferay PaaS Subscription - HA DR Env

	'01t0g00000UvVp2AAF': 'none',

	// Liferay PaaS Subscription - Std Prod Env

	'01t0g00000UvVp7AAF': 'none',

	// Liferay PaaS Subscription - Std UAT Env

	'01t0g00000UvVpCAAV': 'none',

	// Liferay PaaS Subscription - Non-Prod Env

	'01t0g00000UvVpHAAV': 'none',

	// Liferay PaaS Subscription - Std DR Env

	'01t0g00000UvVpMAAV': 'none',

	// Liferay PaaS Instance - Prod S

	'01t0g00000UvVpRAAV': 'none',

	// Liferay PaaS Instance - Prod M

	'01t0g00000UvVpWAAV': 'none',

	// Liferay PaaS Instance - Prod L

	'01t0g00000UvVpbAAF': 'none',

	// Liferay PaaS Instance - Backup S

	'01t0g00000UvVpgAAF': 'none',

	// Liferay PaaS Instance - Backup M

	'01t0g00000UvVplAAF': 'none',

	// Liferay PaaS Instance - Backup L

	'01t0g00000UvVpqAAF': 'none',

	// Liferay PaaS Instance - Non-Prod S

	'01t0g00000UvVpvAAF': 'none',

	// Liferay PaaS Instance - Non-Prod M

	'01t0g00000UvVq0AAF': 'none',

	// Liferay PaaS Instance - Non-Prod L

	'01t0g00000UvVq5AAF': 'none',

	// Liferay PaaS Subscription - HA Prod Env

	'01t4u00000dIUryAAG': 'none',

	// Liferay PaaS Subscription - HA DR Env

	'01t4u00000dIUs3AAG': 'none',

	// Liferay PaaS Subscription - HA UAT Env

	'01t4u00000dIUs8AAG': 'none',

	// Liferay PaaS Subscription - Std Prod Env

	'01t4u00000dIUsIAAW': 'none',

	// Liferay PaaS Subscription - Std DR Env

	'01t4u00000dIUsNAAW': 'none',

	// Liferay PaaS Subscription - Std UAT Env

	'01t4u00000dIUsSAAW': 'none',

	// Liferay PaaS Subscription - Non-Prod Env

	'01t4u00000dIUsXAAW': 'none',

	// Liferay PaaS Subscription - Std Prod Env - Sizing M

	'01t4u00000dcJNHAA2': 'none',

	// Liferay PaaS Subscription - Std UAT Env - Sizing M

	'01t4u00000dcJNMAA2': 'none',

	// Liferay PaaS Subscription - Std Non-Prod Env - Sizing M

	'01t4u00000dcJNRAA2': 'none',

	// Liferay PaaS Subscription - Std DR Env - Sizing M

	'01t4u00000dcJNWAA2': 'none',

	// Liferay PaaS Subscription - HA Prod Env - Sizing M

	'01t4u00000dcJNbAAM': 'none',

	// Liferay PaaS Subscription - HA UAT Env - Sizing M

	'01t4u00000dcJNgAAM': 'none',

	// Liferay PaaS Subscription - HA DR Env - Sizing M

	'01t4u00000dcJNqAAM': 'none',

	// Liferay PaaS Subscription - STD Prod Env - Sizing L

	'01t4u00000dci4AAAQ': 'none',

	// Liferay PaaS Subscription - STD UAT Env - Sizing L

	'01t4u00000dci4FAAQ': 'none',

	// Liferay PaaS Subscription - Non-Prod Env - Sizing L

	'01t4u00000dci4KAAQ': 'none',

	// Liferay PaaS Subscription - STD DR Env - Sizing L

	'01t4u00000dci4PAAQ': 'none',

	// Liferay PaaS Subscription - HA Prod Env - Sizing L

	'01t4u00000dci4UAAQ': 'none',

	// Liferay PaaS Subscription - HA UAT Env - Sizing L

	'01t4u00000dci4ZAAQ': 'none',

	// Liferay PaaS Subscription - HA DR Env - Sizing L

	'01t4u00000dci4qAAA': 'none',
};
