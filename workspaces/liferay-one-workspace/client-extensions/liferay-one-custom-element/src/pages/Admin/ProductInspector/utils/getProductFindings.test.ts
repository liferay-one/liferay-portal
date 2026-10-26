/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getProductFindings from './getProductFindings';
import {buildCatalogIndex} from './productCatalogUtils';

import type {InspectedCollection} from '~/types/accountInspection';
import type {
	InspectedEntitlementDefinition,
	InspectedProduct,
	InspectedSKU,
	ProductCatalogInspection,
} from '~/types/productInspection';

function toCollection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function buildSKU(
	externalReferenceCode: string,
	overrides: Partial<InspectedSKU> = {}
): InspectedSKU {
	return {
		externalReferenceCode,
		id: Number(externalReferenceCode.replace(/\D/g, '')),
		published: true,
		purchasable: true,
		sku: externalReferenceCode,
		...overrides,
	};
}

function buildProduct(
	overrides: Partial<InspectedProduct> = {}
): InspectedProduct {
	return {
		active: true,
		catalogId: 1,
		categories: [
			{
				externalReferenceCode: 'CATEGORY',
				id: 1,
				name: 'Liferay Product',
				vocabulary: 'marketplace',
			},
		],
		externalReferenceCode: 'PRDCT-001',
		id: 100,
		incompleteCollections: [],
		name: {en_US: 'DXP'},
		productId: 101,
		productSpecifications: [
			{
				id: 1,
				specificationKey: 'project-item-type',
				value: {en_US: 'product'},
			},
		],
		skus: [buildSKU('SKU-1')],
		workflowStatusInfo: {
			code: 0,
			label: 'approved',
			label_i18n: 'Approved',
		},
		...overrides,
	} as InspectedProduct;
}

function buildEntitlementDefinition(
	skuExternalReferenceCodes: string[],
	overrides: Partial<InspectedEntitlementDefinition> = {}
): InspectedEntitlementDefinition {
	return {
		active: true,
		externalReferenceCode: `C_ENT_DEF_${skuExternalReferenceCodes.join('_')}`,
		id: 500,
		skuExternalReferenceCodes,
		...overrides,
	};
}

function buildInspection(
	products: InspectedProduct[],
	entitlementDefinitions: InspectedEntitlementDefinition[] = [
		buildEntitlementDefinition(['SKU-1']),
	],
	overrides: Partial<ProductCatalogInspection> = {}
): ProductCatalogInspection {
	return {
		catalogs: toCollection([]),
		entitlementDefinitionSKUs: toCollection([]),
		entitlementDefinitions: toCollection(entitlementDefinitions),
		loadedAt: 0,
		products: toCollection(products),
		specifications: toCollection([{key: 'project-item-type'}]),
		usageDefinitions: toCollection([]),
		...overrides,
	};
}

function getMessages(
	product: InspectedProduct,
	inspection = buildInspection([product])
) {
	return getProductFindings(product, buildCatalogIndex(inspection)).map(
		({message}) => message
	);
}

