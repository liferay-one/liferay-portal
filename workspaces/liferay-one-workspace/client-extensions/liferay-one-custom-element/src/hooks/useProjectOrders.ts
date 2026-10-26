/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {useMemo} from 'react';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {Liferay} from '~/services/liferay/liferay';
import {OrderTypes} from '~/types/orders';
import {getOptionValueNames} from '~/utils/orderItemOptionUtils';
import {
	OrderCustomFields,
	getOrderStatusToken,
	getProjectItemStatusToken,
} from '~/utils/orderUtils';
import {safeJSONParse} from '~/utils/safeJSONParse';

import {placedOrdersQuery, usePlacedOrders} from './usePlacedOrder';

import type {
	ProjectItemType,
	UserProject,
} from '~/pages/MyAccount/Projects/types';
import type {AnalyticsProject} from '~/types/analytics';
import type {PlacedOrder, PlacedOrderItems, VirtualItem} from '~/types/orders';

const MACHINE_TYPE_OPTION_KEY = 'machinetype';

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
	'placedOrderItems.deliveryGroup',
	'placedOrderItems.deliveryGroupName',
	'placedOrderItems.externalReferenceCode',
	'placedOrderItems.parentOrderItemId',
	'placedOrderItems.price',
	'placedOrderItems.productURLs',
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
	itemName: string;
	orderDate: string;
	orderId: string;
	orderType: string;
	purchaseNumber: string;
	purchasedBy: string;
	quantity: string;
	status: string;
};

export type ProductOrderItem = {
	id: number;
	optionValueNames: string[];
	tierName: string;
};

export type ProductEnvironmentInfo = {
	cloudProjectName: string;
	ldpDataSourceAccessToken: string;
	projectName: string;
};

type OrderWithCustomFields = {
	customFields?: {[key: string]: string};
};

export type OrderProject = Pick<UserProject, 'externalReferenceCode' | 'name'>;

export function getProjectExternalReferenceCode(
	order: OrderWithCustomFields
): string {
	const customFields = order.customFields ?? {};

	const salesforceProjectId =
		customFields[OrderCustomFields.SALESFORCE_PROJECT_ID];

	if (salesforceProjectId) {
		return salesforceProjectId;
	}

	const orderMetadata = safeJSONParse<{salesforceProjectId?: string}>(
		customFields[OrderCustomFields.ORDER_METADATA],
		{}
	);

	return orderMetadata.salesforceProjectId ?? '';
}

