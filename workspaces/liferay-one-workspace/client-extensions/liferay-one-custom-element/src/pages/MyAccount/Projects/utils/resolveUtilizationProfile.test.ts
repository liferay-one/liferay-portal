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
			expect(
				resolveUtilizationProfile(toProduct(profile), ['SKU-1'])
			).toBe(profile);
		}
	});

	it('returns none for an unknown or missing profile', () => {
		expect(resolveUtilizationProfile(toProduct('paas'), ['SKU-1'])).toBe(
			'none'
		);
		expect(resolveUtilizationProfile(toProduct(), ['SKU-1'])).toBe('none');
	});

	it('returns none without an active SKU', () => {
		expect(
			resolveUtilizationProfile(toProduct('saas-plan-dashboard'), [])
		).toBe('none');
	});

	it('uses the profile of a hardcoded SKU over the product profile', () => {
		const product = toProduct('saas-plan-dashboard');

		// Liferay SaaS Subscription - Engage Site

		expect(resolveUtilizationProfile(product, ['01t4u00000dZBxAAAW'])).toBe(
			'legacy'
		);

		// Liferay Experience Cloud - Trial Plan

		expect(resolveUtilizationProfile(product, ['01tVO000000jLLGYA2'])).toBe(
			'none'
		);

		// Liferay PaaS Subscription - Std Prod Env

		expect(
			resolveUtilizationProfile(toProduct('experience-dashboard'), [
				'01t4u00000dIUsIAAW',
			])
		).toBe('none');
	});

	it('prefers a dashboard over legacy over none across the active SKUs', () => {
		const product = toProduct('saas-plan-dashboard');

		// Pro Plan, Engage Site and Digital Accelerator Bundle

		expect(
			resolveUtilizationProfile(product, [
				'01tVO00000QYrl8YAD',
				'01t4u00000dZBxAAAW',
				'01t4u00000f7jOwAAI',
			])
		).toBe('saas-plan-dashboard');

		// Engage Site and Digital Accelerator Bundle

		expect(
			resolveUtilizationProfile(product, [
				'01tVO00000QYrl8YAD',
				'01t4u00000dZBxAAAW',
			])
		).toBe('legacy');
	});
});
