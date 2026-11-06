/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMarketplaceContext} from '~/context/MarketplaceContextProvider';

export default function usePublisherPermissions() {
	const {marketplaceUserAccount} = useMarketplaceContext();

	const isAdmin = Boolean(marketplaceUserAccount?.isAdmin);

	return {
		canPublishApps:
			isAdmin || Boolean(marketplaceUserAccount?.isAppPublisher),
		canPublishSolutions:
			isAdmin || Boolean(marketplaceUserAccount?.isSolutionPublisher),
	};
}
