/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

const useChannelCurrencies = () =>
	useSWR('/channel-currencies', () =>
		HeadlessCommerceDeliveryCatalog.getChannelCurrenciesPage(
			Liferay.CommerceContext.commerceChannelId,
			new URLSearchParams({pageSize: '100'})
		)
	);

export default useChannelCurrencies;
