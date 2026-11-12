/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
	formatOrderDate,
	getContractProductOrders,
	getEarliestPlacedOrderItemStartDate,
	getOrderStatusLabel,
	getOrderStatusToken,
	getPlacedOrderItemContractId,
	getPlacedOrderItemDate,
	getProductStatusToken,
	getProjectItemStatusToken,
	getTotalByOrderKey,
	hasAIHubOrder,
	hasProvisionedAIHubOrder,
	isBetaOrder,
	isClosedWonOrder,
	isTermExpired,
	isTermFuture,
	toStatusToken,
} from './orderUtils';

import type {Order, PlacedOrder, PlacedOrderItems} from '~/types/orders';

function toOrder(currencyCode: string, totalAmount?: number) {
	return {currencyCode, totalAmount} as unknown as Order;
}

function toPlacedOrder(
	orderTypeExternalReferenceCode: string,
	code: number,
	label = 'Workflow Label'
) {
	return {
		orderStatusInfo: {code, label, label_i18n: ''},
		orderTypeExternalReferenceCode,
	} as unknown as PlacedOrder;
}

function toContractPlacedOrder(order: Record<string, unknown>) {
	return order as unknown as PlacedOrder;
}

function toPlacedOrderItem(endDate?: string, startDate?: string) {
	return {customFields: {endDate, startDate}} as unknown as PlacedOrderItems;
}

function toPlacedOrderWithCustomStatuses(
	...customStatuses: (string | undefined)[]
) {
	return {
		placedOrderItems: customStatuses.map((customStatus) => ({
			customFields: customStatus === undefined ? {} : {customStatus},
		})),
	} as unknown as PlacedOrder;
}

function toPlacedOrderWithOptions(...optionsList: (string | undefined)[]) {
	return {
		placedOrderItems: optionsList.map((options) => ({options})),
	} as unknown as PlacedOrder;
}

