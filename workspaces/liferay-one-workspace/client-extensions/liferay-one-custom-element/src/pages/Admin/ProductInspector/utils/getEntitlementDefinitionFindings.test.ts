/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getEntitlementDefinitionFindings from './getEntitlementDefinitionFindings';
import {getOrphanedEntitlementDefinitions} from './productCatalogUtils';

import type {InspectedProduct} from '~/types/productInspection';

import type {CatalogIndex} from './productCatalogUtils';

const PRODUCT = {id: 100} as InspectedProduct;

function buildIndex(overrides: Partial<CatalogIndex> = {}): CatalogIndex {
	return {
		entitlementDefinitionsBySKU: new Map(),
		productsBySKU: new Map([
			['SKU-1', [PRODUCT]],
			['SKU-OVERAGE', [PRODUCT]],
		]),
		specificationKeys: new Set(),
		usageDefinitionIds: new Set([700]),
		...overrides,
	};
}

function getFindings(
	overrides: Partial<
		Parameters<typeof getEntitlementDefinitionFindings>[0]
	> = {},
	index = buildIndex()
) {
	return getEntitlementDefinitionFindings(
		{
			active: true,
			id: 500,
			skuExternalReferenceCodes: ['SKU-1'],
			...overrides,
		},
		index
	).map(({ids, message}) => ({ids, message}));
}

describe('[MOD-ADMIN-PRODUCTINSPECTOR-GETENTITLEMENTDEFINITIONFINDINGS] getEntitlementDefinitionFindings', () => {
	it('finds nothing for a consistent entitlement definition', () => {
		expect(getFindings()).toEqual([]);
	});

	it('reports an entitlement definition with no SKUs, and SKUs that match no product', () => {
		expect(getFindings({skuExternalReferenceCodes: []})).toEqual([
			{ids: [500], message: 'the-entitlement-definition-has-no-skus'},
		]);

		expect(
			getFindings({skuExternalReferenceCodes: ['SKU-1', 'SKU-GONE']})
		).toEqual([{ids: ['SKU-GONE'], message: 'skus-match-no-product'}]);
	});

	it('does not compare SKUs when the product SKUs did not load completely', () => {
		expect(
			getFindings(
				{skuExternalReferenceCodes: ['SKU-GONE']},
				buildIndex({productsBySKU: null})
			)
		).toEqual([]);
	});

	it('does not report missing SKUs when the SKU links did not load completely', () => {
		expect(
			getFindings(
				{skuExternalReferenceCodes: []},
				buildIndex({entitlementDefinitionsBySKU: null})
			)
		).toEqual([]);
	});

	it('reports an inactive definition and a missing license key family', () => {
		expect(
			getFindings({active: false, generatesActivationKey: true})
		).toEqual([
			{ids: [500], message: 'the-entitlement-definition-is-inactive'},
			{
				ids: [500],
				message:
					'the-entitlement-definition-generates-activation-keys-but-has-no-license-key-family',
			},
		]);
	});

	it('reports an overage rate with no overage SKU, and an overage SKU that matches no product', () => {
		expect(getFindings({overageRate: 0.5})).toEqual([
			{
				ids: [500],
				message:
					'the-entitlement-definition-has-an-overage-rate-but-no-overage-sku',
			},
		]);

		expect(
			getFindings({overageSkuExternalReferenceCode: 'SKU-OVERAGE'})
		).toEqual([]);

		expect(
			getFindings({overageSkuExternalReferenceCode: 'SKU-MISSING'})
		).toEqual([
			{
				ids: ['SKU-MISSING'],
				message: 'the-overage-sku-matches-no-product',
			},
		]);
	});

	it('reports a usage definition that does not exist', () => {
		expect(
			getFindings({
				r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId: 700,
			})
		).toEqual([]);

		expect(
			getFindings({
				r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId: 701,
			})
		).toEqual([
			{ids: [701], message: 'the-usage-definition-does-not-exist'},
		]);
	});
});

describe('[MOD-ADMIN-PRODUCTINSPECTOR-GETENTITLEMENTDEFINITIONFINDINGS] getOrphanedEntitlementDefinitions', () => {
	const ENTITLEMENT_DEFINITIONS = [
		{id: 500, skuExternalReferenceCodes: ['SKU-1']},
		{id: 501, skuExternalReferenceCodes: ['SKU-GONE', 'SKU-1']},
		{id: 502, skuExternalReferenceCodes: ['SKU-GONE']},
		{id: 503, skuExternalReferenceCodes: []},
	];

	it('keeps the entitlement definitions whose SKUs match no product', () => {
		expect(
			getOrphanedEntitlementDefinitions(
				ENTITLEMENT_DEFINITIONS,
				buildIndex()
			)?.map(({id}) => id)
		).toEqual([502, 503]);
	});

	it('returns null when the product SKUs did not load completely', () => {
		expect(
			getOrphanedEntitlementDefinitions(
				ENTITLEMENT_DEFINITIONS,
				buildIndex({productsBySKU: null})
			)
		).toBeNull();
	});
});
