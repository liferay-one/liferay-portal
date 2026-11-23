/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import {useOrganizationAccess} from '~/hooks/useOrganizationAccess';
import {placedOrdersQuery} from '~/hooks/usePlacedOrder';
import {Liferay} from '~/services/liferay/liferay';

import type {APIResponse} from '~/types/api';
import type {PlacedOrder} from '~/types/orders';

const PAGE_SIZE = 100;

export function useAccountPlacedOrders() {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const channelId = Liferay.CommerceContext?.commerceChannelId;

	const {
		accountExternalReferenceCode,
		loading: organizationAccessLoading,
		organizationAccess,
	} = useOrganizationAccess();

	const portalPlacedOrders = useFetch<APIResponse<PlacedOrder>>(
		accountId &&
			channelId &&
			!organizationAccessLoading &&
			!organizationAccess
			? `/o/headless-commerce-delivery-order/v1.0/channels/${channelId}/accounts/${accountId}/placed-orders`
			: null,
		{
			params: {
				pageSize: PAGE_SIZE,
				sort: 'createDate:desc',
			},
		}
	);

	const organizationPlacedOrders = useDataQuery(
		placedOrdersQuery({
			accountExternalReferenceCode,
			accountId: accountId ?? -1,
			page: 1,
			pageSize: PAGE_SIZE,
			shouldFetch: Boolean(accountId && organizationAccess),
		})
	);

	const {data, error, isLoading} = organizationAccess
		? organizationPlacedOrders
		: portalPlacedOrders;

	return {
		data,
		error,
		isLoading: organizationAccessLoading || isLoading,
		organizationAccess,
		organizationAccessLoading,
	};
}
