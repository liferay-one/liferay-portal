/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

import useAccountSKUs from './useAccountSKUs';

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-PRODUCTPURCHASE-USEACCOUNTSKUS] useAccountSKUs', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Liferay.CommerceContext.commerceChannelId = '42';

		vi.spyOn(
			HeadlessCommerceDeliveryCatalog,
			'getProductSKUsPage'
		).mockImplementation(((
			_channelId: string,
			_productId: string,
			searchParams: URLSearchParams
		) =>
			Promise.resolve({
				items: [
					{
						id: 1,
						price: {
							price: 87.8526,
							priceFormatted: `€ 87.85 (${searchParams.get('accountId')})`,
						},
					},
				],
			})) as unknown as typeof HeadlessCommerceDeliveryCatalog.getProductSKUsPage);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.restoreAllMocks();
	});

	it('does not fetch the SKUs when no account is selected', () => {
		const {result} = renderHook(() => useAccountSKUs(7), {wrapper});

		expect(result.current.data).toBeUndefined();
		expect(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).not.toHaveBeenCalled();
	});

	it('fetches the SKUs again with the prices of the account that is selected', async () => {
		const {rerender, result} = renderHook(
			({accountId}: {accountId: number}) => useAccountSKUs(7, accountId),
			{initialProps: {accountId: 10}, wrapper}
		);

		await waitFor(() =>
			expect(result.current.data?.items[0].price.priceFormatted).toBe(
				'€ 87.85 (10)'
			)
		);

		rerender({accountId: 11});

		await waitFor(() =>
			expect(result.current.data?.items[0].price.priceFormatted).toBe(
				'€ 87.85 (11)'
			)
		);

		expect(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).toHaveBeenCalledWith('42', 7, expect.any(URLSearchParams));
	});
});
