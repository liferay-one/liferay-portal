/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessCommerceAdminOrder from '~/services/headless/HeadlessCommerceAdminOrder';

export function useOrderDates(orderIds: number[]): {
	loading: boolean;
	orderDates: Map<number, string>;
} {
	const orderIdsKey = [...orderIds].sort((id1, id2) => id1 - id2).join(',');

	const {data, isLoading} = useSWR(
		orderIdsKey ? ['/admin-orders/order-dates', orderIdsKey] : null,
		([, key]) => {
			const ids = key.split(',').map(Number);

			return HeadlessCommerceAdminOrder.getOrders(
				new URLSearchParams({
					fields: 'id,orderDate',
					filter: SearchBuilder.in('orderId', ids),
					pageSize: String(ids.length),
				})
			);
		},
		{shouldRetryOnError: false}
	);

	const orderDates = useMemo(
		() =>
			new Map(
				(data?.items ?? [])
					.filter((order) => order.orderDate)
					.map((order) => [order.id, order.orderDate as string])
			),
		[data]
	);

	return {loading: isLoading, orderDates};
}
