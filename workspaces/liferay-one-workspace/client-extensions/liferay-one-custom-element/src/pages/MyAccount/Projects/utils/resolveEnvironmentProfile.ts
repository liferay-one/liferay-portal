/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getProductSpecificationValue} from '~/utils/productUtils';

import {resolveProfile} from './resolveProfile';

import type {DeliveryProduct} from '~/types/product';

export type EnvironmentProfile =
	| 'ac-token'
	| 'ai-hub'
	| 'analytics-cloud'
	| 'cloud-native'
	| 'dxp'
	| 'none'
	| 'paas'
	| 'saas'
	| 'workspace';

const ENVIRONMENT_PROFILES: EnvironmentProfile[] = [
	'ac-token',
	'ai-hub',
	'analytics-cloud',
	'cloud-native',
	'dxp',
	'none',
	'paas',
	'saas',
	'workspace',
];

export function resolveEnvironmentProfile(
	product: DeliveryProduct
): EnvironmentProfile {
	return resolveProfile(
		getProductSpecificationValue('project-environment-profile', product),
		ENVIRONMENT_PROFILES,
		'none'
	);
}

export default resolveEnvironmentProfile;
