/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveDownloadProfile from './resolveDownloadProfile';

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

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEDOWNLOADPROFILE] resolveDownloadProfile', () => {
	it('uses a valid specification other than none', () => {
		expect(
			resolveDownloadProfile({
				itemType: 'product',
				product: toProduct({'project-download-profile': 'bundle'}),
			})
		).toBe('bundle');
		expect(
			resolveDownloadProfile({
				itemType: 'application',
				product: toProduct({
					'project-download-profile': 'bundle',
					'type': 'cloud',
				}),
			})
		).toBe('bundle');
	});

	it('falls back to the app type table for an application', () => {
		const cases: [string, string][] = [
			['client-extension', 'app'],
			['cloud', 'none'],
			['composite-app', 'app'],
			['dxp', 'app'],
			['low-code-configuration', 'app'],
			['other', 'none'],
			['theme', 'none'],
		];

		for (const [type, profile] of cases) {
			expect(
				resolveDownloadProfile({
					itemType: 'application',
					product: toProduct({
						'project-download-profile': 'none',
						type,
					}),
				})
			).toBe(profile);
		}
	});

	it('gives none to a non application without a specification', () => {
		expect(
			resolveDownloadProfile({
				itemType: 'product',
				product: toProduct({type: 'dxp'}),
			})
		).toBe('none');
		expect(
			resolveDownloadProfile({
				itemType: 'product',
				product: toProduct({'project-download-profile': 'bogus'}),
			})
		).toBe('none');
	});
});
