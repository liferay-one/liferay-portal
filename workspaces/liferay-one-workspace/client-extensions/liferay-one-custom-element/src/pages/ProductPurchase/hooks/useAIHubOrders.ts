/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';

const useAIHubOrders = (accountId?: number) => {
	const channelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(
		accountId && channelId
			? `/ai-hub-orders/${channelId}/${accountId}`
			: null,
		async () => {
			const {items} = await HeadlessCommerceDeliveryOrder.getPlacedOrders(
				channelId,
				accountId as number,
				new URLSearchParams({
					filter: SearchBuilder.eq(
						'orderTypeExternalReferenceCode',
						'AI_HUB'
					),
					pageSize: '1',
				})
			);

			return items ?? [];
		}
	);
};

export default useAIHubOrders;
