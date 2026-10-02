/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	getProductSpecificationValue,
	getProductSpecificationValues,
} from '~/utils/productUtils';

import type {DeliveryProduct} from '~/types/product';

import type {ProjectItemType} from '../types';

export type DetailsProfile =
	| 'analytics'
	| 'basic'
	| 'basic-incident'
	| 'dates-status'
	| 'env-commerce'
	| 'env-instance'
	| 'paas'
	| 'saas';

const DETAILS_PROFILES: DetailsProfile[] = [
	'analytics',
	'basic',
	'basic-incident',
	'dates-status',
	'env-commerce',
	'env-instance',
	'paas',
	'saas',
];

function isDetailsProfile(value: string): value is DetailsProfile {
	return (DETAILS_PROFILES as string[]).includes(value);
}

export function resolveDetailsProfile({
	itemType,
	product,
}: {
	itemType: ProjectItemType;
	product: DeliveryProduct;
}): DetailsProfile {
	if (itemType === 'application') {
		return 'basic';
	}

	const profile = getProductSpecificationValue(
		'project-details-profile',
		product
	);

	if (isDetailsProfile(profile)) {
		return profile;
	}

	const categories = getProductSpecificationValues(
		'liferay-products-categories',
		product
	);

	if (categories.includes('Platform')) {
		return 'env-instance';
	}

	return 'basic';
}

export default resolveDetailsProfile;
