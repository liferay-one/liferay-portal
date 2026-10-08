/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

const useAccountSKUs = (
	accountId: number | undefined,
	currencyCode: string | undefined,
	productId: number | string
) => {
	const {data, error, isLoading} = useSWR(
		accountId
			? `/account-skus/${accountId}/${productId}/${currencyCode ?? ''}`
			: null,
		async () => ({
			accountId,
			skusPage: await HeadlessCommerceDeliveryCatalog.getProductSKUsPage(
				Liferay.CommerceContext.commerceChannelId,
				productId,
				new URLSearchParams({
					accountId: String(accountId),
					...(currencyCode && {currencyCode}),
				})
			),
		}),
		{keepPreviousData: true}
	);

	const isAccountData = !error && data?.accountId === accountId;

	return {
		data: isAccountData ? data?.skusPage : undefined,
		error,
		isLoading,
	};
};

export default useAccountSKUs;
