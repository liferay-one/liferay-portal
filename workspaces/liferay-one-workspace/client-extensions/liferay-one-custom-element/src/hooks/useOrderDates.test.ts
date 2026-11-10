/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminOrder from '~/services/headless/HeadlessCommerceAdminOrder';

import {useOrderDates} from './useOrderDates';

import type {ReactNode} from 'react';
import type {APIResponse} from '~/types/api';
import type {Order} from '~/types/orders';

vi.mock('~/services/headless/HeadlessCommerceAdminOrder', () => ({
	default: {getOrders: vi.fn()},
}));

function wrapper({children}: {children: ReactNode}) {
	return createElement(
		SWRConfig,
		{value: {dedupingInterval: 0, provider: () => new Map()}},
		children
	);
}

describe('[HOOK-USEORDERDATES] useOrderDates', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('reads the order dates of the orders in one request', async () => {
		vi.mocked(HeadlessCommerceAdminOrder.getOrders).mockResolvedValue({
			items: [
				{id: 2, orderDate: '2023-09-30T00:00:00Z'},
				{id: 1, orderDate: '2024-01-15T00:00:00Z'},
			],
		} as APIResponse<Order>);

		const {result} = renderHook(() => useOrderDates([2, 1]), {wrapper});

		await waitFor(() =>
			expect(result.current.orderDates).toEqual(
				new Map([
					[1, '2024-01-15T00:00:00Z'],
					[2, '2023-09-30T00:00:00Z'],
				])
			)
		);

		expect(HeadlessCommerceAdminOrder.getOrders).toHaveBeenCalledOnce();
		expect(HeadlessCommerceAdminOrder.getOrders).toHaveBeenCalledWith(
			new URLSearchParams({
				fields: 'id,orderDate',
				filter: 'orderId in (1,2)',
				pageSize: '2',
			})
		);
	});

	it('leaves out an order without an order date', async () => {
		vi.mocked(HeadlessCommerceAdminOrder.getOrders).mockResolvedValue({
			items: [{id: 1}],
		} as APIResponse<Order>);

		const {result} = renderHook(() => useOrderDates([1]), {wrapper});

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.orderDates.size).toBe(0);
	});

	it('reads nothing without orders', () => {
		const {result} = renderHook(() => useOrderDates([]), {wrapper});

		expect(result.current).toEqual({loading: false, orderDates: new Map()});
		expect(HeadlessCommerceAdminOrder.getOrders).not.toHaveBeenCalled();
	});

	it('reads no order dates when the orders cannot be read', async () => {
		vi.mocked(HeadlessCommerceAdminOrder.getOrders).mockRejectedValue(
			new Error('Forbidden')
		);

		const {result} = renderHook(() => useOrderDates([1]), {wrapper});

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.orderDates.size).toBe(0);
	});
});
