/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getEnvironment,
	getInstanceSize,
	getOptionValueNames,
	getOrderItemProductName,
	getProductOptionValueName,
} from './orderItemOptionUtils';

function orderItem(options: object[]) {
	return {name: 'Liferay Data Platform', options: JSON.stringify(options)};
}

describe('[MOD-ORDERITEMOPTIONUTILS] orderItemOptionUtils', () => {
	it('reads the option value names of every option', () => {
		expect(
			getOptionValueNames(
				JSON.stringify([
					{
						skuOptionName: 'Liferay Commerce',
						skuOptionValueNames: [
							'Liferay Commerce Subscription - Prod Sizing 1',
						],
						value: ['01t4u00000diuqlaag'],
					},
					{skuOptionName: 'Empty'},
				])
			)
		).toEqual(['Liferay Commerce Subscription - Prod Sizing 1']);
	});

	it('returns no option value names for missing or invalid options', () => {
		expect(getOptionValueNames(undefined)).toEqual([]);
		expect(getOptionValueNames('{oops')).toEqual([]);
	});

	it('reads the environment from an option value name', () => {
		expect(
			[
				'Liferay Commerce Subscription - Prod Sizing 1',
				'Liferay Commerce Subscription - Non-Prod Sizing 1',
				'Liferay Commerce Subscription - Non Prod Sizing 1',
				'Liferay Commerce Subscription - Backup Sizing 1',
				'Liferay Commerce Subscription - Limited Sizing 1',
				'Liferay Self-Hosted Subscription - Gold Prod Sizing 1',
				'Portal EE 6.x License (Production)',
				'Liferay Self-Hosted - Business Solution',
				'Commerce Cloud Business Solution Bundle',
			].map((optionValueName) => getEnvironment([optionValueName]))
		).toEqual([
			'production',
			'non-production',
			'non-production',
			'backup',
			'limited',
			'production',
			'production',
			'',
			'',
		]);
	});

	it('reads the instance size from an option value name', () => {
		expect(
			[
				'Liferay Self-Hosted Subscription - Gold Prod Sizing 1',
				'Liferay Commerce Subscription - Non-Prod Sizing 12',
				'liferay-portal-developer-sizing-2',
				'Portal EE 6.x License (Production)',
			].map((optionValueName) => getInstanceSize([optionValueName]))
		).toEqual(['1', '12', '2', '']);
	});

	it('names an order item after its Salesforce product option first', () => {
		expect(
			getOrderItemProductName(
				orderItem([
					{
						key: 'consumption-role',
						skuOptionValueNames: ['Base Allotment'],
					},
					{
						key: 'liferay-data-platform',
						skuOptionValueNames: [
							'Liferay Data Platform - Sizing 1',
						],
					},
					{
						key: 'salesforce-product',
						skuOptionValueNames: [
							'Liferay Data Platform - Enterprise',
						],
					},
				])
			)
		).toBe('Liferay Data Platform - Enterprise');
	});

	it('names an order item after the option of its product', () => {
		expect(
			getOrderItemProductName(
				orderItem([
					{key: 'machinetype', skuOptionValueNames: ['High']},
					{
						key: 'liferay-data-platform',
						skuOptionValueNames: [
							'Liferay Data Platform - Sizing 1',
						],
					},
				])
			)
		).toBe('Liferay Data Platform - Sizing 1');
	});

	it('keeps the order item name when no option names a product', () => {
		expect(
			getOrderItemProductName(
				orderItem([
					{
						key: 'base-license-usage-type',
						skuOptionValueNames: ['Developer'],
					},
					{
						key: 'consumption-role',
						skuOptionValueNames: ['Add-On Bucket'],
					},
					{key: 'machinetype', skuOptionValueNames: ['High']},
					{key: 'liferay-data-platform', skuOptionValueNames: []},
				])
			)
		).toBe('Liferay Data Platform');
		expect(getProductOptionValueName(orderItem([]))).toBe('');
		expect(
			getOrderItemProductName({
				name: 'Liferay Data Platform',
				options: '{oops',
			})
		).toBe('Liferay Data Platform');
	});
});
