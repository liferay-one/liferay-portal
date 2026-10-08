/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminPricing from '~/services/headless/HeadlessCommerceAdminPricing';

import {MarketplaceProduct} from './MarketplaceProduct';

import type {Product} from '~/types/product';

vi.mock('~/services/headless/HeadlessCommerceAdminPricing', () => ({
	default: {
		getPriceListEntries: vi.fn(),
		getPriceLists: vi.fn(),
		getTierPricesByPriceEntryId: vi.fn(),
	},
}));

function createProduct(product: Record<string, unknown>) {
	return new MarketplaceProduct({
		categories: [],
		images: [],
		productSpecifications: [
			{specificationKey: 'type', value: {en_US: 'cloud'}},
			{specificationKey: 'latest-version', value: {en_US: '3.0.0'}},
		],
		...product,
	} as unknown as Product);
}

function mockResponse<T>(items: T[]) {
	return Promise.resolve({items}) as never;
}

describe('[CLIENT-MODELS-MARKETPLACEPRODUCT] MarketplaceProduct', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('builds the tier price table by currency, lowercased SKU, and minimum quantity', async () => {
		vi.mocked(HeadlessCommerceAdminPricing.getPriceLists).mockReturnValue(
			mockResponse([
				{currencyCode: 'USD', id: 10},
				{currencyCode: 'EUR', id: 20},
			])
		);
		vi.mocked(
			HeadlessCommerceAdminPricing.getPriceListEntries
		).mockImplementation((priceListId) =>
			mockResponse(
				priceListId === 10
					? [
							{priceEntryId: 100, skuId: 1},
							{priceEntryId: 101, skuId: 2},
						]
					: [{priceEntryId: 200, skuId: 1}]
			)
		);
		vi.mocked(
			HeadlessCommerceAdminPricing.getTierPricesByPriceEntryId
		).mockImplementation((priceEntryId) =>
			mockResponse(
				{
					100: [
						{minimumQuantity: 1, price: 50},
						{minimumQuantity: 5, price: 40},
						{minimumQuantity: 1, price: 999},
					],
					101: [{minimumQuantity: 1, price: 70}],
					200: [{minimumQuantity: 1, price: 45}],
				}[priceEntryId as 100 | 101 | 200]
			)
		);

		const product = createProduct({
			catalog: {name: 'Marketplace'},
			skus: [
				{
					id: 1,
					sku: 'STANDARD-SKU',
					skuOptions: [
						{key: 'base-license-usage-type', value: 'standard'},
					],
				},
				{
					id: 2,
					sku: 'Developer',
					skuOptions: [
						{key: 'base-license-usage-type', value: 'developer'},
					],
				},
				{
					id: 3,
					sku: 'TRIAL',
					skuOptions: [
						{key: 'base-license-usage-type', value: 'trial'},
					],
				},
				{
					id: 4,
					sku: 'ADD-ON',
					skuOptions: [{key: 'consumption-role', value: 'add-on'}],
				},
			],
		});

		await expect(product.getProductPrices()).resolves.toEqual({
			EUR: {'standard-sku': {1: 45}},
			USD: {
				'developer': {1: 70},
				'standard-sku': {1: 50, 5: 40},
			},
		});

		const priceListsParams = vi.mocked(
			HeadlessCommerceAdminPricing.getPriceLists
		).mock.calls[0][0] as URLSearchParams;

		expect(priceListsParams.get('filter')).toBe("type eq 'price-list'");
		expect(priceListsParams.get('nestedFields')).toBe('priceEntries');
		expect(priceListsParams.get('search')).toBe(
			"catalogName eq 'Marketplace'"
		);

		const [priceListId, priceEntriesParams] = vi.mocked(
			HeadlessCommerceAdminPricing.getPriceListEntries
		).mock.calls[0] as [number, URLSearchParams];

		expect(priceListId).toBe(10);
		expect(priceEntriesParams.get('filter')).toBe('skuId in (1,2)');
		expect(priceEntriesParams.get('nestedFields')).toBe('priceEntry');
	});

	it('returns an empty table when there are no price lists', async () => {
		vi.mocked(HeadlessCommerceAdminPricing.getPriceLists).mockReturnValue(
			mockResponse([])
		);

		await expect(
			createProduct({
				catalog: {name: 'Marketplace'},
				skus: [],
			}).getProductPrices()
		).resolves.toEqual({});
		expect(
			HeadlessCommerceAdminPricing.getPriceListEntries
		).not.toHaveBeenCalled();
	});

	it('unwraps the en_US specification values', () => {
		const product = createProduct({skus: []});

		expect(product.specificationValues.APP_TYPE).toBe('cloud');
		expect(product.specificationValues.APP_VERSION).toBe('3.0.0');
		expect(product.specificationValues.APP_PRICING_MODEL).toBeUndefined();
	});
});
