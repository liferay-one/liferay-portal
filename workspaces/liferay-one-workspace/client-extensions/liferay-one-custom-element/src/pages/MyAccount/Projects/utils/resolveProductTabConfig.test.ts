/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import resolveProductTabConfig from './resolveProductTabConfig';

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

describe('[MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG] resolveProductTabConfig', () => {
	it('always includes details and orders', () => {
		expect(
			resolveProductTabConfig({
				hasActiveExperienceOffering: false,
				itemType: 'product',
				product: toProduct(),
			})
		).toEqual({detailsProfile: 'basic', tabKeys: ['details', 'orders']});
	});

	it('hides activation for none and for the license key profiles', () => {
		for (const profile of [
			'app-licenses',
			'dxp-portal',
			'keys-list',
			'licenses',
			'none',
		]) {
			const config = resolveProductTabConfig({
				hasActiveExperienceOffering: false,
				itemType: 'product',
				product: toProduct({'project-activation-profile': profile}),
			});

			expect(config.tabKeys).not.toContain('activation');
			expect(config.activationProfile).toBeUndefined();
		}
	});

	it('shows activation for other profiles', () => {
		const config = resolveProductTabConfig({
			hasActiveExperienceOffering: false,
			itemType: 'product',
			product: toProduct({'project-activation-profile': 'status'}),
		});

		expect(config.activationProfile).toBe('status');
		expect(config.tabKeys).toContain('activation');
	});

	it('hides cloud native activation only when an active experience offering exists', () => {
		const product = toProduct({
			'project-activation-profile': 'cloud-native',
		});

		expect(
			resolveProductTabConfig({
				hasActiveExperienceOffering: true,
				itemType: 'product',
				product,
			}).tabKeys
		).not.toContain('activation');
		expect(
			resolveProductTabConfig({
				hasActiveExperienceOffering: false,
				itemType: 'product',
				product,
			}).tabKeys
		).toContain('activation');
	});

	it('shows download, environment, and utilization when their profiles are not none, in PROJECT_TAB_ORDER', () => {
		const config = resolveProductTabConfig({
			hasActiveExperienceOffering: false,
			itemType: 'product',
			product: toProduct({
				'project-activation-profile': 'commerce',
				'project-download-profile': 'bundle',
				'project-environment-profile': 'paas',
				'project-learn-url': 'https://learn.liferay.com',
				'project-utilization-profile': 'usage-metrics',
			}),
		});

		expect(config).toEqual({
			activationProfile: 'commerce',
			detailsProfile: 'basic',
			downloadProfile: 'bundle',
			environmentProfile: 'paas',
			learnUrl: 'https://learn.liferay.com',
			tabKeys: [
				'details',
				'utilization',
				'environment',
				'activation',
				'download',
				'orders',
				'help-and-support',
			],
			utilizationProfile: 'usage-metrics',
		});
	});

	it('shows activation and download tabs for a cloud application', () => {
		const config = resolveProductTabConfig({
			hasActiveExperienceOffering: false,
			itemType: 'application',
			product: toProduct({type: 'cloud'}),
		});

		expect(config.activationProfile).toBe('app-provisioning');
		expect(config.downloadProfile).toBe('app');
		expect(config.tabKeys).toEqual([
			'details',
			'activation',
			'download',
			'orders',
		]);
	});

	it('shows help and support for an application with support specifications', () => {
		expect(
			resolveProductTabConfig({
				hasActiveExperienceOffering: false,
				itemType: 'application',
				product: toProduct({
					'support-email-address': 'help@example.com',
					'type': 'other',
				}),
			}).tabKeys
		).toEqual(['details', 'orders', 'help-and-support']);
	});

	it('ignores support specifications for a non application without a learn URL', () => {
		expect(
			resolveProductTabConfig({
				hasActiveExperienceOffering: false,
				itemType: 'product',
				product: toProduct({
					'support-email-address': 'help@example.com',
				}),
			}).tabKeys
		).toEqual(['details', 'orders']);
	});
});
