/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getSKUFindings from './getSKUFindings';

import type {ProductFinding} from '../../utils/getProductFindings';

const PRODUCT_FINDINGS: ProductFinding[] = [
	{
		collection: 'product',
		ids: [100],
		message: 'the-product-is-inactive',
		severity: 'warning',
	},
	{
		collection: 'skus',
		ids: [1, 2],
		message: 'skus-are-also-used-by-another-product',
		severity: 'danger',
	},
	{
		collection: 'skus',
		ids: [2],
		message: 'skus-are-not-published-or-not-purchasable',
		severity: 'info',
	},
	{
		collection: 'entitlementDefinitions',
		ids: [500, 501],
		message: 'entitlement-definitions-are-inactive',
		severity: 'warning',
	},
	{
		collection: 'skus',
		ids: [],
		message: 'only-part-of-the-records-could-be-loaded',
		severity: 'warning',
	},
];

describe('[MOD-ADMIN-PRODUCTINSPECTOR-SKUDETAIL-GETSKUFINDINGS] getSKUFindings', () => {
	it('keeps the SKU findings of the SKU, the findings of its entitlement definitions, and the partial load warning', () => {
		expect(getSKUFindings(PRODUCT_FINDINGS, 1, new Set([501]))).toEqual([
			{
				collection: 'skus',
				ids: [1],
				message: 'skus-are-also-used-by-another-product',
				severity: 'danger',
			},
			{
				collection: 'entitlementDefinitions',
				ids: [501],
				message: 'entitlement-definitions-are-inactive',
				severity: 'warning',
			},
			{
				collection: 'skus',
				ids: [],
				message: 'only-part-of-the-records-could-be-loaded',
				severity: 'warning',
			},
		]);
	});

	it('keeps only the partial load warning for a SKU that no finding names', () => {
		expect(
			getSKUFindings(PRODUCT_FINDINGS, 3, new Set()).map(
				({message}) => message
			)
		).toEqual(['only-part-of-the-records-could-be-loaded']);
	});
});
