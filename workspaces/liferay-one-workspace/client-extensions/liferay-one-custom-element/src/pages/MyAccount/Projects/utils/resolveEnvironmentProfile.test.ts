/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveEnvironmentProfile from './resolveEnvironmentProfile';

import type {DeliveryProduct} from '~/types/product';

function toProduct(value?: string) {
	return {
		productSpecifications: value
			? [{specificationKey: 'project-environment-profile', value}]
			: [],
	} as unknown as DeliveryProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEENVIRONMENTPROFILE] resolveEnvironmentProfile', () => {
	it('returns each of the nine known profiles', () => {
		for (const profile of [
			'ac-token',
			'ai-hub',
			'analytics-cloud',
			'cloud-native',
			'dxp',
			'none',
			'paas',
			'saas',
			'workspace',
		]) {
			expect(resolveEnvironmentProfile(toProduct(profile))).toBe(profile);
		}
	});

	it('returns none for an unknown or missing profile', () => {
		expect(resolveEnvironmentProfile(toProduct('PaaS'))).toBe('none');
		expect(resolveEnvironmentProfile(toProduct())).toBe('none');
	});
});
