/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {formatShortDate} from '~/utils/dateUtils';
import {
	getContractProductOrders,
	getPlacedOrderItemDate,
	getProductStatusToken,
} from '~/utils/orderUtils';
import {
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
	placedOrderItems: PlacedOrderItems[]
): string {
	const [startDate] = placedOrderItems
		.map((placedOrderItem) =>
			getPlacedOrderItemDate(placedOrderItem, 'startDate')
		)
		.filter((date): date is Date => date !== undefined)
		.sort((date1, date2) => date1.getTime() - date2.getTime());

	if (startDate) {
		return formatShortDate(startDate);
	}

	return order.createDate ? formatShortDate(new Date(order.createDate)) : '';
}

function toProjectProduct(
	order: PlacedOrder,
	placedOrderItems: PlacedOrderItems[],
	product: DeliveryProduct
): ProjectProduct {
	return {
		externalReferenceCode: product.externalReferenceCode,
		id: String(product.productId ?? product.id),
		name: product.name,
		publisher: getProductSpecificationValue('publisher-name', product),
		saleType: getProductSpecificationValue('price-model', product),
		specifications: product.productSpecifications ?? [],
		startDate: formatStartDate(order, placedOrderItems),
		status: getProductStatusToken(order, placedOrderItems) || 'active',
		type:
			getProductSpecificationValues(
				'liferay-products-categories',
				product
			)[0] ?? getProductSpecificationValue('price-model', product),
	};
}

export function toProjectItemsByType(
	orders: PlacedOrder[],
	productsByProductId: ReturnType<typeof toProductsByProductId>,
	contractId?: number
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
				contractOrders[0],
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
