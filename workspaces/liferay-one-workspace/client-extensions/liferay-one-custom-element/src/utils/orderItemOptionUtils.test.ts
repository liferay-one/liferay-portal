/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getEnvironment,
	getInstanceSize,
	getOptionValueNames,
} from './orderItemOptionUtils';

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
});
