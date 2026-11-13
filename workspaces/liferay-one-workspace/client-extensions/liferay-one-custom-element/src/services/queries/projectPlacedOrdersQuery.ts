/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import Projects from '~/services/spring-boot/Projects';

import type {APIResponse, DataQuery} from '~/types/api';
import type {PlacedOrder} from '~/types/orders';

export const RESTRICTED_ORDER_FIELDS = [
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

export function projectPlacedOrdersQuery(
	projectExternalReferenceCode?: string
): DataQuery<APIResponse<PlacedOrder>> {
	const shouldFetch = Boolean(
		projectExternalReferenceCode &&
			!isUnassignedProject(projectExternalReferenceCode)
	);

	return {
		fetcher: () =>
			Projects.getPlacedOrders(
				projectExternalReferenceCode as string,
				RESTRICTED_ORDER_FIELDS
			),
		key: shouldFetch
			? `/project-placed-orders/${projectExternalReferenceCode}`
			: null,
	};
}
