/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import {ProductSpecificationKey, SolutionTypes} from '~/enums/Product';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';
import {getProductSpecificationValue} from '~/utils/productUtils';

const useSSAProduct = () => {
	const commerceChannelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(
		commerceChannelId ? `/ssa-product/${commerceChannelId}` : null,
		async () => {
			const {items} =
				await HeadlessCommerceDeliveryCatalog.getProductsPage(
					commerceChannelId,
					new URLSearchParams({
						'accountId': '-1',
						'attachments.accountId': '-1',
						'filter': new SearchBuilder()
							.lambda(
								'specificationValues',
								SolutionTypes.PRE_BUILT_TRIAL
							)
							.build(),
						'images.accountId': '-1',
						'nestedFields':
							'attachments,categories,images,productSpecifications,skus',
						'pageSize': '20',
						'productSpecifications.pageSize': '-1',
						'skus.accountId': '-1',
						'skus.currencyCode':
							Liferay.CommerceContext.currency.currencyCode,
					})
				);

			return items?.find(
				(item) =>
					getProductSpecificationValue(
						ProductSpecificationKey.SOLUTION_TYPE,
						item
					) === SolutionTypes.PRE_BUILT_TRIAL
			);
		}
	);
};

export {useSSAProduct};
