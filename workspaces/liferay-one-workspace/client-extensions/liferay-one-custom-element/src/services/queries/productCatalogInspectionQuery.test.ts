/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import {productCatalogInspectionQuery} from './productCatalogInspectionQuery';

const mocks = vi.hoisted(() => ({fetcher: vi.fn()}));

vi.mock('~/services/fetcher/fetcher', () => ({default: mocks.fetcher}));

const CATALOG_PATH = '/o/headless-commerce-admin-catalog/v1.0';

function toPage(items: unknown[], totalCount = items.length) {
	return {items, totalCount};
}

function toSKUs(count: number) {
	return Array.from({length: count}, (_, index) => ({
		externalReferenceCode: `SKU-${index}`,
		id: index + 1,
	}));
}

function mockResponses(responses: Record<string, unknown>) {
	mocks.fetcher.mockImplementation(async (url: string) => {
		const {pathname} = new URL(url, 'http://x');

		const response = responses[pathname];

		if (response instanceof Error) {
			throw response;
		}

		return response ?? toPage([]);
	});
}

function getRequestedPaths() {
	return mocks.fetcher.mock.calls.map(
		([url]) => new URL(url, 'http://x').pathname
	);
}

describe('[CLIENT-QUERIES-PRODUCTCATALOGINSPECTIONQUERY] productCatalogInspectionQuery', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
	});

	it('has one shared key', () => {
		expect(productCatalogInspectionQuery().key).toBe(
			'/product-catalog-inspection'
		);
	});

	it('reads the products with their nested collections', async () => {
		mockResponses({
			[`${CATALOG_PATH}/products`]: toPage([
				{id: 100, productId: 101, skus: toSKUs(3)},
			]),
		});

		const {products} = await productCatalogInspectionQuery().fetcher();

		expect(
			mocks.fetcher.mock.calls
				.map(([url]) => new URL(url, 'http://x'))
				.find(({pathname}) => pathname === `${CATALOG_PATH}/products`)
				?.searchParams.get('nestedFields')
		).toBe('categories,productOptions,productSpecifications,skus');
		expect(products.items[0].skus).toHaveLength(3);
		expect(products.items[0].incompleteCollections).toEqual([]);
		expect(getRequestedPaths()).not.toContain(
			`${CATALOG_PATH}/products/101/skus`
		);
	});

	it('rereads a nested collection that reached the nested page size', async () => {
		mockResponses({
			[`${CATALOG_PATH}/products`]: toPage([
				{id: 100, productId: 101, skus: toSKUs(20)},
			]),
			[`${CATALOG_PATH}/products/101/skus`]: toPage(toSKUs(58)),
		});

		const {products} = await productCatalogInspectionQuery().fetcher();

		expect(products.items[0].skus).toHaveLength(58);
		expect(products.items[0].incompleteCollections).toEqual([]);
	});

	it('keeps the nested rows and marks the collection incomplete when the reread fails', async () => {
		mockResponses({
			[`${CATALOG_PATH}/products`]: toPage([
				{id: 100, productId: 101, skus: toSKUs(20)},
			]),
			[`${CATALOG_PATH}/products/101/skus`]: new FetcherError(
				'Server Error'
			),
		});

		const {products} = await productCatalogInspectionQuery().fetcher();

		expect(products.items[0].skus).toHaveLength(20);
		expect(products.items[0].incompleteCollections).toEqual(['skus']);
	});

	it('joins each entitlement definition to its SKUs', async () => {
		mockResponses({
			'/o/c/entitlementdefinitions': toPage([{id: 500}, {id: 501}]),
			'/o/c/entitlementdefinitionskus': toPage([
				{
					id: 1,
					r_entitlementDefinitionToSku_c_entitlementDefinitionId: 500,
					skuExternalReferenceCode: 'SKU-1',
				},
				{
					id: 2,
					r_entitlementDefinitionToSku_c_entitlementDefinitionId: 500,
					skuExternalReferenceCode: 'SKU-2',
				},
				{
					id: 3,
					r_entitlementDefinitionToSku_c_entitlementDefinitionId: 0,
					skuExternalReferenceCode: 'SKU-3',
				},
			]),
		});

		const {entitlementDefinitions} =
			await productCatalogInspectionQuery().fetcher();

		expect(
			entitlementDefinitions.items.map(
				({id, skuExternalReferenceCodes}) => ({
					id,
					skuExternalReferenceCodes,
				})
			)
		).toEqual([
			{id: 500, skuExternalReferenceCodes: ['SKU-1', 'SKU-2']},
			{id: 501, skuExternalReferenceCodes: []},
		]);
	});

	it('carries the error of a failed join source on the entitlement definitions', async () => {
		mockResponses({
			'/o/c/entitlementdefinitions': toPage([{id: 500}]),
			'/o/c/entitlementdefinitionskus': new FetcherError('Not Found'),
		});

		const {entitlementDefinitions} =
			await productCatalogInspectionQuery().fetcher();

		expect(entitlementDefinitions.error).toBe('Not Found');
		expect(entitlementDefinitions.items).toHaveLength(1);
	});
});
