/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getProductOrphans from './getProductOrphans';
import {
	WORKFLOW_STATUS_APPROVED,
	buildCatalogIndex,
} from './productCatalogUtils';

import type {InspectedCollection} from '~/types/accountInspection';
import type {Catalog} from '~/types/commerce';
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
		catalogId: 10,
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
		workflowStatusInfo: {
			code: WORKFLOW_STATUS_APPROVED,
			label: '',
			label_i18n: '',
		},
	};

	return product as InspectedProduct;
}

function buildInspection(
	overrides: Partial<ProductCatalogInspection> = {}
): ProductCatalogInspection {
	return {
		catalogs: toCollection([
			{id: 10, system: false},
			{id: 11, system: false},
			{id: 12, system: true},
		] as Catalog[]),
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
			{
				id: 4,
				r_entitlementDefinitionToSku_c_entitlementDefinitionId: 500,
				skuExternalReferenceCode: 'SKU-1',
			},
			{
				id: 5,
				r_entitlementDefinitionToSku_c_entitlementDefinitionId: 500,
				skuExternalReferenceCode: 'SKU-STALE',
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
			buildProduct(100, ['SKU-1', 'SKU-3'], ['project-item-type']),
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
		catalogs: getIds(orphans.catalogs),
		duplicateEntitlementDefinitionSKUs: getIds(
			orphans.duplicateEntitlementDefinitionSKUs
		),
		entitlementDefinitionSKUs: getIds(orphans.entitlementDefinitionSKUs),
		entitlementDefinitions: getIds(orphans.entitlementDefinitions),
		specifications: getIds(orphans.specifications),
		usageDefinitions: getIds(orphans.usageDefinitions),
	};
}

describe('[MOD-ADMIN-PRODUCTINSPECTOR-GETPRODUCTORPHANS] getProductOrphans', () => {
	it('lists each kind of orphan', () => {
		expect(getOrphanIds(buildInspection())).toEqual({
			catalogs: [11],
			duplicateEntitlementDefinitionSKUs: [4],
			entitlementDefinitionSKUs: [2, 5],
			entitlementDefinitions: [501],
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
			catalogs: [11],
			duplicateEntitlementDefinitionSKUs: null,
			entitlementDefinitionSKUs: null,
			entitlementDefinitions: [501],
			specifications: null,
			usageDefinitions: [701],
		});
	});

	it('does not check specifications when a product collection did not load completely', () => {
		const products = toCollection([
			{
				...buildProduct(100, ['SKU-1']),
				incompleteCollections: ['productSpecifications', 'skus'],
			} as InspectedProduct,
		]);

		const orphanIds = getOrphanIds(buildInspection({products}));

		expect(orphanIds.specifications).toBeNull();
	});

	it('gives the reasons that an entitlement definition SKU is broken, without the links of an entitlement definition that has no SKU', () => {
		const inspection = buildInspection();

		const {entitlementDefinitionSKUs} = getProductOrphans(
			inspection,
			buildCatalogIndex(inspection)
		);

		expect(
			entitlementDefinitionSKUs?.map(({id, reasons}) => ({id, reasons}))
		).toEqual([
			{id: 2, reasons: ['the-entitlement-definition-does-not-exist']},
			{id: 5, reasons: ['the-sku-matches-no-product']},
		]);
	});

	it('does not check catalogs when the catalogs or the products did not load completely', () => {
		expect(
			getOrphanIds(
				buildInspection({
					catalogs: {
						error: '500 Internal Server Error',
						items: [],
						totalCount: 0,
					},
				})
			).catalogs
		).toBeNull();

		expect(
			getOrphanIds(
				buildInspection({
					products: {items: [], totalCount: 5, truncated: true},
				})
			).catalogs
		).toBeNull();
	});
});
