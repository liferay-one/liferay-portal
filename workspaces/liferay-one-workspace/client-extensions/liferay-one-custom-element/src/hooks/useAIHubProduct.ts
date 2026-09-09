/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import {SolutionTypes} from '~/enums/Product';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';

const useAIHubProduct = () => {
	const commerceChannelId = Liferay.CommerceContext.commerceChannelId;

	return useSWR(
		commerceChannelId ? `/ai-hub-product/${commerceChannelId}` : null,
		async () => {
			const {items} =
				await HeadlessCommerceDeliveryCatalog.getProductsPage(
					commerceChannelId,
					new URLSearchParams({
						accountId: '-1',
						filter: new SearchBuilder()
							.lambda('specificationValues', SolutionTypes.AI_HUB)
							.build(),
						nestedFields: 'productSpecifications',
						pageSize: '1',
					})
				);

			return items?.[0];
		}
	);
};

export {useAIHubProduct};