describe('[MOD-ADMIN-PRODUCTINSPECTOR-GETPRODUCTFINDINGS] getProductFindings', () => {
	it('finds nothing for a consistent product', () => {
		expect(getMessages(buildProduct())).toEqual([]);
	});

	it('reports an inactive, unapproved product with no SKUs', () => {
		const product = buildProduct({
			active: false,
			skus: [],
			workflowStatusInfo: {code: 2, label: 'draft', label_i18n: 'Draft'},
		});

		expect(getMessages(product)).toEqual([
			'the-product-has-no-skus',
			'the-product-is-inactive',
			'the-product-is-not-approved',
		]);
	});

	it('reports an approved product with no categories, but not a draft one', () => {
		expect(getMessages(buildProduct({categories: []}))).toEqual([
			'the-approved-product-has-no-categories',
		]);

		expect(
			getMessages(
				buildProduct({
					categories: [],
					workflowStatusInfo: {
						code: 2,
						label: 'draft',
						label_i18n: 'Draft',
					},
				})
			)
		).toEqual(['the-product-is-not-approved']);
	});

	it('reports a missing project item type, empty values, repeated key and value pairs, and unknown keys', () => {
		const product = buildProduct({
			productSpecifications: [
				{id: 1, specificationKey: 'price-model', value: {en_US: ' '}},
				{
					id: 2,
					specificationKey: 'price-model',
					value: {en_US: 'Paid'},
				},
				{
					id: 3,
					specificationKey: 'price-model',
					value: {en_US: 'Paid'},
				},
			],
		});

		const findings = getProductFindings(
			product,
			buildCatalogIndex(
				buildInspection([product], undefined, {
					specifications: toCollection([{key: 'project-item-type'}]),
				})
			)
		);

		expect(
			findings.map(({ids, message, severity}) => ({
				ids,
				message,
				severity,
			}))
		).toEqual([
			{
				ids: [1, 2, 3],
				message: 'specifications-have-no-specification-definition',
				severity: 'danger',
			},
			{
				ids: [],
				message: 'the-product-has-no-project-item-type-specification',
				severity: 'warning',
			},
			{
				ids: [1],
				message: 'specifications-have-no-value',
				severity: 'warning',
			},
			{
				ids: [2, 3],
				message:
					'specifications-repeat-the-key-and-value-of-another-specification',
				severity: 'warning',
			},
		]);
	});

	it('gives a specification with no ID the same row ID that its table row uses', () => {
		const product = buildProduct({
			productSpecifications: [
				{
					specificationKey: 'project-item-type',
					value: {en_US: 'product'},
				},
				{specificationKey: 'price-model', value: {en_US: ''}},
			],
		});

		expect(
			getProductFindings(
				product,
				buildCatalogIndex(
					buildInspection([product], undefined, {
						specifications: toCollection([
							{key: 'price-model'},
							{key: 'project-item-type'},
						]),
					})
				)
			)
		).toEqual([
			{
				collection: 'productSpecifications',
				ids: [-2],
				message: 'specifications-have-no-value',
				severity: 'warning',
			},
		]);
	});

	it('does not report a missing project item type when the specifications did not load completely', () => {
		const product = buildProduct({
			incompleteCollections: ['productSpecifications'],
			productSpecifications: [],
		});

		expect(getMessages(product)).toEqual([
			'only-part-of-the-records-could-be-loaded',
		]);
	});

	it('reports SKUs with no entitlement definition and SKUs another product shares', () => {
		const product = buildProduct({
			skus: [buildSKU('SKU-1'), buildSKU('SKU-2')],
		});

		const otherProduct = buildProduct({
			externalReferenceCode: 'PRDCT-002',
			id: 200,
			skus: [buildSKU('SKU-1', {id: 9})],
		});

		const findings = getProductFindings(
			product,
			buildCatalogIndex(buildInspection([product, otherProduct]))
		);

		expect(findings).toEqual([
			{
				collection: 'skus',
				ids: [1],
				message: 'skus-are-also-used-by-another-product',
				severity: 'danger',
			},
			{
				collection: 'skus',
				ids: [2],
				message: 'skus-have-no-entitlement-definition',
				severity: 'warning',
			},
		]);
	});

	it('reports unpublished SKUs only on an approved product', () => {
		expect(
			getMessages(
				buildProduct({skus: [buildSKU('SKU-1', {purchasable: false})]})
			)
		).toEqual(['skus-are-not-published-or-not-purchasable']);
	});

	it('reports inactive entitlement definitions for the product SKUs', () => {
		const product = buildProduct();

		expect(
			getMessages(
				product,
				buildInspection(
					[product],
					[buildEntitlementDefinition(['SKU-1'], {active: false})]
				)
			)
		).toEqual(['entitlement-definitions-are-inactive']);
	});

	it('skips the checks against a collection that did not load completely', () => {
		const product = buildProduct({
			incompleteCollections: ['skus'],
			productSpecifications: [
				{
					id: 1,
					specificationKey: 'unknown-key',
					value: {en_US: 'x'},
				},
				{
					id: 2,
					specificationKey: 'project-item-type',
					value: {en_US: 'product'},
				},
			],
			skus: [buildSKU('SKU-2')],
		});

		const inspection = buildInspection([product], [], {
			entitlementDefinitions: {
				error: '500 Internal Server Error',
				items: [],
				totalCount: 0,
			},
			specifications: {
				items: [],
				totalCount: 100,
				truncated: true,
			},
		});

		expect(getMessages(product, inspection)).toEqual([
			'only-part-of-the-records-could-be-loaded',
		]);
	});
});
