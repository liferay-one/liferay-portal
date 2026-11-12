/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {
	formatShortDate,
	formatUTCShortDate,
	toUTCCalendarDate,
} from '~/utils/dateUtils';
import {
	getContractProductOrders,
	getEarliestPlacedOrderItemStartDate,
	getProjectItemStatusToken,
} from '~/utils/orderUtils';
import {
	getProductPublisherName,
	getProductSpecificationValue,
	getProductSpecificationValues,
} from '~/utils/productUtils';

import {resolveProjectItemType} from './resolveProjectItemType';

import type {PlacedOrder, PlacedOrderItems} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

import type {ProjectItemType} from '../types';

export type ProjectItemsByType = Record<
	ProjectItemType,
	Map<string, ProjectProduct>
>;

export function toProductsByProductId(products: DeliveryProduct[]) {
	return new Map(products.map((product) => [product.productId, product]));
}

function formatStartDate(
	order: PlacedOrder,
	orderDates: Map<number, string>,
	placedOrderItems: PlacedOrderItems[]
): string {
	const startDate = getEarliestPlacedOrderItemStartDate(placedOrderItems);

	if (startDate) {
		return formatUTCShortDate(startDate);
	}

	const orderDate = orderDates.get(order.id);

	if (orderDate) {
		return formatShortDate(toUTCCalendarDate(orderDate));
	}

	return formatUTCShortDate(order.createDate);
}

function toProjectProduct(
	itemType: ProjectItemType,
	order: PlacedOrder,
	orderDates: Map<number, string>,
	placedOrderItems: PlacedOrderItems[],
	product: DeliveryProduct
): ProjectProduct {
	return {
		externalReferenceCode: product.externalReferenceCode,
		id: String(product.productId ?? product.id),
		name: product.name,
		publisher: getProductPublisherName(product),
		saleType: getProductSpecificationValue('price-model', product),
		specifications: product.productSpecifications ?? [],
		startDate: formatStartDate(order, orderDates, placedOrderItems),
		status: getProjectItemStatusToken(itemType, order, placedOrderItems),
		type:
			getProductSpecificationValues(
				'liferay-product-categories',
				product
			)[0] ?? getProductSpecificationValue('price-model', product),
	};
}

export function toProjectItemsByType(
	orders: PlacedOrder[],
	productsByProductId: ReturnType<typeof toProductsByProductId>,
	contractId?: number,
	orderDates: Map<number, string> = new Map()
): ProjectItemsByType {
	const itemsByProjectItemType: ProjectItemsByType = {
		application: new Map(),
		product: new Map(),
	};

	const ordersByProductId = new Map<number, PlacedOrder[]>();

	for (const order of orders) {
		for (const {productId} of order.placedOrderItems ?? []) {
			const productOrders = ordersByProductId.get(productId) ?? [];

			if (productOrders.at(-1) !== order) {
				productOrders.push(order);
			}

			ordersByProductId.set(productId, productOrders);
		}
	}

	for (const [productId, productOrders] of ordersByProductId) {
		const product = productsByProductId.get(productId);

		if (!product) {
			continue;
		}

		const projectItemType = resolveProjectItemType(
			product.productSpecifications ?? []
		);

		if (!projectItemType) {
			continue;
		}

		const items = itemsByProjectItemType[projectItemType];

		if (items.has(product.externalReferenceCode)) {
			continue;
		}

		const contractOrders = getContractProductOrders(
			productOrders,
			productId,
			contractId
		);

		items.set(
			product.externalReferenceCode,
			toProjectProduct(
				projectItemType,
				contractOrders[0],
				orderDates,
				contractOrders.flatMap((order) =>
					(order.placedOrderItems ?? []).filter(
						(placedOrderItem) =>
							placedOrderItem.productId === productId
					)
				),
				product
			)
		);
	}

	return itemsByProjectItemType;
}
