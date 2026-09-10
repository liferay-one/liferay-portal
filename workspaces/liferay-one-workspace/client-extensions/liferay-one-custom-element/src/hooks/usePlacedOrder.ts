/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR, {SWRConfiguration} from 'swr';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';

const channelId = Liferay.CommerceContext.commerceChannelId;

const MAX_PAGES = 20;

type Props = {
	accountId: number | string;
	fetchAllPages?: boolean;
	filter?: string;
	orderTypeExternalReferenceCodes?: string[];
	page: number;
	pageSize: number;
	shouldFetch?: boolean;
};

const usePlacedOrder = (
	orderId: number | string,
	swrOptions?: SWRConfiguration
) =>
	useSWR(
		orderId ? `/placed-order/${orderId}` : null,
		async () => HeadlessCommerceDeliveryOrder.getPlacedOrder(orderId),
		swrOptions
	);

const usePlacedOrders = ({
	accountId,
	fetchAllPages = false,
	filter,
	orderTypeExternalReferenceCodes,
	page,
	pageSize,
	shouldFetch = true,
}: Props) =>
	useSWR(
		shouldFetch
			? `/placed-orders/${accountId}/${page}/${pageSize}/${fetchAllPages}/${filter ?? ''}`
			: null,
		async () => {
			const getPage = (currentPage: number) =>
				HeadlessCommerceDeliveryOrder.getPlacedOrders(
					channelId,
					accountId,
					new URLSearchParams({
						...(filter && {filter}),
						nestedFields: 'placedOrderItems',
						page: currentPage.toString(),
						pageSize: pageSize.toString(),
						sort: 'createDate:desc',
					})
				);

			const response = await getPage(page);

			const items = [...response.items];

			if (fetchAllPages && response.totalCount > items.length) {
				const lastPage = Math.min(
					Math.ceil(response.totalCount / pageSize),
					page + MAX_PAGES - 1
				);

				const remainingPages = await Promise.all(
					Array.from({length: lastPage - page}, (_, index) =>
						getPage(page + index + 1)
					)
				);

				remainingPages.forEach((remainingPage) =>
					items.push(...remainingPage.items)
				);
			}

			return {
				...response,
				items: items.filter(({orderTypeExternalReferenceCode}) =>
					orderTypeExternalReferenceCodes?.length
						? orderTypeExternalReferenceCodes.includes(
								orderTypeExternalReferenceCode
							)
						: true
				),
			};
		}
	);

export {usePlacedOrder, usePlacedOrders};
