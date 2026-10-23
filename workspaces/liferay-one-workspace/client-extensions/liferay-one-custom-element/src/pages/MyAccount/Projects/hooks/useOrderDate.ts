/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import HeadlessCommerceAdminOrder from '~/services/headless/HeadlessCommerceAdminOrder';

export function useOrderDate(orderId: string): {
	loading: boolean;
	orderDate?: string;
} {
	const {data, isLoading} = useSWR(
		orderId ? `/admin-order/${orderId}/order-date` : null,
		() =>
			HeadlessCommerceAdminOrder.getOrder(
				orderId,
				new URLSearchParams({fields: 'orderDate'})
			),
		{shouldRetryOnError: false}
	);

	return {loading: isLoading, orderDate: data?.orderDate};
}
