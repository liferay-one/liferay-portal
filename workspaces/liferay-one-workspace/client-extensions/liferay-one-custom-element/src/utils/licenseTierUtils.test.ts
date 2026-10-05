/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getLicenseTierSKU,
	getLicenseTierSKUs,
	getProductLicenseTiers,
	getSKULicenseTier,
	isProductLicenseTier,
} from './licenseTierUtils';

import type {DeliveryProduct, DeliverySKU} from '~/types/product';

function toSKU(
	sku: string,
	skuOptionKey: string,
	skuOptionValueKey: string,
	purchasable = true
) {
	return {
		purchasable,
		sku,
		skuOptions: [{skuOptionKey, skuOptionValueKey}],
	} as DeliverySKU;
}

const developerSKU = toSKU('DEV', 'dxp-license-usage-type', 'developer');
const productionSKU = toSKU('PROD', 'cmp-license-usage-type', 'production');
const standardSKU = toSKU('STD', 'base-license-usage-type', 'standard');
const trialSKU = toSKU('TRIAL', 'cloud-license-usage-type', 'trial');

const product = {
	skus: [
		standardSKU,
		toSKU('UNPURCHASABLE', 'dxp-license-usage-type', 'developer', false),
		productionSKU,
		toSKU('OTHER-OPTION', 'color', 'trial'),
		toSKU('UNKNOWN-TIER', 'dxp-license-usage-type', 'enterprise'),
		trialSKU,
		developerSKU,
	],
} as DeliveryProduct;

describe('[MOD-LICENSETIERUTILS] licenseTierUtils', () => {
	it('keeps only purchasable SKUs with a license usage option of a known tier', () => {
		expect(
			getLicenseTierSKUs(product)
				.map(({sku}) => sku.sku)
				.sort()
		).toEqual(['DEV', 'PROD', 'STD', 'TRIAL']);
	});

	it('sorts by developer, trial, production, standard', () => {
		expect(getLicenseTierSKUs(product)).toEqual([
			{sku: developerSKU, tier: 'developer'},
			{sku: trialSKU, tier: 'trial'},
			{sku: productionSKU, tier: 'production'},
			{sku: standardSKU, tier: 'standard'},
		]);
	});

	it('finds the SKU of one tier', () => {
		expect(getLicenseTierSKU(product, 'production')).toBe(productionSKU);
		expect(
			getLicenseTierSKU({skus: [standardSKU]} as DeliveryProduct, 'trial')
		).toBeUndefined();
	});

	it('lists the tiers present', () => {
		expect(
			getProductLicenseTiers({
				skus: [standardSKU, developerSKU],
			} as DeliveryProduct)
		).toEqual(['developer', 'standard']);
		expect(getProductLicenseTiers({} as DeliveryProduct)).toEqual([]);
	});

	it('reads the tier of a SKU', () => {
		expect(getSKULicenseTier(trialSKU)).toBe('trial');
		expect(
			getSKULicenseTier(toSKU('OTHER-OPTION', 'color', 'trial'))
		).toBeUndefined();
	});

	it('recognizes the known tiers', () => {
		expect(isProductLicenseTier('standard')).toBe(true);
		expect(isProductLicenseTier('enterprise')).toBe(false);
	});
});
