/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getProductOrphans from './getProductOrphans';
import {buildCatalogIndex} from './productCatalogUtils';

import type {InspectedCollection} from '~/types/accountInspection';
import type {
	InspectedProduct,
	ProductCatalogInspection,
} from '~/types/productInspection';

function toCollection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function buildProduct(
	id: number,
	skuExternalReferenceCodes: string[],
	specificationKeys: string[] = []
) {
	const product: Partial<InspectedProduct> = {
		id,
		incompleteCollections: [],
		productSpecifications: specificationKeys.map((specificationKey) => ({
			specificationKey,
			value: {en_US: 'x'},
		})),
		skus: skuExternalReferenceCodes.map((externalReferenceCode, index) => ({
			externalReferenceCode,
			id: id * 10 + index,
		})),
	};

	return product as InspectedProduct;
}

function buildInspection(
	overrides: Partial<ProductCatalogInspection> = {}
): ProductCatalogInspection {
	return {
		catalogs: toCollection([]),
		entitlementDefinitionSKUs: toCollection([
			{
				id: 1,
				r_entitlementDefinitionToSku_c_entitlementDefinitionId: 500,
				skuExternalReferenceCode: 'SKU-1',
			},
			{
				id: 2,
				r_entitlementDefinitionToSku_c_entitlementDefinitionId: 999,
				skuExternalReferenceCode: 'SKU-1',
			},
			{
				id: 3,
				r_entitlementDefinitionToSku_c_entitlementDefinitionId: 501,
				skuExternalReferenceCode: 'SKU-GONE',
			},
		]),
		entitlementDefinitions: toCollection([
			{
				id: 500,
				r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId: 700,
				skuExternalReferenceCodes: ['SKU-1'],
			},
			{id: 501, skuExternalReferenceCodes: ['SKU-GONE']},
		]),
		loadedAt: 0,
		products: toCollection([
			buildProduct(100, ['SKU-1'], ['project-item-type']),
			buildProduct(200, ['SKU-2']),
		]),
		specifications: toCollection([
			{id: 1, key: 'project-item-type'},
			{id: 2, key: 'price-model'},
		]),
		usageDefinitions: toCollection([{id: 700}, {id: 701}]),
		...overrides,
	};
}

function getIds(entries: {id: number}[] | null) {
	return entries?.map(({id}) => id) ?? null;
}

function getOrphanIds(inspection: ProductCatalogInspection) {
	const orphans = getProductOrphans(
		inspection,
		buildCatalogIndex(inspection)
	);

	return {
		entitlementDefinitionSKUs: getIds(orphans.entitlementDefinitionSKUs),
		entitlementDefinitions: getIds(orphans.entitlementDefinitions),
		products: getIds(orphans.products),
		specifications: getIds(orphans.specifications),
		usageDefinitions: getIds(orphans.usageDefinitions),
	};
}

describe('[MOD-ADMIN-PRODUCTINSPECTOR-GETPRODUCTORPHANS] getProductOrphans', () => {
	it('lists each kind of orphan', () => {
		expect(getOrphanIds(buildInspection())).toEqual({
			entitlementDefinitionSKUs: [2, 3],
			entitlementDefinitions: [501],
			products: [200],
			specifications: [2],
			usageDefinitions: [701],
		});
	});

	it('does not check a list whose records did not load completely', () => {
		expect(
			getOrphanIds(
				buildInspection({
					entitlementDefinitionSKUs: {
						error: '500 Internal Server Error',
						items: [],
						totalCount: 0,
					},
					specifications: {items: [], totalCount: 5, truncated: true},
				})
			)
		).toEqual({
			entitlementDefinitionSKUs: null,
			entitlementDefinitions: [501],
			products: [200],
			specifications: null,
			usageDefinitions: [701],
		});
	});

	it('does not check products or specifications when a product collection did not load completely', () => {
		const products = toCollection([
			{
				...buildProduct(100, ['SKU-1']),
				incompleteCollections: ['productSpecifications', 'skus'],
			} as InspectedProduct,
		]);

		const orphanIds = getOrphanIds(buildInspection({products}));

		expect(orphanIds.products).toBeNull();
		expect(orphanIds.specifications).toBeNull();
	});
});
