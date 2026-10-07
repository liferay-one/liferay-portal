/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

import {useSSAProduct} from './useSSAProduct';

import type {DeliveryProduct} from '~/types/product';

function mockProductsPage(response: unknown) {
	return vi
		.spyOn(HeadlessCommerceDeliveryCatalog, 'getProductsPage')
		.mockResolvedValue(
			response as Awaited<
				ReturnType<
					typeof HeadlessCommerceDeliveryCatalog.getProductsPage
				>
			>
		);
}

function toProduct(
	id: number,
	specifications: [string, string][],
	skus: {id: number}[] = [{id: id * 10}]
) {
	return {
		id,
		productSpecifications: specifications.map(
			([specificationKey, value]) => ({specificationKey, value})
		),
		skus,
	} as unknown as DeliveryProduct;
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USESSAPRODUCT] useSSAProduct', () => {
	beforeEach(() => {
		Liferay.CommerceContext.commerceChannelId = '42';
		Liferay.CommerceContext.currency = {
			currencyCode: 'USD',
			currencyId: '1',
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends no request without a channel ID', async () => {
		Liferay.CommerceContext.commerceChannelId = '';

		const getProductsPage = mockProductsPage({items: []});

		const {result} = renderHook(() => useSSAProduct(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getProductsPage).not.toHaveBeenCalled();
	});

	it('returns the only product whose type specification is ssa-saas', async () => {
		const product = toProduct(1, [['type', 'ssa-saas']]);

		const getProductsPage = mockProductsPage({items: [product]});

		const {result} = renderHook(() => useSSAProduct(), {wrapper});

		await waitFor(() => expect(result.current.data).toEqual(product));

		const [channelId, params] = getProductsPage.mock.calls[0];

		expect(channelId).toBe('42');
		expect(params?.get('filter')).toBe(
			"(specificationValues/any(x:(x eq 'ssa-saas')))"
		);
		expect(params?.get('pageSize')).toBe('50');
		expect(params?.get('skus.currencyCode')).toBe('USD');
	});

	it('ignores products that carry ssa-saas under another key or have no SKU', async () => {
		const product = toProduct(1, [['type', 'ssa-saas']]);

		mockProductsPage({
			items: [
				toProduct(2, [['product-type', 'ssa-saas']]),
				toProduct(3, [['type', 'ssa-saas']], []),
				product,
			],
		});

		const {result} = renderHook(() => useSSAProduct(), {wrapper});

		await waitFor(() => expect(result.current.data).toEqual(product));
	});

	it('returns undefined when the type matches no product or more than one', async () => {
		for (const items of [
			[],
			[
				toProduct(1, [['type', 'ssa-saas']]),
				toProduct(2, [['type', 'ssa-saas']]),
			],
		]) {
			const getProductsPage = mockProductsPage({items});

			const {result} = renderHook(
				() => {
					const {data, isLoading} = useSSAProduct();

					return {data, isLoading};
				},
				{wrapper}
			);

			await waitFor(() => expect(getProductsPage).toHaveBeenCalled());
			await waitFor(() => expect(result.current.isLoading).toBe(false));

			expect(result.current.data).toBeUndefined();

			vi.restoreAllMocks();
		}
	});
});
