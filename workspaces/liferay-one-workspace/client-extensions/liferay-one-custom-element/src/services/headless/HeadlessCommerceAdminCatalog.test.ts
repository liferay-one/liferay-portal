/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import GraphQL from './GraphQL';
import HeadlessCommerceAdminCatalog from './HeadlessCommerceAdminCatalog';

vi.mock('~/services/fetcher/fetcher', () => ({
	default: Object.assign(vi.fn(), {
		delete: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
	}),
}));

vi.mock('./GraphQL', () => ({
	default: {metrics: vi.fn()},
}));

const BASE_URL = '/o/headless-commerce-admin-catalog/v1.0';

describe('[CLIENT-HEADLESS-HEADLESSCOMMERCEADMINCATALOG] HeadlessCommerceAdminCatalog', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('creates and updates on fixed URLs', async () => {
		await HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode(
			'PRDCT-1',
			{priority: 1}
		);
		await HeadlessCommerceAdminCatalog.createProductOption([{key: 'a'}], 2);
		await HeadlessCommerceAdminCatalog.createProductOptionValue(
			{key: 'b'},
			3
		);
		await HeadlessCommerceAdminCatalog.createProductSKU({sku: 'c'}, 4);
		await HeadlessCommerceAdminCatalog.createProductSpecification(5, {
			specificationKey: 'd',
		} as never);
		await HeadlessCommerceAdminCatalog.updateProduct(6, {active: false});
		await HeadlessCommerceAdminCatalog.updateProductByExternalReferenceCode(
			'PRDCT-7',
			{active: true}
		);
		await HeadlessCommerceAdminCatalog.updateProductSpecification(8, {
			specificationKey: 'e',
		} as never);

		expect(vi.mocked(fetcher.post).mock.calls).toEqual([
			[
				`${BASE_URL}/products/by-externalReferenceCode/PRDCT-1/images`,
				{priority: 1},
			],
			[
				`${BASE_URL}/products/2/productOptions?nestedFields=productOptionValues`,
				[{key: 'a'}],
			],
			[`${BASE_URL}/productOptions/3/productOptionValues`, {key: 'b'}],
			[`${BASE_URL}/products/4/skus`, {sku: 'c'}],
			[
				`${BASE_URL}/products/5/productSpecifications`,
				{specificationKey: 'd'},
			],
		]);
		expect(vi.mocked(fetcher.patch).mock.calls).toEqual([
			[`${BASE_URL}/products/6`, {active: false}],
			[
				`${BASE_URL}/products/by-externalReferenceCode/PRDCT-7`,
				{active: true},
			],
			[`${BASE_URL}/productSpecifications/8`, {specificationKey: 'e'}],
		]);
	});

	it('deletes on fixed URLs', async () => {
		await HeadlessCommerceAdminCatalog.deleteAttachmentByExternalReferenceCode(
			'ATT-1'
		);
		await HeadlessCommerceAdminCatalog.deleteProduct(2);

		expect(vi.mocked(fetcher.delete).mock.calls).toEqual([
			[`${BASE_URL}/attachment/by-externalReferenceCode/ATT-1`],
			[`${BASE_URL}/products/2`],
		]);
	});

	it('falls back to an empty array when the product specifications response has no items', async () => {
		vi.mocked(fetcher).mockResolvedValueOnce({});

		await expect(
			HeadlessCommerceAdminCatalog.getProductSpecifications(1)
		).resolves.toEqual([]);

		vi.mocked(fetcher).mockResolvedValueOnce(undefined);

		await expect(
			HeadlessCommerceAdminCatalog.getProductSpecifications(1)
		).resolves.toEqual([]);
	});

	it('forwards the dashboard KPI to the products metrics query', async () => {
		await HeadlessCommerceAdminCatalog.getProductsDashboardKPI(
			{active: 'active eq true'},
			{pageSize: 5}
		);

		expect(GraphQL.metrics).toHaveBeenCalledWith(
			{group: 'headlessCommerceAdminCatalog_v1_0', name: 'products'},
			{active: 'active eq true'},
			{pageSize: 5}
		);
	});

	it('posts the fixed virtual product body', async () => {
		vi.mocked(fetcher.post).mockResolvedValueOnce({id: 9});

		await expect(
			HeadlessCommerceAdminCatalog.createVirtualProduct({
				catalogId: 1,
				categories: [{id: 2}],
				description: 'An app',
				name: 'App',
				productSpecifications: [],
				productStatus: 2,
				workflowStatusInfo: 0,
			})
		).resolves.toEqual({id: 9});
		expect(fetcher.post).toHaveBeenCalledWith(
			`${BASE_URL}/products?nestedFields=productVirtualSettings`,
			{
				active: true,
				catalogId: 1,
				categories: [{id: 2}],
				description: {en_US: 'An app'},
				name: {en_US: 'App'},
				productConfiguration: {
					allowBackOrder: true,
					maxOrderQuantity: 99,
				},
				productSpecifications: [],
				productStatus: 2,
				productType: 'virtual',
				productVirtualSettings: {},
				workflowStatusInfo: 0,
			}
		);
	});

	it('reads on fixed URLs with the search parameters', async () => {
		vi.mocked(fetcher).mockResolvedValue({items: [{id: 1}]});

		const searchParams = new URLSearchParams({page: '2'});

		await HeadlessCommerceAdminCatalog.getCatalog(1, searchParams);
		await HeadlessCommerceAdminCatalog.getCatalogs(searchParams);
		await HeadlessCommerceAdminCatalog.getOptions();
		await HeadlessCommerceAdminCatalog.getProduct(2, searchParams);
		await HeadlessCommerceAdminCatalog.getProductByExternalReferenceCode(
			'PRDCT-3',
			searchParams
		);
		await HeadlessCommerceAdminCatalog.getProductOptions(4);
		await HeadlessCommerceAdminCatalog.getProducts(searchParams);
		await HeadlessCommerceAdminCatalog.getProductSkus(5);
		await expect(
			HeadlessCommerceAdminCatalog.getProductSpecifications(6)
		).resolves.toEqual([{id: 1}]);
		await HeadlessCommerceAdminCatalog.getSku(7, searchParams);
		await HeadlessCommerceAdminCatalog.getSpecifications(searchParams);

		expect(vi.mocked(fetcher).mock.calls).toEqual([
			[`${BASE_URL}/catalog/1?page=2`],
			[`${BASE_URL}/catalogs?page=2`],
			[`${BASE_URL}/options`],
			[`${BASE_URL}/products/2?page=2`],
			[`${BASE_URL}/products/by-externalReferenceCode/PRDCT-3?page=2`],
			[
				`${BASE_URL}/products/4/productOptions?nestedFields=productOptionValues`,
			],
			[`${BASE_URL}/products?page=2`],
			[`${BASE_URL}/products/5/skus`],
			[`${BASE_URL}/products/6/productSpecifications`],
			['o/headless-commerce-admin-catalog/v1.0/skus/7?page=2'],
			[`${BASE_URL}/specifications?page=2`],
		]);
	});
});
