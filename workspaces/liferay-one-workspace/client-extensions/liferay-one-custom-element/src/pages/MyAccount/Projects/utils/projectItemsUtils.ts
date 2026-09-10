/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {
	ProjectProduct,
	getSpecificationValue,
	getSpecificationValues,
} from '~/hooks/useProjectCommerce';
import {getOrderStatusToken} from '~/utils/orderUtils';

import {resolveProjectItemType} from './resolveProjectItemType';

import type {PlacedOrder} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';

import type {ProjectItemType} from '../types';

export type ProjectItemsByType = Record<
	ProjectItemType,
	Map<string, ProjectProduct>
>;

export function toProductsByProductId(products: DeliveryProduct[]) {
	return new Map(products.map((product) => [product.productId, product]));
}

function toProjectProduct(
	order: PlacedOrder,
	product: DeliveryProduct
): ProjectProduct {
	return {
		description: product.description,
		externalReferenceCode: product.externalReferenceCode,
		id: String(product.productId ?? product.id),
		name: product.name,
		publisher: getSpecificationValue(product, 'publisher-name'),
		saleType: getSpecificationValue(product, 'price-model'),
		specifications: product.productSpecifications ?? [],
		startDate: order.createDate
			? format(new Date(order.createDate), 'MMM d, yyyy')
			: '',
		status: getOrderStatusToken(order) || 'active',
		type:
			getSpecificationValues(product, 'liferay-products-categories')[0] ??
			getSpecificationValue(product, 'price-model'),
	};
}

export function toProjectItemsByType(
	orders: PlacedOrder[],
	productsByProductId: ReturnType<typeof toProductsByProductId>
): ProjectItemsByType {
	const itemsByProjectItemType: ProjectItemsByType = {
		application: new Map(),
		product: new Map(),
	};

	for (const order of orders) {
		for (const placedOrderItem of order.placedOrderItems ?? []) {
			const product = productsByProductId.get(placedOrderItem.productId);

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

			if (!items.has(product.externalReferenceCode)) {
				items.set(
					product.externalReferenceCode,
					toProjectProduct(order, product)
				);
			}
		}
	}

	return itemsByProjectItemType;
}
