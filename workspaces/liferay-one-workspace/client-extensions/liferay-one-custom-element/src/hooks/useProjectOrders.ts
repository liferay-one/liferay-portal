/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {useMemo} from 'react';
import {Liferay} from '~/services/liferay/liferay';
import {OrderCustomFields, getOrderStatusToken} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

import {usePlacedOrders} from './usePlacedOrder';

import type {PlacedOrder, VirtualItem} from '~/types/orders';

const PAGE_SIZE = 200;

const RESTRICTED_ORDER_FIELDS = [
	'account',
	'attachments',
	'channelId',
	'couponCode',
	'lastPriceUpdateDate',
	'modifiedDate',
	'name',
	'orderType',
	'orderUUID',
	'paymentMethod',
	'paymentStatus',
	'paymentStatusInfo',
	'paymentStatusLabel',
	'placedOrderBillingAddressId',
	'placedOrderItems.adaptiveMediaImageHTMLTag',
	'placedOrderItems.customFields',
	'placedOrderItems.deliveryGroup',
	'placedOrderItems.deliveryGroupName',
	'placedOrderItems.externalReferenceCode',
	'placedOrderItems.options',
	'placedOrderItems.parentOrderItemId',
	'placedOrderItems.price.currency',
	'placedOrderItems.price.discount',
	'placedOrderItems.price.discountFormatted',
	'placedOrderItems.price.discountPercentage',
	'placedOrderItems.price.discountPercentageLevel1',
	'placedOrderItems.price.discountPercentageLevel2',
	'placedOrderItems.price.discountPercentageLevel3',
	'placedOrderItems.price.discountPercentageLevel4',
	'placedOrderItems.price.finalPrice',
	'placedOrderItems.price.finalPriceFormatted',
	'placedOrderItems.price.priceFormatted',
	'placedOrderItems.price.promoPrice',
	'placedOrderItems.productURLs',
	'placedOrderItems.quantity',
	'placedOrderItems.replacedSku',
	'placedOrderItems.settings',
	'placedOrderItems.shippingAddressId',
	'placedOrderItems.sku',
	'placedOrderItems.skuId',
	'placedOrderItems.subscription',
	'placedOrderItems.unitOfMeasureKey',
	'placedOrderItems.virtualItemURLs',
	'placedOrderShippingAddressId',
	'printedNote',
	'shippingOption',
	'steps',
	'summary.currency',
	'summary.itemsCount',
	'summary.itemsQuantity',
	'summary.shippingDiscountPercentages',
	'summary.shippingDiscountValue',
	'summary.shippingDiscountValueFormatted',
	'summary.shippingValue',
	'summary.shippingValueFormatted',
	'summary.shippingValueWithTaxAmount',
	'summary.shippingValueWithTaxAmountFormatted',
	'summary.subtotal',
	'summary.subtotalDiscountPercentages',
	'summary.subtotalDiscountValue',
	'summary.subtotalDiscountValueFormatted',
	'summary.subtotalFormatted',
	'summary.taxValue',
	'summary.taxValueFormatted',
	'summary.total',
	'summary.totalDiscountPercentages',
	'summary.totalDiscountValue',
	'summary.totalDiscountValueFormatted',
].join(',');

export type ProjectOrder = {
	date: string;
	id: string;
	orderId: string;
	status: string;
	total: string;
};

export type ProductOrderInfo = {
	environment: ProductEnvironmentInfo;
	orderDate: string;
	orderId: string;
	orderType: string;
	purchaseNumber: string;
	purchasedBy: string;
	status: string;
};

export type ProductEnvironmentInfo = {
	cloudProjectName: string;
	projectName: string;
};

export function getProjectName(order: PlacedOrder): string {
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

export function useProjectOrders(projectName?: string) {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const {data, error, isLoading} = usePlacedOrders({
		accountId: accountId ?? -1,
		fetchAllPages: true,
		page: 1,
		pageSize: PAGE_SIZE,
		restrictFields: RESTRICTED_ORDER_FIELDS,
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
				status: getOrderStatusToken(order),
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
			environment: {
				cloudProjectName: '',
				projectName: '',
			},
			orderDate: '',
			orderId: '',
			orderType: '',
			purchaseNumber: '',
			purchasedBy: '',
			status: '',
		};
	}

	const customFields = order.customFields ?? {};

	return {
		environment: {
			cloudProjectName:
				customFields[OrderCustomFields.CLOUD_PROJECT_NAME] ?? '',
			projectName: customFields[OrderCustomFields.PROJECT_NAME] ?? '',
		},
		orderDate: formatDate(order.createDate),
		orderId: String(order.id),
		orderType: order.orderTypeExternalReferenceCode ?? '',
		purchaseNumber: order.purchaseOrderNumber ?? '',
		purchasedBy: order.author ?? '',
		status: getOrderStatusToken(order),
	};
}

export function getProductVirtualItems(
	placedOrders: PlacedOrder[],
	productName: string
): VirtualItem[] {
	for (const placedOrder of placedOrders) {
		const placedOrderItem = (placedOrder.placedOrderItems ?? []).find(
			(item) => item.name === productName
		);

		if (placedOrderItem) {
			return placedOrderItem.virtualItems ?? [];
		}
	}

	return [];
}
