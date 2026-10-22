/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getContractProductOrders,
	getOrderStatusLabel,
	getOrderStatusToken,
	getPlacedOrderItemDate,
	getProductStatusToken,
	getTotalByOrderKey,
	hasAIHubOrder,
	hasProvisionedAIHubOrder,
	isBetaOrder,
	isTermExpired,
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

	describe('getProductStatusToken', () => {
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

		it('keeps a status other than active', () => {
			expect(
				getProductStatusToken(
					toPlacedOrder('SALESFORCE', 1),
					expiredPlacedOrderItems
				)
			).toBe('pending');
		});
	});

	describe('getContractProductOrders', () => {
		const toContractOrder = (id: number, contractId: number) =>
			toContractPlacedOrder({
				customFields: {contractId},
				id,
				placedOrderItems: [{productId: 7}],
			});

		const currentOrder = toContractOrder(1, 38227564);
		const legacyOrder = toContractOrder(2, 0);
		const otherProductOrder = toContractPlacedOrder({
			customFields: {contractId: 38227564},
			id: 3,
			placedOrderItems: [{productId: 8}],
		});

		const placedOrders = [legacyOrder, currentOrder, otherProductOrder];

		it('keeps the product orders of the selected contract', () => {
			expect(getContractProductOrders(placedOrders, 7, 38227564)).toEqual(
				[currentOrder]
			);
		});

		it('keeps every product order when no order names the contract', () => {
			expect(getContractProductOrders(placedOrders, 7, 34353392)).toEqual(
				[legacyOrder, currentOrder]
			);
		});

		it('keeps every product order without a selected contract', () => {
			expect(getContractProductOrders(placedOrders, 7)).toEqual([
				legacyOrder,
				currentOrder,
			]);
		});
	});
});
