/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import {useOneContext} from '~/context/OneContextProvider';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

const useSSAProduct = () => {
	const {properties} = useOneContext();

	const commerceChannelId = Liferay.CommerceContext.commerceChannelId;
	const externalReferenceCode = properties.ssaProductExternalReferenceCode;

	return useSWR(
		commerceChannelId && externalReferenceCode
			? `/ssa-product/${commerceChannelId}/${externalReferenceCode}`
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
							externalReferenceCode
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

export {useSSAProduct};
