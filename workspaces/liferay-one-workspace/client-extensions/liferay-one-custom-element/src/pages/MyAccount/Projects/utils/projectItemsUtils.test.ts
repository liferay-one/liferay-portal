/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {toProductsByProductId, toProjectItemsByType} from './projectItemsUtils';

import type {PlacedOrder} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

function toProduct(
	productId: number,
	externalReferenceCode: string,
	specifications: Record<string, string | string[]>
) {
	return {
		description: `${externalReferenceCode} description`,
		externalReferenceCode,
		id: productId + 1000,
		name: externalReferenceCode,
		productId,
		productSpecifications: Object.entries(specifications).flatMap(
			([specificationKey, value]) =>
				(Array.isArray(value) ? value : [value]).map((current) => ({
					specificationKey,
					value: current,
				}))
		),
	} as unknown as DeliveryProduct;
}

function toOrder(order: Partial<PlacedOrder>, productIds: number[]) {
	return {
		orderStatusInfo: {code: 0, label: 'Completed', label_i18n: ''},
		orderTypeExternalReferenceCode: 'DXP_APP',
		...order,
		placedOrderItems: productIds.map((productId) => ({productId})),
	} as unknown as PlacedOrder;
}

const application = toProduct(1, 'PRDCT-APP', {
	'liferay-products-categories': ['Commerce', 'Search'],
	'price-model': 'Paid',
	'project-item-type': 'Application',
	'publisher-name': 'Acme',
});

const product = toProduct(2, 'PRDCT-DXP', {
	'price-model': 'Subscription',
	'project-item-type': 'product',
});

const unknownTypeProduct = toProduct(3, 'PRDCT-OTHER', {
	'project-item-type': 'bundle',
});

const untypedProduct = toProduct(4, 'PRDCT-UNTYPED', {});

const productsByProductId = toProductsByProductId([
	application,
	product,
	unknownTypeProduct,
	untypedProduct,
]);

describe('[MOD-MYACCOUNT-PROJECTS-PROJECTITEMSUTILS] projectItemsUtils', () => {
	it('keys products by product ID', () => {
		expect(productsByProductId.get(2)).toBe(product);
		expect(productsByProductId.size).toBe(4);
	});

	it('groups order items by project item type', () => {
		const itemsByType = toProjectItemsByType(
			[toOrder({createDate: '2026-03-15T12:00:00'}, [1, 2])],
			productsByProductId
		);

		expect([...itemsByType.application.keys()]).toEqual(['PRDCT-APP']);
		expect([...itemsByType.product.keys()]).toEqual(['PRDCT-DXP']);
	});

	it('skips items without a product or without a recognized type', () => {
		const itemsByType = toProjectItemsByType(
			[toOrder({}, [3, 4, 99])],
			productsByProductId
		);

		expect(itemsByType.application.size).toBe(0);
		expect(itemsByType.product.size).toBe(0);
	});

	it('keeps the first order per product external reference code', () => {
		const itemsByType = toProjectItemsByType(
			[
				toOrder({createDate: '2026-01-02T12:00:00'}, [2]),
				toOrder({createDate: '2026-05-06T12:00:00'}, [2]),
			],
			productsByProductId
		);

		expect(itemsByType.product.get('PRDCT-DXP')?.startDate).toBe(
			'Jan 2, 2026'
		);
	});

	it('maps the order and product into a project product', () => {
		const itemsByType = toProjectItemsByType(
			[toOrder({createDate: '2026-03-15T12:00:00'}, [1])],
			productsByProductId
		);

		expect(itemsByType.application.get('PRDCT-APP')).toEqual({
			description: 'PRDCT-APP description',
			externalReferenceCode: 'PRDCT-APP',
			id: '1',
			name: 'PRDCT-APP',
			publisher: 'Acme',
			saleType: 'Paid',
			specifications: application.productSpecifications,
			startDate: 'Mar 15, 2026',
			status: 'completed',
			type: 'Commerce',
		});
	});

	it('leaves the start date empty without a create date', () => {
		const itemsByType = toProjectItemsByType(
			[toOrder({createDate: ''}, [2])],
			productsByProductId
		);

		expect(itemsByType.product.get('PRDCT-DXP')?.startDate).toBe('');
	});

	it('falls back to the active status when the order has no status label', () => {
		const itemsByType = toProjectItemsByType(
			[
				toOrder(
					{orderStatusInfo: {code: 0, label: '', label_i18n: ''}},
					[2]
				),
			],
			productsByProductId
		);

		expect(itemsByType.product.get('PRDCT-DXP')?.status).toBe('active');
	});

	it('uses the price model as the type without a categories specification', () => {
		const itemsByType = toProjectItemsByType(
			[toOrder({}, [2])],
			productsByProductId
		);

		expect(itemsByType.product.get('PRDCT-DXP')?.type).toBe('Subscription');
	});
});
