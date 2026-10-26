/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import {Liferay} from '~/services/liferay/liferay';
import {getOrderStatusToken} from '~/utils/orderUtils';

import {usePlacedOrders} from './usePlacedOrder';
import {
	getProductEnvironmentOrderItems,
	getProductOrderInfo,
	getProductVirtualItems,
	getProjectExternalReferenceCode,
	getProjectName,
	hasProject,
	isProjectOrder,
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

const alphaProject = {externalReferenceCode: 'PRJCT-ALPHA', name: 'Alpha'};

const betaProject = {externalReferenceCode: 'PRJCT-BETA', name: 'Beta'};

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

	it('takes the project external reference code from the custom field', () => {
		expect(
			getProjectExternalReferenceCode(
				placedOrder({
					customFields: {
						'order-metadata': '{"salesforceProjectId":"PRJCT-OLD"}',
						'salesforceProjectId': 'PRJCT-ALPHA',
					},
				})
			)
		).toBe('PRJCT-ALPHA');
	});

	it('falls back to the project external reference code in the order metadata', () => {
		expect(
			getProjectExternalReferenceCode(
				placedOrder({
					customFields: {
						'order-metadata':
							'{"salesforceProjectId":"PRJCT-ALPHA"}',
					},
				})
			)
		).toBe('PRJCT-ALPHA');
	});

	it('returns an empty project external reference code when neither field is set', () => {
		expect(getProjectExternalReferenceCode(alphaOrder)).toBe('');
		expect(getProjectExternalReferenceCode(placedOrder({id: 3}))).toBe('');
	});

	it('has a project when the order carries either a project external reference code or a name', () => {
		expect(
			hasProject(
				placedOrder({
					customFields: {salesforceProjectId: 'PRJCT-ALPHA'},
				})
			)
		).toBe(true);
		expect(hasProject(alphaOrder)).toBe(true);
		expect(hasProject(placedOrder({id: 3}))).toBe(false);
	});

	it('matches the project by external reference code over a renamed project name', () => {
		const renamedOrder = placedOrder({
			customFields: {
				projectName: 'Alpha Before Rename',
				salesforceProjectId: 'PRJCT-ALPHA',
			},
		});

		expect(isProjectOrder(renamedOrder, alphaProject)).toBe(true);
	});

	it('does not match a project that shares the name but not the external reference code', () => {
		const otherAlphaOrder = placedOrder({
			customFields: {
				projectName: 'Alpha',
				salesforceProjectId: 'PRJCT-OTHER-ALPHA',
			},
		});

		expect(isProjectOrder(otherAlphaOrder, alphaProject)).toBe(false);
	});

	it('matches the project by name when the order has no project external reference code', () => {
		expect(isProjectOrder(alphaOrder, alphaProject)).toBe(true);
		expect(isProjectOrder(betaOrder, alphaProject)).toBe(false);
	});

	it('matches the orders without a project to the one time purchases project', () => {
		const oneTimePurchasesProject = {
			externalReferenceCode: ONE_TIME_PURCHASES,
			name: 'One-Time Purchases',
		};

		expect(
			isProjectOrder(placedOrder({id: 3}), oneTimePurchasesProject)
		).toBe(true);
		expect(isProjectOrder(alphaOrder, oneTimePurchasesProject)).toBe(false);
		expect(
			isProjectOrder(
				placedOrder({
					customFields: {salesforceProjectId: 'PRJCT-ALPHA'},
				}),
				oneTimePurchasesProject
			)
		).toBe(false);
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

	it('filters the orders by project', () => {
		mockPlacedOrders([alphaOrder, betaOrder]);

		const {result} = renderHook(() => useProjectOrders(betaProject));

		expect(result.current.placedOrders).toEqual([betaOrder]);
		expect(result.current.orders.map(({id}) => id)).toEqual(['2']);
	});

	it('filters the orders by the product in their items', () => {
		const productOrder = placedOrder({
			customFields: {projectName: 'Alpha'},
			id: 4,
			placedOrderItems: [{productId: 9}, {productId: 12}],
		});

		mockPlacedOrders([alphaOrder, betaOrder, productOrder]);

		const {result} = renderHook(() => useProjectOrders(alphaProject, 12));

		expect(result.current.placedOrders).toEqual([productOrder]);
		expect(result.current.orders.map(({id}) => id)).toEqual(['4']);
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
			placedOrderItems: [{productId: 7}],
		});

		const aiHubOrder = placedOrder({
			author: 'Jane Doe',
			createDate: '2026-03-15T12:00:00Z',
			customFields: {
				cloudProjectName: 'cloud-1',
				ldpAnalyticsCloudProject: '{"dataSourceAccessToken":"token-1"}',
				projectName: 'Alpha',
			},
			id: 11,
			orderStatusInfo: {code: 0, label: 'Completed'},
			orderTypeExternalReferenceCode: 'AI_HUB',
			placedOrderItems: [
				{name: 'Other Product', productId: 9, quantity: 1},
				{name: 'AI Hub - Business', productId: 7, quantity: 3},
			],
			purchaseOrderNumber: 'PO-1',
		});

		expect(
			getProductOrderInfo('product', [tokenOrder, aiHubOrder], 7)
		).toEqual({
			environment: {
				cloudProjectName: 'cloud-1',
				ldpDataSourceAccessToken: 'token-1',
				projectName: 'Alpha',
			},
			itemName: 'AI Hub - Business',
			orderDate: 'Mar 15, 2026',
			orderId: '11',
			orderType: 'AI_HUB',
			purchaseNumber: 'PO-1',
			purchasedBy: 'Jane Doe',
			quantity: '3',
			skuProductNames: [''],
			status: 'active',
		});
	});

	it('adds the quantities of every order item for the product', () => {
		const order = placedOrder({
			id: 12,
			placedOrderItems: [
				{name: 'Analytics Cloud - Business', productId: 7, quantity: 3},
				{name: 'Other Product', productId: 9, quantity: 1},
				{name: 'Analytics Cloud - Business', productId: 7, quantity: 2},
			],
		});

		expect(getProductOrderInfo('product', [order], 7)).toMatchObject({
			itemName: 'Analytics Cloud - Business',
			quantity: '5',
		});
	});

	it('leaves the purchaser of a Salesforce order empty', () => {
		const order = placedOrder({
			author: 'Ryan Schuhler',
			id: 14,
			orderStatusInfo: {code: 0, label: 'Completed', label_i18n: ''},
			orderTypeExternalReferenceCode: 'SALESFORCE',
			placedOrderItems: [{productId: 7}],
		});

		expect(getProductOrderInfo('product', [order], 7).purchasedBy).toBe('');
	});

	it('leaves token orders out of the term status of the product', () => {
		const toOrder = (
			id: number,
			orderTypeExternalReferenceCode: string,
			endDate?: string
		) =>
			placedOrder({
				id,
				orderStatusInfo: {code: 0, label: 'Completed', label_i18n: ''},
				orderTypeExternalReferenceCode,
				placedOrderItems: [{customFields: {endDate}, productId: 7}],
			});

		expect(
			getProductOrderInfo(
				'product',
				[
					toOrder(15, 'DXP', '2017-04-14T00:00:00Z'),
					toOrder(16, 'AI_HUB_TOKEN'),
				],
				7
			).status
		).toBe('expired');
	});

	it('shows an application with the status of its order', () => {
		const order = placedOrder({
			id: 17,
			orderStatusInfo: {code: 0, label: 'Completed', label_i18n: ''},
			placedOrderItems: [
				{
					customFields: {endDate: '2017-04-14T00:00:00Z'},
					productId: 7,
				},
			],
		});

		expect(getProductOrderInfo('application', [order], 7).status).toBe(
			'completed'
		);
		expect(getProductOrderInfo('product', [order], 7).status).toBe(
			'expired'
		);
	});

	it('names the tier after the SKU option value of each order item', () => {
		const toOption = (key: string, skuOptionValueName: string) =>
			JSON.stringify([
				{
					key,
					skuOptionName: key,
					skuOptionValueNames: [skuOptionValueName],
				},
			]);

		const order = placedOrder({
			id: 13,
			placedOrderItems: [
				{
					name: 'Support Plans',
					options: toOption('support-plans', 'Global 24/7 Support'),
					productId: 7,
				},
				{
					name: 'Support Plans',
					options: toOption('support-plans', 'Global 24/7 Support'),
					productId: 7,
				},
				{
					name: 'Support Plans',
					options: toOption('machinetype', 'standard'),
					productId: 7,
				},
			],
		});

		expect(getProductOrderInfo('product', [order], 7).itemName).toBe(
			'Global 24/7 Support, Support Plans'
		);
	});

	it('names the SKU product of each order item after its product option value', () => {
		const order = placedOrder({
			id: 13,
			placedOrderItems: [
				{
					id: 21,
					name: 'Liferay Portal EE',
					options: JSON.stringify([
						{
							key: 'liferay-portal-ee',
							skuOptionValueNames: [
								'Subscription Portal EE - Platinum (Production)',
							],
						},
					]),
					productId: 7,
				},
				{
					id: 22,
					name: 'Liferay Data Platform',
					options: JSON.stringify([
						{
							key: 'consumption-role',
							skuOptionValueNames: ['Base Allotment'],
						},
						{
							key: 'salesforce-product',
							skuOptionValueNames: ['Liferay Data Platform'],
						},
					]),
					productId: 7,
				},
				{
					id: 23,
					name: 'Liferay Portal EE',
					options: JSON.stringify([
						{key: 'machinetype', skuOptionValueNames: ['High']},
					]),
					productId: 7,
				},
			],
		});

		const skuProductNames = [
			'Subscription Portal EE - Platinum (Production)',
			'Liferay Data Platform',
			'',
		];

		expect(
			getProductEnvironmentOrderItems([order], 7).map(
				({skuProductName}) => skuProductName
			)
		).toEqual(skuProductNames);
		expect(
			getProductOrderInfo('product', [order], 7).skuProductNames
		).toEqual(skuProductNames);
	});

	it('returns blank product order info when no order matches', () => {
		expect(
			getProductOrderInfo(
				'product',
				[
					placedOrder({
						id: 10,
						orderTypeExternalReferenceCode: 'AI_HUB_TOKEN',
						placedOrderItems: [{productId: 7}],
					}),
				],
				7
			)
		).toEqual({
			environment: {
				cloudProjectName: '',
				ldpDataSourceAccessToken: '',
				projectName: '',
			},
			itemName: '',
			orderDate: '',
			orderId: '',
			orderType: '',
			purchaseNumber: '',
			purchasedBy: '',
			quantity: '',
			skuProductNames: [],
			status: '',
		});
	});

	it('takes the virtual items from the first matching order item', () => {
		const orders = [
			placedOrder({id: 1, placedOrderItems: [{productId: 9}]}),
			placedOrder({
				id: 2,
				placedOrderItems: [
					{productId: 7, virtualItems: [{id: 'first'}]},
				],
			}),
			placedOrder({
				id: 3,
				placedOrderItems: [
					{productId: 7, virtualItems: [{id: 'second'}]},
				],
			}),
		];

		expect(getProductVirtualItems(orders, 7)).toEqual([{id: 'first'}]);
	});

	it('returns no virtual items when the matching item has none or nothing matches', () => {
		expect(
			getProductVirtualItems(
				[placedOrder({id: 1, placedOrderItems: [{productId: 7}]})],
				7
			)
		).toEqual([]);
		expect(getProductVirtualItems([], 7)).toEqual([]);
	});
});
