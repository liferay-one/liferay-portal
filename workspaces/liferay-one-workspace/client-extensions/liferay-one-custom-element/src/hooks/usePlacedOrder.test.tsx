/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';

import {
	placedOrdersQuery,
	usePlacedOrder,
	usePlacedOrders,
} from './usePlacedOrder';

function mockPages(
	totalCount: number,
	itemsForPage: (page: number) => unknown[]
) {
	return vi
		.spyOn(HeadlessCommerceDeliveryOrder, 'getPlacedOrders')
		.mockImplementation((_channelId, _accountId, params) =>
			Promise.resolve({
				items: itemsForPage(Number(params?.get('page'))),
				totalCount,
			} as never)
		);
}

function requestedPages(getPlacedOrders: ReturnType<typeof mockPages>) {
	return getPlacedOrders.mock.calls.map(([, , params]) =>
		params?.get('page')
	);
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEPLACEDORDER] usePlacedOrder', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fetches only the requested page without fetchAllPages', async () => {
		const getPlacedOrders = mockPages(30, (page) => [
			{id: page, orderTypeExternalReferenceCode: 'DXP'},
		]);

		const response = await placedOrdersQuery({
			accountId: 7,
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(requestedPages(getPlacedOrders)).toEqual(['1']);
		expect(response.items).toEqual([
			{id: 1, orderTypeExternalReferenceCode: 'DXP'},
		]);
	});

	it('pulls the remaining pages with fetchAllPages', async () => {
		const getPlacedOrders = mockPages(30, (page) => [
			{id: page, orderTypeExternalReferenceCode: 'DXP'},
		]);

		const response = await placedOrdersQuery({
			accountId: 7,
			fetchAllPages: true,
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(requestedPages(getPlacedOrders)).toEqual(['1', '2', '3']);
		expect(response.items.map(({id}) => id)).toEqual([1, 2, 3]);
	});

	it('caps fetchAllPages at 20 pages', async () => {
		const getPlacedOrders = mockPages(1000, (page) => [
			{id: page, orderTypeExternalReferenceCode: 'DXP'},
		]);

		await placedOrdersQuery({
			accountId: 7,
			fetchAllPages: true,
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(getPlacedOrders).toHaveBeenCalledTimes(20);
	});

	it('does not fetch more pages when the first page holds every order', async () => {
		const getPlacedOrders = mockPages(1, () => [
			{id: 1, orderTypeExternalReferenceCode: 'DXP'},
		]);

		await placedOrdersQuery({
			accountId: 7,
			fetchAllPages: true,
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(getPlacedOrders).toHaveBeenCalledTimes(1);
	});

	it('keeps only the orders whose type is in orderTypeExternalReferenceCodes', async () => {
		mockPages(3, () => [
			{id: 1, orderTypeExternalReferenceCode: 'DXP'},
			{id: 2, orderTypeExternalReferenceCode: 'AI_HUB'},
			{id: 3, orderTypeExternalReferenceCode: 'SOLUTIONS7'},
		]);

		const response = await placedOrdersQuery({
			accountId: 7,
			orderTypeExternalReferenceCodes: ['AI_HUB', 'SOLUTIONS7'],
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(response.items.map(({id}) => id)).toEqual([2, 3]);
	});

	it('keeps every order with an empty orderTypeExternalReferenceCodes list', async () => {
		mockPages(2, () => [
			{id: 1, orderTypeExternalReferenceCode: 'DXP'},
			{id: 2, orderTypeExternalReferenceCode: 'AI_HUB'},
		]);

		const response = await placedOrdersQuery({
			accountId: 7,
			orderTypeExternalReferenceCodes: [],
			page: 1,
			pageSize: 10,
		}).fetcher();

		expect(response.items).toHaveLength(2);
	});

	it('adds filter and restrictFields only when given', async () => {
		const getPlacedOrders = mockPages(0, () => []);

		await placedOrdersQuery({accountId: 7, page: 2, pageSize: 5}).fetcher();

		await placedOrdersQuery({
			accountId: 7,
			filter: 'orderStatus eq 0',
			page: 2,
			pageSize: 5,
			restrictFields: 'actions',
		}).fetcher();

		const [withoutOptional, withOptional] = getPlacedOrders.mock.calls.map(
			([, accountId, params]) => ({
				accountId,
				params: Object.fromEntries(params ?? []),
			})
		);

		expect(withoutOptional).toEqual({
			accountId: 7,
			params: {
				nestedFields: 'placedOrderItems',
				page: '2',
				pageSize: '5',
				sort: 'createDate:desc',
			},
		});
		expect(withOptional.params).toEqual({
			filter: 'orderStatus eq 0',
			nestedFields: 'placedOrderItems',
			page: '2',
			pageSize: '5',
			restrictFields: 'actions',
			sort: 'createDate:desc',
		});
	});

	it('builds a key from the query options, or null when shouldFetch is false', () => {
		expect(
			placedOrdersQuery({
				accountId: 7,
				filter: 'f',
				page: 1,
				pageSize: 10,
				restrictFields: 'r',
			}).key
		).toBe('/placed-orders/7/1/10/false/f/r');
		expect(
			placedOrdersQuery({
				accountId: 7,
				page: 1,
				pageSize: 10,
				shouldFetch: false,
			}).key
		).toBeNull();
	});

	it('sends no request from usePlacedOrders when shouldFetch is false', async () => {
		const getPlacedOrders = mockPages(0, () => []);

		const {result} = renderHook(
			() =>
				usePlacedOrders({
					accountId: 7,
					page: 1,
					pageSize: 10,
					shouldFetch: false,
				}),
			{wrapper}
		);

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getPlacedOrders).not.toHaveBeenCalled();
	});

	it('sends no request from usePlacedOrder without an order ID', async () => {
		const getPlacedOrder = vi.spyOn(
			HeadlessCommerceDeliveryOrder,
			'getPlacedOrder'
		);

		const {result} = renderHook(() => usePlacedOrder(0), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getPlacedOrder).not.toHaveBeenCalled();
	});
});
