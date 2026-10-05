/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';
import {getOrderStatusToken} from '~/utils/orderUtils';

import {usePlacedOrders} from './usePlacedOrder';
import {
	getProductOrderInfo,
	getProductVirtualItems,
	getProjectName,
	useProjectOrders,
} from './useProjectOrders';

import type {PlacedOrder} from '~/types/orders';

vi.mock('./usePlacedOrder', async (importOriginal) => ({
	...(await importOriginal<typeof import('./usePlacedOrder')>()),
	usePlacedOrders: vi.fn(),
}));

function placedOrder(order: Record<string, unknown>) {
	return order as unknown as PlacedOrder;
}

function mockPlacedOrders(items?: PlacedOrder[]) {
	vi.mocked(usePlacedOrders).mockReturnValue({
		data: items && {items},
		error: undefined,
		isLoading: false,
	} as ReturnType<typeof usePlacedOrders>);
}

const alphaOrder = placedOrder({
	createDate: '2026-03-15T12:00:00Z',
	customFields: {projectName: 'Alpha'},
	id: 1,
	summary: {totalFormatted: '$10.00'},
});

const betaOrder = placedOrder({
	createDate: '2026-04-02T12:00:00Z',
	customFields: {'koroneiki-project': '[{"name":"Beta"},{"name":"Gamma"}]'},
	id: 2,
});

describe('[HOOK-USEPROJECTORDERS] useProjectOrders', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {accountId: 7, accountName: 'Acme'};
	});

	afterEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('takes the project name from the custom field', () => {
		expect(getProjectName(alphaOrder)).toBe('Alpha');
	});

	it('falls back to the first parsed Koroneiki project name', () => {
		expect(getProjectName(betaOrder)).toBe('Beta');
	});

	it('returns an empty project name when neither field is set', () => {
		expect(getProjectName(placedOrder({id: 3}))).toBe('');
	});

	it('requests every page of the account orders, and skips the request without an account', () => {
		mockPlacedOrders([]);

		renderHook(() => useProjectOrders());

		expect(usePlacedOrders).toHaveBeenLastCalledWith(
			expect.objectContaining({
				accountId: 7,
				fetchAllPages: true,
				shouldFetch: true,
			})
		);

		Liferay.CommerceContext.account = undefined;

		renderHook(() => useProjectOrders());

		expect(usePlacedOrders).toHaveBeenLastCalledWith(
			expect.objectContaining({accountId: -1, shouldFetch: false})
		);
	});

	it('maps every order when no project name is given, with the total falling back to $0.00', () => {
		mockPlacedOrders([alphaOrder, betaOrder]);

		const {result} = renderHook(() => useProjectOrders());

		expect(result.current.orders).toEqual([
			{
				date: 'Mar 15, 2026',
				id: '1',
				orderId: '1',
				status: getOrderStatusToken(alphaOrder),
				total: '$10.00',
			},
			{
				date: 'Apr 2, 2026',
				id: '2',
				orderId: '2',
				status: getOrderStatusToken(betaOrder),
				total: '$0.00',
			},
		]);
	});

	it('filters the orders by project name', () => {
		mockPlacedOrders([alphaOrder, betaOrder]);

		const {result} = renderHook(() => useProjectOrders('Beta'));

		expect(result.current.placedOrders).toEqual([betaOrder]);
		expect(result.current.orders.map(({id}) => id)).toEqual(['2']);
	});

	it('returns no orders while the data is missing', () => {
		mockPlacedOrders(undefined);

		const {result} = renderHook(() => useProjectOrders());

		expect(result.current.orders).toEqual([]);
	});

	it('skips AI_HUB_TOKEN orders when resolving product order info', () => {
		const tokenOrder = placedOrder({
			id: 10,
			orderTypeExternalReferenceCode: 'AI_HUB_TOKEN',
			placedOrderItems: [{name: 'AI Hub'}],
		});

		const aiHubOrder = placedOrder({
			account: 'Acme',
			createDate: '2026-03-15T12:00:00Z',
			customFields: {
				cloudProjectName: 'cloud-1',
				ldpAnalyticsCloudProject: '{"dataSourceAccessToken":"token-1"}',
				projectName: 'Alpha',
			},
			id: 11,
			orderStatusInfo: {code: 0, label: 'Completed'},
			orderTypeExternalReferenceCode: 'AI_HUB',
			placedOrderItems: [{name: 'AI Hub'}],
			purchaseOrderNumber: 'PO-1',
		});

		expect(getProductOrderInfo([tokenOrder, aiHubOrder], 'AI Hub')).toEqual(
			{
				environment: {
					cloudProjectName: 'cloud-1',
					ldpDataSourceAccessToken: 'token-1',
					projectName: 'Alpha',
				},
				orderDate: 'Mar 15, 2026',
				orderId: '11',
				orderType: 'AI_HUB',
				purchaseNumber: 'PO-1',
				purchasedBy: 'Acme',
				status: 'completed',
			}
		);
	});

	it('returns blank product order info when no order matches', () => {
		expect(
			getProductOrderInfo(
				[
					placedOrder({
						id: 10,
						orderTypeExternalReferenceCode: 'AI_HUB_TOKEN',
						placedOrderItems: [{name: 'AI Hub'}],
					}),
				],
				'AI Hub'
			)
		).toEqual({
			environment: {
				cloudProjectName: '',
				ldpDataSourceAccessToken: '',
				projectName: '',
			},
			orderDate: '',
			orderId: '',
			orderType: '',
			purchaseNumber: '',
			purchasedBy: '',
			status: '',
		});
	});

	it('takes the virtual items from the first matching order item', () => {
		const orders = [
			placedOrder({id: 1, placedOrderItems: [{name: 'Other'}]}),
			placedOrder({
				id: 2,
				placedOrderItems: [
					{name: 'DXP', virtualItems: [{id: 'first'}]},
				],
			}),
			placedOrder({
				id: 3,
				placedOrderItems: [
					{name: 'DXP', virtualItems: [{id: 'second'}]},
				],
			}),
		];

		expect(getProductVirtualItems(orders, 'DXP')).toEqual([{id: 'first'}]);
	});

	it('returns no virtual items when the matching item has none or nothing matches', () => {
		expect(
			getProductVirtualItems(
				[placedOrder({id: 1, placedOrderItems: [{name: 'DXP'}]})],
				'DXP'
			)
		).toEqual([]);
		expect(getProductVirtualItems([], 'DXP')).toEqual([]);
	});
});
