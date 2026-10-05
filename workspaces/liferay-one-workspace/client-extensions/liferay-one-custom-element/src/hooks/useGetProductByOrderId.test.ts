/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import useSWR from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import {
	getProductFallback,
	getProductImageFallback,
} from '~/utils/productUtils';

import useGetProductByOrderId from './useGetProductByOrderId';

vi.mock('swr', () => ({
	default: vi.fn(),
}));

vi.mock('~/services/headless/HeadlessCommerceDeliveryCatalog', () => ({
	default: {getProduct: vi.fn()},
}));

vi.mock('~/services/headless/HeadlessCommerceDeliveryOrder', () => ({
	default: {
		getPlacedOrder: vi.fn(),
		getPlacedOrderBillingAddress: vi.fn(),
	},
}));

vi.mock('~/services/models/DeliveryOrderModel', () => ({
	default: class {
		constructor(public placedOrder: unknown) {}
	},
}));

vi.mock('~/services/models/MarketplaceDeliveryProduct', () => ({
	MarketplaceDeliveryProduct: class {
		constructor(public product: unknown) {}
	},
}));

type Result = {
	placedOrder: {
		placedOrderBillingAddress?: unknown;
		placedOrderItems: {productId: number; thumbnail?: string}[];
	};
	product: unknown;
};

function placedOrder(placedOrderBillingAddressId: number) {
	return {
		placedOrderBillingAddressId,
		placedOrderItems: [{productId: 44, thumbnail: 'thumbnail.png'}],
	};
}

async function runFetcher() {
	renderHook(() => useGetProductByOrderId('123', {refreshInterval: 5}));

	const [key, fetcher, options] = vi.mocked(useSWR).mock.calls[0] as [
		string,
		() => Promise<Result>,
		unknown,
	];

	expect(key).toBe('/placed-order/123/product');
	expect(options).toEqual({refreshInterval: 5});

	return fetcher();
}

describe('[HOOK-USEGETPRODUCTBYORDERID] useGetProductByOrderId', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.commerceChannelId = 9 as never;
	});

	it('fetches the billing address when its id is above 0', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrder
		).mockResolvedValue(placedOrder(3) as never);
		vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrderBillingAddress
		).mockResolvedValue({city: 'Recife'} as never);
		vi.mocked(HeadlessCommerceDeliveryCatalog.getProduct).mockResolvedValue(
			{
				id: 44,
			} as never
		);

		const result = await runFetcher();

		expect(
			HeadlessCommerceDeliveryOrder.getPlacedOrderBillingAddress
		).toHaveBeenCalledWith('123');
		expect(result.placedOrder.placedOrderBillingAddress).toEqual({
			city: 'Recife',
		});
		expect(result.product).toEqual({id: 44});
		expect(
			vi
				.mocked(HeadlessCommerceDeliveryCatalog.getProduct)
				.mock.calls[0].slice(0, 2)
		).toEqual([9, 44]);
	});

	it('skips the billing address when its id is 0', async () => {
		vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrder
		).mockResolvedValue(placedOrder(0) as never);
		vi.mocked(HeadlessCommerceDeliveryCatalog.getProduct).mockResolvedValue(
			{
				id: 44,
			} as never
		);

		const result = await runFetcher();

		expect(
			HeadlessCommerceDeliveryOrder.getPlacedOrderBillingAddress
		).not.toHaveBeenCalled();
		expect(result.placedOrder.placedOrderBillingAddress).toBeUndefined();
	});

	it('falls back to the fallback product and image when the product fetch fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.mocked(
			HeadlessCommerceDeliveryOrder.getPlacedOrder
		).mockResolvedValue(placedOrder(0) as never);
		vi.mocked(HeadlessCommerceDeliveryCatalog.getProduct).mockRejectedValue(
			new Error('404')
		);

		const result = await runFetcher();

		expect(result.product).toEqual(getProductFallback());
		expect(result.placedOrder.placedOrderItems[0].thumbnail).toBe(
			getProductImageFallback('productImage')
		);
	});
});
