/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import HeadlessCommerceAdminOrder from '~/services/headless/HeadlessCommerceAdminOrder';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import PublisherSalesSummaries from '~/services/objects/PublisherSalesSummaries';

import usePublisherSalesSummaryObject from './usePublisherSalesSummaryObject';

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEPUBLISHERSALESSUMMARYOBJECT] usePublisherSalesSummaryObject', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('assembles the account, addresses, and paired order items for each linked order', async () => {
		const publisherSalesSummary = {
			publisherToCommerceOrder: [{id: 101}, {id: 102}],
			r_accountEntryToPublisherSalesSummary_accountEntryId: 5,
		};

		const getPublisherSalesSummaryById = vi
			.spyOn(PublisherSalesSummaries, 'getPublisherSalesSummaryById')
			.mockResolvedValue(publisherSalesSummary as never);

		const getAccount = vi
			.spyOn(HeadlessAdminUser, 'getAccount')
			.mockResolvedValue({id: 5, name: 'Publisher'} as never);

		const getAccountPostalAddresses = vi
			.spyOn(HeadlessAdminUser, 'getAccountPostalAddresses')
			.mockResolvedValue({items: [{id: 1}]} as never);

		const getPlacedOrder = vi
			.spyOn(HeadlessCommerceDeliveryOrder, 'getPlacedOrder')
			.mockImplementation((orderId) =>
				Promise.resolve({
					author: `author-${orderId}`,
					placedOrderItems: [{id: `placed-${orderId}`}],
				} as never)
			);

		const getOrder = vi
			.spyOn(HeadlessCommerceAdminOrder, 'getOrder')
			.mockImplementation((orderId) =>
				Promise.resolve({
					account: {id: 9, name: 'Buyer'},
					currencyCode: 'USD',
					orderItems: [{id: `item-${orderId}`}],
				} as never)
			);

		const {result} = renderHook(
			() => usePublisherSalesSummaryObject('ENTRY-1'),
			{wrapper}
		);

		await waitFor(() => expect(result.current.data).toBeDefined());

		expect(getPublisherSalesSummaryById.mock.calls[0][0]).toBe('ENTRY-1');
		expect(
			getPublisherSalesSummaryById.mock.calls[0][1]?.get('nestedFields')
		).toBe('publisherToCommerceOrder');
		expect(getAccount).toHaveBeenCalledWith(5);
		expect(getAccountPostalAddresses).toHaveBeenCalledWith(5);
		expect(getPlacedOrder.mock.calls.map(([orderId]) => orderId)).toEqual([
			101, 102,
		]);
		expect(getOrder.mock.calls.map(([orderId]) => orderId)).toEqual([
			101, 102,
		]);
		expect(
			(getOrder.mock.calls[0][1] as URLSearchParams).get('nestedFields')
		).toBe('account,orderItems');

		expect(result.current.data).toEqual({
			account: {id: 5, name: 'Publisher'},
			completeOrderItems: [
				{
					orderItem: {
						account: {id: 9, name: 'Buyer'},
						currencyCode: 'USD',
						id: 'item-101',
					},
					placedOrderItem: {author: 'author-101', id: 'placed-101'},
				},
				{
					orderItem: {
						account: {id: 9, name: 'Buyer'},
						currencyCode: 'USD',
						id: 'item-102',
					},
					placedOrderItem: {author: 'author-102', id: 'placed-102'},
				},
			],
			postalAddresses: {items: [{id: 1}]},
			publisherSalesSummary,
		});
	});
});
