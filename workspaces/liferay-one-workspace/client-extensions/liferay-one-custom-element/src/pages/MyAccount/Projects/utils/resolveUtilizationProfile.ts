/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getProductSpecificationValue} from '~/utils/productUtils';

import {resolveProfile} from './resolveProfile';
import {SKU_UTILIZATION_PROFILES} from './skuUtilizationProfiles';

import type {DeliveryProduct} from '~/types/product';

export type UtilizationProfile =
	| 'ai-hub'
	| 'experience-dashboard'
	| 'legacy'
	| 'none'
	| 'saas-plan-dashboard'
	| 'usage-metrics';

const UTILIZATION_PROFILES: UtilizationProfile[] = [
	'ai-hub',
	'experience-dashboard',
	'legacy',
	'none',
	'saas-plan-dashboard',
	'usage-metrics',
];

function getPriority(utilizationProfile: UtilizationProfile): number {
	if (utilizationProfile === 'none') {
		return 0;
	}

	if (utilizationProfile === 'legacy') {
		return 1;
	}

	return 2;
}

export function resolveUtilizationProfile(
	product: DeliveryProduct,
	activeSkuExternalReferenceCodes: string[]
): UtilizationProfile {
	const productUtilizationProfile = resolveProfile(
		getProductSpecificationValue('project-utilization-profile', product),
		UTILIZATION_PROFILES,
		'none'
	);

	return activeSkuExternalReferenceCodes
		.map(
			(skuExternalReferenceCode) =>
				SKU_UTILIZATION_PROFILES[skuExternalReferenceCode] ??
				productUtilizationProfile
		)
		.reduce<UtilizationProfile>(
			(utilizationProfile1, utilizationProfile2) =>
				getPriority(utilizationProfile2) >
				getPriority(utilizationProfile1)
					? utilizationProfile2
					: utilizationProfile1,
			'none'
		);
}

export default resolveUtilizationProfile;