describe('[MOD-ORDERUTILS] orderUtils', () => {
	describe('getTotalByOrderKey', () => {
		it('returns 0 without orders', () => {
			expect(getTotalByOrderKey('totalAmount', [])).toBe(0);
		});

		it('sums only USD orders with numeric values and formats the total', () => {
			expect(
				getTotalByOrderKey('totalAmount', [
					toOrder('USD', 100.25),
					toOrder('EUR', 1000),
					toOrder('USD'),
					toOrder('USD', 50),
				])
			).toBe('$150.25');
		});

		it('applies the multiplier', () => {
			expect(
				getTotalByOrderKey('totalAmount', [toOrder('USD', 10)], 3)
			).toBe('$30.00');
		});
	});

	describe('getOrderStatusLabel', () => {
		const orderTypes = [
			'ADDONS',
			'AI_HUB',
			'CMP',
			'CMP_TRIAL',
			'DSR',
			'DXP',
			'DXP_APP',
			'SALESFORCE',
			'SEO_STUDIO',
			'SSA_SAAS',
		];

		it('shows a completed order as completed for every order type', () => {
			for (const orderType of orderTypes) {
				expect(getOrderStatusLabel(toPlacedOrder(orderType, 0))).toBe(
					'Completed'
				);
			}
		});

		it('shows an in progress order as completed for every order type', () => {
			for (const orderType of orderTypes) {
				expect(getOrderStatusLabel(toPlacedOrder(orderType, 6))).toBe(
					'Completed'
				);
			}
		});

		it('shows a cancelled order as cancelled for every order type', () => {
			for (const orderType of orderTypes) {
				expect(getOrderStatusLabel(toPlacedOrder(orderType, 8))).toBe(
					'Cancelled'
				);
			}
		});

		it('shows every other order status as pending for every order type', () => {
			for (const orderType of orderTypes) {
				for (const code of [1, 10, 20, 99]) {
					expect(
						getOrderStatusLabel(toPlacedOrder(orderType, code))
					).toBe('Pending');
				}
			}
		});

		it('shows an order without an order status as pending', () => {
			expect(
				getOrderStatusLabel({
					orderTypeExternalReferenceCode: 'DXP',
				} as unknown as PlacedOrder)
			).toBe('Pending');
		});

		it('ignores the order status label and the workflow status label', () => {
			expect(
				getOrderStatusLabel({
					orderStatusInfo: {code: 0, label: 'Active', label_i18n: ''},
					orderTypeExternalReferenceCode: 'SSA_SAAS',
					workflowStatusInfo: {label: 'approved', label_i18n: ''},
				} as unknown as PlacedOrder)
			).toBe('Completed');
		});
	});

	describe('toStatusToken', () => {
		it('lowercases and dashes spaces', () => {
			expect(toStatusToken('In  Progress')).toBe('in-progress');
		});

		it('aliases cancelled to canceled', () => {
			expect(toStatusToken('Cancelled')).toBe('canceled');
		});

		it('tokenizes the order status label', () => {
			expect(getOrderStatusToken(toPlacedOrder('DXP', 1))).toBe(
				'pending'
			);
			expect(getOrderStatusToken(toPlacedOrder('DXP', 8))).toBe(
				'canceled'
			);
		});
	});

	describe('isBetaOrder', () => {
		it('is true for beta, open beta, and private beta keys', () => {
			for (const skuOptionValueKey of [
				'beta',
				'open-beta',
				'private-beta',
			]) {
				expect(
					isBetaOrder(
						toPlacedOrderWithOptions(
							JSON.stringify([{skuOptionValueKey}])
						)
					)
				).toBe(true);
			}
		});

		it('is false for other keys, invalid JSON, or no items', () => {
			expect(
				isBetaOrder(
					toPlacedOrderWithOptions(
						JSON.stringify([{skuOptionValueKey: 'standard'}]),
						'not json',
						undefined
					)
				)
			).toBe(false);
			expect(isBetaOrder(undefined)).toBe(false);
		});
	});

	describe('hasAIHubOrder', () => {
		it('detects an AI Hub order', () => {
			expect(
				hasAIHubOrder([
					toPlacedOrder('DXP', 0),
					toPlacedOrder('AI_HUB', 0),
				])
			).toBe(true);
			expect(hasAIHubOrder([toPlacedOrder('DXP', 0)])).toBe(false);
			expect(hasAIHubOrder()).toBe(false);
		});
	});

	describe('hasProvisionedAIHubOrder', () => {
		function toAIHubOrder(
			code: number,
			orderMetadata: Record<string, unknown>
		) {
			return {
				...toPlacedOrder('AI_HUB', code),
				customFields: {
					'order-metadata': JSON.stringify(orderMetadata),
				},
			} as PlacedOrder;
		}

		const orderMetadata = {
			aiHubAccountEntryId: 4321,
			aiHubForm: {aiHubAccountName: 'Acme AI Hub'},
			salesforceProjectId: 'PRJCT-1',
		};

		it('detects a completed and provisioned AI Hub order of the project', () => {
			expect(
				hasProvisionedAIHubOrder(
					[toPlacedOrder('DXP', 0), toAIHubOrder(0, orderMetadata)],
					'PRJCT-1'
				)
			).toBe(true);
		});

		it('ignores an AI Hub order that is not completed, provisioned, or of the project', () => {
			expect(
				hasProvisionedAIHubOrder(
					[
						toAIHubOrder(1, orderMetadata),
						toAIHubOrder(0, {
							...orderMetadata,
							salesforceProjectId: 'PRJCT-2',
						}),
						toAIHubOrder(0, {
							...orderMetadata,
							aiHubAccountEntryId: undefined,
						}),
						toAIHubOrder(0, {...orderMetadata, aiHubForm: {}}),
					],
					'PRJCT-1'
				)
			).toBe(false);
			expect(hasProvisionedAIHubOrder(undefined, 'PRJCT-1')).toBe(false);
		});
	});

	describe('getPlacedOrderItemDate', () => {
		it('reads the calendar day of the custom field', () => {
			expect(
				getPlacedOrderItemDate(
					toPlacedOrderItem('2017-04-14T00:00:00Z'),
					'endDate'
				)
			).toEqual(new Date(2017, 3, 14));
		});

		it('treats a missing or 1970 date as no date', () => {
			expect(
				getPlacedOrderItemDate(toPlacedOrderItem(), 'endDate')
			).toBeUndefined();
			expect(
				getPlacedOrderItemDate(
					toPlacedOrderItem('1970-01-01T00:00:00Z'),
					'endDate'
				)
			).toBeUndefined();
		});
	});

	describe('getEarliestPlacedOrderItemStartDate', () => {
		it('returns the earliest start date of the order items', () => {
			expect(
				getEarliestPlacedOrderItemStartDate([
					toPlacedOrderItem(undefined, '2026-01-01T00:00:00Z'),
					toPlacedOrderItem(undefined, '2025-11-11T00:00:00Z'),
				])
			).toBe('2025-11-11T00:00:00Z');
		});

		it('ignores missing and 1970 start dates', () => {
			expect(
				getEarliestPlacedOrderItemStartDate([
					toPlacedOrderItem(),
					toPlacedOrderItem(undefined, '1970-01-01T00:00:00Z'),
				])
			).toBe('');
		});
	});

	describe('isClosedWonOrder', () => {
		it('accepts an order with an Approved item', () => {
			expect(
				isClosedWonOrder(toPlacedOrderWithCustomStatuses('Approved'))
			).toBe(true);
		});

		it('accepts a self service order that has no custom status', () => {
			expect(
				isClosedWonOrder(toPlacedOrderWithCustomStatuses(undefined, ''))
			).toBe(true);
		});

		it('accepts an order with Approved and Canceled items', () => {
			expect(
				isClosedWonOrder(
					toPlacedOrderWithCustomStatuses('Canceled', 'Approved')
				)
			).toBe(true);
		});

		it('accepts an order with no items', () => {
			expect(isClosedWonOrder({})).toBe(true);
			expect(isClosedWonOrder({placedOrderItems: []})).toBe(true);
		});

		it('rejects an order whose items are all On Hold', () => {
			expect(
				isClosedWonOrder(
					toPlacedOrderWithCustomStatuses('On Hold', 'On Hold')
				)
			).toBe(false);
		});

		it('rejects an order whose items are all Canceled', () => {
			expect(
				isClosedWonOrder(toPlacedOrderWithCustomStatuses('Canceled'))
			).toBe(false);
		});

		it('rejects an order with On Hold and Canceled items', () => {
			expect(
				isClosedWonOrder(
					toPlacedOrderWithCustomStatuses('Canceled', 'On Hold')
				)
			).toBe(false);
		});
	});

	describe('isTermExpired', () => {
		it('is true when every order item ended', () => {
			expect(
				isTermExpired([
					toPlacedOrderItem('2017-04-14T00:00:00Z'),
					toPlacedOrderItem('2018-04-14T00:00:00Z'),
				])
			).toBe(true);
		});

		it('is false when one order item has not ended or has no end date', () => {
			expect(
				isTermExpired([
					toPlacedOrderItem('2017-04-14T00:00:00Z'),
					toPlacedOrderItem('2999-01-01T00:00:00Z'),
				])
			).toBe(false);
			expect(
				isTermExpired([
					toPlacedOrderItem('2017-04-14T00:00:00Z'),
					toPlacedOrderItem('1970-01-01T00:00:00Z'),
				])
			).toBe(false);
			expect(isTermExpired([])).toBe(false);
		});
	});

	describe('isTermFuture', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('is true when every order item starts after today', () => {
			expect(
				isTermFuture([
					toPlacedOrderItem(undefined, '2999-01-01T00:00:00Z'),
					toPlacedOrderItem(undefined, '2998-01-01T00:00:00Z'),
				])
			).toBe(true);
		});

		it('is false when one order item started or has no start date', () => {
			expect(
				isTermFuture([
					toPlacedOrderItem(undefined, '2999-01-01T00:00:00Z'),
					toPlacedOrderItem(undefined, '2017-04-14T00:00:00Z'),
				])
			).toBe(false);
			expect(
				isTermFuture([
					toPlacedOrderItem(undefined, '2999-01-01T00:00:00Z'),
					toPlacedOrderItem(undefined, '1970-01-01T00:00:00Z'),
				])
			).toBe(false);
			expect(isTermFuture([])).toBe(false);
		});

		it('is false for an order item that starts today', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 9, 26, 15));

			expect(
				isTermFuture([
					toPlacedOrderItem(undefined, '2026-10-26T00:00:00Z'),
				])
			).toBe(false);
			expect(
				isTermFuture([
					toPlacedOrderItem(undefined, '2026-10-27T00:00:00Z'),
				])
			).toBe(true);
		});
	});

	describe('getProductStatusToken', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		const expiredPlacedOrderItems = [
			toPlacedOrderItem('2017-04-14T00:00:00Z'),
		];

		it('shows a completed Salesforce order as expired when its terms ended', () => {
			expect(
				getProductStatusToken(
					toPlacedOrder('SALESFORCE', 0),
					expiredPlacedOrderItems
				)
			).toBe('expired');
		});

		it('keeps the order status while a term is current', () => {
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [
					toPlacedOrderItem('2999-01-01T00:00:00Z'),
				])
			).toBe('active');
		});

		it('shows a completed order as future when no term has started', () => {
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [
					toPlacedOrderItem(undefined, '2999-01-01T00:00:00Z'),
				])
			).toBe('future');
		});

		it('shows a completed order as active without term dates', () => {
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [
					toPlacedOrderItem(),
				])
			).toBe('active');
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [])
			).toBe('active');
		});

		it('shows a completed order as expired when its terms end today', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 9, 26, 15));

			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [
					toPlacedOrderItem('2026-10-26T00:00:00Z'),
				])
			).toBe('expired');
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 0), [
					toPlacedOrderItem('2026-10-27T00:00:00Z'),
				])
			).toBe('active');
		});

		it('keeps a pending or canceled order status whatever its dates', () => {
			expect(
				getProductStatusToken(
					toPlacedOrder('SALESFORCE', 1),
					expiredPlacedOrderItems
				)
			).toBe('pending');
			expect(
				getProductStatusToken(toPlacedOrder('SALESFORCE', 8), [
					toPlacedOrderItem(undefined, '2999-01-01T00:00:00Z'),
				])
			).toBe('canceled');
		});
	});

	describe('getProjectItemStatusToken', () => {
		it('shows an application with the status of its order', () => {
			expect(
				getProjectItemStatusToken(
					'application',
					toPlacedOrder('DXP_APP', 0),
					[toPlacedOrderItem('2017-04-14T00:00:00Z')]
				)
			).toBe('completed');
		});

		it('shows a product with the status of its terms', () => {
			expect(
				getProjectItemStatusToken(
					'product',
					toPlacedOrder('SALESFORCE', 0),
					[toPlacedOrderItem('2017-04-14T00:00:00Z')]
				)
			).toBe('expired');
		});
	});

	describe('getPlacedOrderItemContractId', () => {
		const toMetadata = (contractEntityId: number) => ({
			customFields: {
				'order-metadata': JSON.stringify({contractEntityId}),
			},
		});

		const toOrderContract = (contractId: number) => ({
			customFields: {contractId},
		});

		const toItem = (contractId?: number | string) =>
			({
				customFields: {contractId},
			}) as unknown as PlacedOrderItems;

		it('reads the contract of the order item', () => {
			expect(
				getPlacedOrderItemContractId(
					toContractPlacedOrder({customFields: {contractId: 5}}),
					toItem('38227564')
				)
			).toBe(38227564);
		});

		it('falls back to the contract of the order', () => {
			const order = toContractPlacedOrder(toOrderContract(77));

			expect(getPlacedOrderItemContractId(order, toItem(0))).toBe(77);
			expect(getPlacedOrderItemContractId(order, toItem('0'))).toBe(77);
			expect(getPlacedOrderItemContractId(order, toItem())).toBe(77);
		});

		it('prefers the contract of the order item over the contract of the order', () => {
			expect(
				getPlacedOrderItemContractId(
					toContractPlacedOrder(toOrderContract(77)),
					toItem(12)
				)
			).toBe(12);
		});

		it('ignores the contract in the order metadata', () => {
			expect(
				getPlacedOrderItemContractId(
					toContractPlacedOrder(toMetadata(77)),
					toItem(0)
				)
			).toBe(0);
		});

		it('returns 0 without an item contract and without an order contract', () => {
			expect(
				getPlacedOrderItemContractId(
					toContractPlacedOrder({}),
					{} as PlacedOrderItems
				)
			).toBe(0);
		});
	});

	describe('getContractProductOrders', () => {
		const toContractOrder = (
			id: number,
			contractId: number,
			productId = 7
		) =>
			toContractPlacedOrder({
				id,
				placedOrderItems: [{customFields: {contractId}, productId}],
			});

		const currentOrder = toContractOrder(1, 38227564);
		const legacyOrder = toContractOrder(2, 0);
		const otherProductOrder = toContractOrder(3, 38227564, 8);

		const placedOrders = [legacyOrder, currentOrder, otherProductOrder];

		it('keeps the product orders of the selected contract', () => {
			expect(getContractProductOrders(placedOrders, 7, 38227564)).toEqual(
				[currentOrder]
			);
		});

		it('keeps every product order when no item names the contract', () => {
			expect(getContractProductOrders(placedOrders, 7, 34353392)).toEqual(
				[legacyOrder, currentOrder]
			);
		});

		it('keeps the whole order of an item that names no contract', () => {
			const pendingOrder = toContractPlacedOrder({
				id: 5,
				placedOrderItems: [
					{customFields: {}, productId: 7},
					{customFields: {}, productId: 8},
				],
			});

			expect(
				getContractProductOrders([pendingOrder], 7, 38227564)
			).toEqual([pendingOrder]);
		});

		it('keeps every product order when only another contract holds the items', () => {
			const otherContractOrder = toContractOrder(6, 99);

			expect(
				getContractProductOrders([otherContractOrder], 7, 38227564)
			).toEqual([otherContractOrder]);
		});

		it('returns no order when no order holds the product', () => {
			expect(getContractProductOrders(placedOrders, 9, 38227564)).toEqual(
				[]
			);
		});

		it('keeps every product order without a selected contract', () => {
			expect(getContractProductOrders(placedOrders, 7)).toEqual([
				legacyOrder,
				currentOrder,
			]);
		});

		it('keeps only the items of the selected contract in a multi year order', () => {
			const yearOne = {
				customFields: {contractId: 1},
				id: 11,
				productId: 7,
			};
			const yearTwo = {
				customFields: {contractId: 2},
				id: 12,
				productId: 7,
			};
			const yearThree = {
				customFields: {contractId: 3},
				id: 13,
				productId: 7,
			};

			const order = toContractPlacedOrder({
				id: 9,
				placedOrderItems: [yearOne, yearTwo, yearThree],
			});

			expect(getContractProductOrders([order], 7, 2)).toEqual([
				{id: 9, placedOrderItems: [yearTwo]},
			]);
		});

		it('matches an item without a contract through the contract of its order', () => {
			const aiHubOrder = toContractPlacedOrder({
				customFields: {contractId: 88},
				id: 4,
				placedOrderItems: [{customFields: {}, productId: 7}],
			});

			expect(
				getContractProductOrders([legacyOrder, aiHubOrder], 7, 88)
			).toEqual([aiHubOrder]);
		});
	});

	describe('formatOrderDate', () => {
		it('shows the UTC calendar day of the date', () => {
			expect(formatOrderDate('2023-09-30T00:00:00Z')).toBe(
				'Sep 30, 2023'
			);
			expect(formatOrderDate('2026-10-22T02:00:00Z')).toBe(
				'Oct 22, 2026'
			);
		});

		it('shows a dash without a date', () => {
			expect(formatOrderDate()).toBe('-');
		});
	});
});
