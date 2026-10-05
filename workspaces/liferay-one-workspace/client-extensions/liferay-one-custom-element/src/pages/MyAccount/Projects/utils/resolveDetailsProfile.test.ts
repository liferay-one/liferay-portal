/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveDetailsProfile from './resolveDetailsProfile';

import type {DeliveryProduct} from '~/types/product';

function toProduct(specifications: Record<string, string | string[]> = {}) {
	return {
		productSpecifications: Object.entries(specifications).flatMap(
			([specificationKey, value]) =>
				(Array.isArray(value) ? value : [value]).map((item) => ({
					specificationKey,
					value: item,
				}))
		),
	} as unknown as DeliveryProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEDETAILSPROFILE] resolveDetailsProfile', () => {
	it('always gives basic to an application', () => {
		expect(
			resolveDetailsProfile({
				itemType: 'application',
				product: toProduct({
					'liferay-products-categories': 'Platform',
					'project-details-profile': 'paas',
				}),
			})
		).toBe('basic');
	});

	it('uses a valid details profile specification', () => {
		expect(
			resolveDetailsProfile({
				itemType: 'product',
				product: toProduct({
					'liferay-products-categories': 'Platform',
					'project-details-profile': 'saas',
				}),
			})
		).toBe('saas');
	});

	it('yields env instance for the Platform category', () => {
		expect(
			resolveDetailsProfile({
				itemType: 'product',
				product: toProduct({
					'liferay-products-categories': ['Commerce', 'Platform'],
					'project-details-profile': 'bogus',
				}),
			})
		).toBe('env-instance');
	});

	it('gives basic to everything else', () => {
		expect(
			resolveDetailsProfile({
				itemType: 'product',
				product: toProduct({'liferay-products-categories': 'Commerce'}),
			})
		).toBe('basic');
		expect(
			resolveDetailsProfile({itemType: 'product', product: toProduct()})
		).toBe('basic');
	});
});
