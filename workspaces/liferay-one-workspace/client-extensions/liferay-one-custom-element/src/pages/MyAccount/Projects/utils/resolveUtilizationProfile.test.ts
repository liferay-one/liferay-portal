/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveUtilizationProfile from './resolveUtilizationProfile';

import type {DeliveryProduct} from '~/types/product';

function toProduct(value?: string) {
	return {
		productSpecifications: value
			? [{specificationKey: 'project-utilization-profile', value}]
			: [],
	} as unknown as DeliveryProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEUTILIZATIONPROFILE] resolveUtilizationProfile', () => {
	it('returns each of the six known profiles', () => {
		for (const profile of [
			'ai-hub',
			'experience-dashboard',
			'legacy',
			'none',
			'saas-plan-dashboard',
			'usage-metrics',
		]) {
			expect(resolveUtilizationProfile(toProduct(profile))).toBe(profile);
		}
	});

	it('returns none for an unknown or missing profile', () => {
		expect(resolveUtilizationProfile(toProduct('paas'))).toBe('none');
		expect(resolveUtilizationProfile(toProduct())).toBe('none');
	});
});
