/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import getEntitlementDefinitionFindings from '~/pages/Admin/ProductInspector/utils/getEntitlementDefinitionFindings';
import getProductFindings from '~/pages/Admin/ProductInspector/utils/getProductFindings';
import {buildCatalogIndex} from '~/pages/Admin/ProductInspector/utils/productCatalogUtils';

import buildProductTree from './buildProductTree';

import type {
	InspectedCollection,
	InspectorTreeNode,
} from '~/types/accountInspection';
import type {
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectedSKU,
	ProductCatalogInspection,
} from '~/types/productInspection';

function toCollection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function buildSKU(id: number, externalReferenceCode: string): InspectedSKU {
	return {
		externalReferenceCode,
		id,
		published: true,
		purchasable: true,
		sku: externalReferenceCode,
	};
}

function buildProduct(
	overrides: Partial<InspectedProduct> = {}
): InspectedProduct {
	return {
		active: true,
		catalogId: 1,
		categories: [],
		externalReferenceCode: 'PRDCT-001',
		id: 100,
		incompleteCollections: [],
		name: {en_US: 'DXP'},
		productId: 101,
		productSpecifications: [],
		skus: [buildSKU(10, 'SKU-1')],
		workflowStatusInfo: {
			code: 2,
			label: 'draft',
			label_i18n: 'Draft',
		},
		...overrides,
	} as InspectedProduct;
}

function buildEntitlementDefinition(
	id: number,
	skuExternalReferenceCodes: string[],
	overrides: Partial<InspectedEntitlementDefinition> = {}
): InspectedEntitlementDefinition {
	return {
		active: true,
		externalReferenceCode: `C_ENT_DEF_${id}`,
		id,
		name: `Definition ${id}`,
		skuExternalReferenceCodes,
		...overrides,
	};
}

function buildTree(
	product: InspectedProduct,
	{
		entitlementDefinitions = [],
		otherProducts = [],
		usageDefinitions = [],
	}: {
		entitlementDefinitions?: InspectedEntitlementDefinition[];
		otherProducts?: InspectedProduct[];
		usageDefinitions?: ProductCatalogInspection['usageDefinitions']['items'];
	} = {}
) {
	const inspection: ProductCatalogInspection = {
		catalogs: toCollection([]),
		entitlementDefinitionSKUs: toCollection([]),
		entitlementDefinitions: toCollection(entitlementDefinitions),
		loadedAt: 0,
		products: toCollection([product, ...otherProducts]),
		specifications: toCollection([{key: 'project-item-type'}]),
		usageDefinitions: toCollection(usageDefinitions),
	};

	const index = buildCatalogIndex(inspection);

	return buildProductTree(product, {
		entitlementDefinitionFindings: new Map(
			entitlementDefinitions.map((entitlementDefinition) => [
				entitlementDefinition.id,
				getEntitlementDefinitionFindings(entitlementDefinition, index),
			])
		),
		findings: getProductFindings(product, index),
		index,
		inspection,
	});
}

function summarize(nodes: InspectorTreeNode[]): unknown[] {
	return nodes.map(({children, count, label, severity}) => ({
		label,
		...(count === undefined ? {} : {count}),
		...(severity ? {severity} : {}),
		...(children.length ? {children: summarize(children)} : {}),
	}));
}

const PROJECT_ITEM_TYPE_SPECIFICATION = {
	id: 1,
	specificationKey: 'project-item-type',
	value: {en_US: 'product'},
};

describe('[MOD-ADMIN-PRODUCTINSPECTOR-PRODUCTINSPECTORDETAIL-BUILDPRODUCTTREE] buildProductTree', () => {
	it('nests entitlement definitions and their usage definition under each SKU', () => {
		const tree = buildTree(
			buildProduct({
				categories: [
					{
						externalReferenceCode: 'CATEGORY',
						id: 7,
						name: 'Liferay Product',
						vocabulary: 'marketplace',
					},
				],
				productSpecifications: [PROJECT_ITEM_TYPE_SPECIFICATION],
			}),
			{
				entitlementDefinitions: [
					buildEntitlementDefinition(500, ['SKU-1'], {
						r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId: 900,
					}),
				],
				usageDefinitions: [{id: 900, name: 'Page Views'}],
			}
		);

		expect(summarize(tree)).toEqual([
			{
				children: [{label: 'project-item-type: product'}],
				count: 1,
				label: 'Specifications',
			},
			{
				children: [
					{
						children: [
							{
								children: [
									{
										children: [
											{
												label: 'Usage Definition: Page Views',
											},
										],
										label: 'Definition 500',
									},
								],
								count: 1,
								label: 'Entitlement Definitions',
							},
						],
						label: 'SKU-1',
					},
				],
				count: 1,
				label: 'SKUs',
			},
			{
				children: [{label: 'Liferay Product'}],
				count: 1,
				label: 'Categories',
			},
		]);
		expect(tree[2].children[0].meta).toBe('marketplace');
	});

	it('lists the other products that share a SKU and flags the SKU', () => {
		const [, skus] = buildTree(
			buildProduct({
				productSpecifications: [PROJECT_ITEM_TYPE_SPECIFICATION],
			}),
			{
				entitlementDefinitions: [
					buildEntitlementDefinition(500, ['SKU-1']),
				],
				otherProducts: [
					buildProduct({
						id: 200,
						name: {en_US: 'Portal'},
						skus: [buildSKU(20, 'SKU-1')],
					}),
				],
			}
		);

		expect(skus.severity).toBe('danger');
		expect(summarize(skus.children[0].children)).toEqual([
			{
				children: [{label: 'Definition 500'}],
				count: 1,
				label: 'Entitlement Definitions',
			},
			{children: [{label: 'Portal'}], count: 1, label: 'Products'},
		]);
	});

	it('carries the problems of an entitlement definition to its SKU and lists flagged records under broken links', () => {
		const tree = buildTree(
			buildProduct({
				productSpecifications: [PROJECT_ITEM_TYPE_SPECIFICATION],
				skus: [buildSKU(10, 'SKU-1'), buildSKU(11, 'SKU-2')],
			}),
			{
				entitlementDefinitions: [
					buildEntitlementDefinition(500, ['SKU-1'], {
						active: false,
					}),
				],
			}
		);

		const skus = tree.find(({collection}) => collection === 'skus');

		expect(
			skus?.children.map(({label, severity}) => [label, severity])
		).toEqual([
			['SKU-1', 'warning'],
			['SKU-2', undefined],
		]);

		const brokenLinks = tree.find(({key}) => key === 'broken');

		expect(
			brokenLinks?.children.map(({children, collection, count}) => ({
				collection,
				count,
				recordIds: children.map(({recordId}) => recordId),
			}))
		).toEqual([
			{collection: 'entitlementDefinitions', count: 1, recordIds: [500]},
		]);
	});

	it('keys a specification row by its position when it has no ID and hides that ID', () => {
		const [specifications] = buildTree(
			buildProduct({
				productSpecifications: [
					{
						specificationKey: 'project-item-type',
						value: {en_US: 'x'},
					},
				],
			})
		);

		expect(specifications.children[0]).toMatchObject({
			key: 'root/productSpecifications/productSpecifications/-1',
			meta: undefined,
			recordId: -1,
		});
	});
});
