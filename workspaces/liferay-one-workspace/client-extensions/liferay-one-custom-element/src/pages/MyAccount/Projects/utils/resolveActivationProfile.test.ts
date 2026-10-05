/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveActivationProfile from './resolveActivationProfile';

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

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEACTIVATIONPROFILE] resolveActivationProfile', () => {
	it('uses a valid project activation profile specification first', () => {
		expect(
			resolveActivationProfile({
				itemType: 'application',
				product: toProduct({
					'project-activation-profile': 'status',
					'type': 'cloud',
				}),
			})
		).toBe('status');
		expect(
			resolveActivationProfile({
				itemType: 'product',
				product: toProduct({
					'project-activation-profile': 'cloud-native',
				}),
			})
		).toBe('cloud-native');
	});

	it('maps an application app type through the table', () => {
		const cases: [string, string][] = [
			['client-extension', 'app-licenses'],
			['cloud', 'app-provisioning'],
			['composite-app', 'app-licenses'],
			['dxp', 'app-licenses'],
			['low-code-configuration', 'none'],
			['other', 'none'],
		];

		for (const [type, profile] of cases) {
			expect(
				resolveActivationProfile({
					itemType: 'application',
					product: toProduct({
						'project-activation-profile': 'bogus',
						type,
					}),
				})
			).toBe(profile);
		}
	});

	it('falls back to app licenses for an application with an unknown app type', () => {
		expect(
			resolveActivationProfile({
				itemType: 'application',
				product: toProduct({type: 'theme'}),
			})
		).toBe('app-licenses');
	});

	it('falls back to none for a non application', () => {
		expect(
			resolveActivationProfile({
				itemType: 'product',
				product: toProduct({type: 'cloud'}),
			})
		).toBe('none');
	});
});