export function getProjectName(order: OrderWithCustomFields): string {
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

export function hasProject(order: OrderWithCustomFields): boolean {
	return Boolean(
		getProjectExternalReferenceCode(order) || getProjectName(order)
	);
}

export function isProjectOrder(
	order: OrderWithCustomFields,
	project: OrderProject
): boolean {
	if (isUnassignedProject(project.externalReferenceCode)) {
		return !hasProject(order);
	}

	const projectExternalReferenceCode = getProjectExternalReferenceCode(order);

	if (projectExternalReferenceCode) {
		return projectExternalReferenceCode === project.externalReferenceCode;
	}

	return getProjectName(order) === project.name;
}

function getOrderTotal(order: PlacedOrder): string {
	const {summary, totalFormatted} = order as PlacedOrder & {
		summary?: {totalFormatted?: string};
		totalFormatted?: string;
	};

	return summary?.totalFormatted ?? totalFormatted ?? '$0.00';
}

function getTierName(placedOrderItem: PlacedOrderItems): string {
	const options = safeJSONParse<
		{key?: string; skuOptionValueNames?: string[]}[]
	>(placedOrderItem.options || null, []);

	const skuOption = (Array.isArray(options) ? options : []).find(
		(option) =>
			option.key !== MACHINE_TYPE_OPTION_KEY &&
			option.skuOptionValueNames?.length
	);

	return skuOption?.skuOptionValueNames?.[0] ?? placedOrderItem.name;
}

function formatDate(value?: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

function toProjectOrdersProps(accountId?: number | string | null) {
	return {
		accountId: accountId ?? -1,
		fetchAllPages: true,
		page: 1,
		pageSize: PAGE_SIZE,
		restrictFields: RESTRICTED_ORDER_FIELDS,
		shouldFetch: Boolean(accountId),
	};
}

export function projectOrdersQuery(accountId?: number | string | null) {
	return placedOrdersQuery(toProjectOrdersProps(accountId));
}

function hasProduct(order: PlacedOrder, productId: number): boolean {
	return (order.placedOrderItems ?? []).some(
		(placedOrderItem) => placedOrderItem.productId === productId
	);
}

export function useProjectOrders(project?: OrderProject, productId?: number) {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const {data, error, isLoading} = usePlacedOrders(
		toProjectOrdersProps(accountId)
	);

	const placedOrders = useMemo(
		() =>
			(data?.items ?? []).filter(
				(order) =>
					(!project || isProjectOrder(order, project)) &&
					(productId === undefined || hasProduct(order, productId))
			),
		[data, productId, project]
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

export function getProductOrder(
	placedOrders: PlacedOrder[],
	productId: number
): PlacedOrder | undefined {
	return placedOrders.find(
		(placedOrder) =>
			placedOrder.orderTypeExternalReferenceCode !== 'AI_HUB_TOKEN' &&
			(placedOrder.placedOrderItems ?? []).some(
				(item) => item.productId === productId
			)
	);
}

function getProductOrderItems(
	placedOrders: PlacedOrder[],
	productId: number
): PlacedOrderItems[] {
	return placedOrders
		.filter(
			(placedOrder) =>
				placedOrder.orderTypeExternalReferenceCode !==
				OrderTypes.AI_HUB_TOKEN
		)
		.flatMap((placedOrder) =>
			(placedOrder.placedOrderItems ?? []).filter(
				(item) => item.productId === productId
			)
		);
}

export function getProductEnvironmentOrderItems(
	placedOrders: PlacedOrder[],
	productId: number
): ProductOrderItem[] {
	return getProductOrderItems(placedOrders, productId).map((item) => ({
		id: item.id,
		optionValueNames: getOptionValueNames(item.options),
		tierName: getTierName(item),
	}));
}

export function getProductOrderInfo(
	itemType: ProjectItemType,
	placedOrders: PlacedOrder[],
	productId: number
): ProductOrderInfo {
	const order = getProductOrder(placedOrders, productId);

	if (!order) {
		return {
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
			status: '',
		};
	}

	const customFields = order.customFields ?? {};

	const placedOrderItems = (order.placedOrderItems ?? []).filter(
		(item) => item.productId === productId
	);

	const quantity = placedOrderItems.reduce(
		(total, item) => total + (item.quantity ?? 0),
		0
	);

	const ldpAnalyticsCloudProject = safeJSONParse<Partial<AnalyticsProject>>(
		customFields[OrderCustomFields.LDP_ANALYTICS_CLOUD_PROJECT] ?? null,
		{}
	);

	return {
		environment: {
			cloudProjectName:
				customFields[OrderCustomFields.CLOUD_PROJECT_NAME] ?? '',
			ldpDataSourceAccessToken:
				ldpAnalyticsCloudProject.dataSourceAccessToken ?? '',
			projectName: customFields[OrderCustomFields.PROJECT_NAME] ?? '',
		},
		itemName: [...new Set(placedOrderItems.map(getTierName))].join(', '),
		orderDate: formatDate(order.createDate),
		orderId: String(order.id),
		orderType: order.orderTypeExternalReferenceCode ?? '',
		purchaseNumber: order.purchaseOrderNumber ?? '',
		purchasedBy:
			order.orderTypeExternalReferenceCode === OrderTypes.SALESFORCE
				? ''
				: order.author ?? '',
		quantity: quantity ? String(quantity) : '',
		status: getProjectItemStatusToken(
			itemType,
			order,
			getProductOrderItems(placedOrders, productId)
		),
	};
}

export function getProductVirtualItems(
	placedOrders: PlacedOrder[],
	productId: number
): VirtualItem[] {
	for (const placedOrder of placedOrders) {
		const placedOrderItem = (placedOrder.placedOrderItems ?? []).find(
			(item) => item.productId === productId
		);

		if (placedOrderItem) {
			return placedOrderItem.virtualItems ?? [];
		}
	}

	return [];
}
