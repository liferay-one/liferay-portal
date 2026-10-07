/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

const useDeliveryProductByExternalReferenceCode = (
	externalReferenceCode?: string
) => {
	const commerceChannelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(
		commerceChannelId && externalReferenceCode
			? `/delivery-product-by-erc/${commerceChannelId}/${externalReferenceCode}`
			: null,
		async () => {
			const {items} =
				await HeadlessCommerceDeliveryCatalog.getProductsPage(
					commerceChannelId,
					new URLSearchParams({
						'accountId': '-1',
						'attachments.accountId': '-1',
						'filter': SearchBuilder.eq(
							'externalReferenceCode',
							externalReferenceCode as string
						),
						'images.accountId': '-1',
						'nestedFields':
							'attachments,categories,images,productSpecifications,skus',
						'pageSize': '1',
						'productSpecifications.pageSize': '-1',
						'skus.accountId': '-1',
						'skus.currencyCode':
							Liferay.CommerceContext.currency.currencyCode,
					})
				);

			return items?.[0];
		}
	);
};

export {useDeliveryProductByExternalReferenceCode};
