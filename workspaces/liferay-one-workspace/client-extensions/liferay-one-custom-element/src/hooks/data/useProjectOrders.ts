/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {useMemo} from 'react';

import {OrderCustomFields, getOrderStatusLabel} from '../../enums/Order';
import {Liferay} from '../../liferay/liferay';
import {safeJSONParse} from '../../utils/util';
import {usePlacedOrders} from './usePlacedOrder';

export type ProjectOrder = {
	date: string;
	id: string;
	orderId: string;
	status: string;
	total: string;
};

export type ProductOrderInfo = {
	orderDate: string;
	orderId: string;
	purchaseNumber: string;
	purchasedBy: string;
};

function getProjectName(order: PlacedOrder): string {
	const customFields = order.customFields ?? {};

	const projectName = customFields[OrderCustomFields.PROJECT_NAME];

	if (projectName) {
		return projectName;
	}

	const projects = safeJSONParse<{name: string}[]>(
		customFields[OrderCustomFields.KORONEIKI_PROJECT],
		[]
	);

	return projects[0]?.name ?? '';
}

function getOrderTotal(order: PlacedOrder): string {
	const {summary, totalFormatted} = order as PlacedOrder & {
		summary?: {totalFormatted?: string};
		totalFormatted?: string;
	};

	return summary?.totalFormatted ?? totalFormatted ?? '$0.00';
}

function formatDate(value?: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

// Returns the current account's placed orders, optionally scoped to a single
// project, plus a helper to derive a product's purchase details from the order
// that contains it.

export function useProjectOrders(projectName?: string) {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const {data, error, isLoading} = usePlacedOrders({
		accountId: accountId ?? -1,
		page: 1,
		pageSize: 100,
		shouldFetch: Boolean(accountId),
	});

	const placedOrders = useMemo(
		() =>
			(data?.items ?? []).filter(
				(order) => !projectName || getProjectName(order) === projectName
			),
		[data, projectName]
	);

	const orders = useMemo<ProjectOrder[]>(
		() =>
			placedOrders.map((order) => ({
				date: formatDate(order.createDate),
				id: String(order.id),
				orderId: String(order.id),
				status: getOrderStatusLabel(order),
				total: getOrderTotal(order),
			})),
		[placedOrders]
	);

	return {error, loading: isLoading, orders, placedOrders};
}

export function getProductOrderInfo(
	placedOrders: PlacedOrder[],
	productName: string
): ProductOrderInfo {
	const order = placedOrders.find((placedOrder) =>
		(placedOrder.placedOrderItems ?? []).some(
			(item) => item.name === productName
		)
	);

	if (!order) {
		return {
			orderDate: '',
			orderId: '',
			purchaseNumber: '',
			purchasedBy: '',
		};
	}

	return {
		orderDate: formatDate(order.createDate),
		orderId: String(order.id),
		purchaseNumber:
			(order.customFields ?? {})[OrderCustomFields.ORDER_METADATA] ?? '',
		purchasedBy: order.author ?? '',
	};
}
