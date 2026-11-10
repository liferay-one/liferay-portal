/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import {useCurrentAccount} from '~/hooks/useAccounts';
import Accounts from '~/services/spring-boot/Accounts';

export function useOrderDates(): {
	loading: boolean;
	orderDates: Map<number, string>;
} {
	const {data: account, isLoading: accountLoading} = useCurrentAccount();

	const accountExternalReferenceCode = account?.externalReferenceCode;

	const {data, isLoading} = useSWR(
		accountExternalReferenceCode
			? [
					'/accounts/commerce-orders/order-dates',
					accountExternalReferenceCode,
				]
			: null,
		([, externalReferenceCode]) =>
			Accounts.getCommerceOrdersOrderDates(externalReferenceCode),
		{shouldRetryOnError: false}
	);

	const orderDates = useMemo(
		() =>
			new Map(
				Object.entries(data ?? {})
					.filter(([, orderDate]) => typeof orderDate === 'string')
					.map(([orderId, orderDate]) => [Number(orderId), orderDate])
			),
		[data]
	);

	return {loading: accountLoading || isLoading, orderDates};
}
