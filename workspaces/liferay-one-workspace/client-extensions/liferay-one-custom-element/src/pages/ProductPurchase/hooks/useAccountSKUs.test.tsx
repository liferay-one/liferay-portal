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
		const {result} = renderHook(
			() => useAccountSKUs(undefined, undefined, 7),
			{wrapper}
		);

		expect(result.current.data).toBeUndefined();
		expect(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).not.toHaveBeenCalled();
	});

	it('fetches the SKUs again with the prices of the account that is selected', async () => {
		const {rerender, result} = renderHook(
			({accountId}: {accountId: number}) =>
				useAccountSKUs(accountId, undefined, 7),
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

	it('returns no SKUs of the previous account while the SKUs of the new account load', async () => {
		const {rerender, result} = renderHook(
			({accountId}: {accountId: number}) =>
				useAccountSKUs(accountId, undefined, 7),
			{initialProps: {accountId: 10}, wrapper}
		);

		await waitFor(() => expect(result.current.data).toBeDefined());

		vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).mockReturnValue(new Promise(() => {}) as never);

		rerender({accountId: 11});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeUndefined();
	});

	it('keeps the SKUs of the same account while the SKUs in another currency load', async () => {
		const {rerender, result} = renderHook(
			({currencyCode}: {currencyCode?: string}) =>
				useAccountSKUs(10, currencyCode, 7),
			{
				initialProps: {currencyCode: undefined as string | undefined},
				wrapper,
			}
		);

		await waitFor(() => expect(result.current.data).toBeDefined());

		vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).mockReturnValue(new Promise(() => {}) as never);

		rerender({currencyCode: 'USD'});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.data?.items[0].price.priceFormatted).toBe(
			'€ 87.85 (10)'
		);
	});

	it('returns no SKUs when the SKUs of the account cannot be loaded', async () => {
		const {rerender, result} = renderHook(
			({accountId}: {accountId: number}) =>
				useAccountSKUs(accountId, undefined, 7),
			{initialProps: {accountId: 10}, wrapper}
		);

		await waitFor(() => expect(result.current.data).toBeDefined());

		vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).mockRejectedValue(new Error('Unavailable'));

		rerender({accountId: 11});

		await waitFor(() => expect(result.current.error).toBeDefined());

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});

	it('asks for the prices in the currency of the billing address when one is given', async () => {
		const {result} = renderHook(() => useAccountSKUs(10, 'USD', 7), {
			wrapper,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());

		const searchParams = vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).mock.calls[0][2];

		expect(searchParams?.get('accountId')).toBe('10');
		expect(searchParams?.get('currencyCode')).toBe('USD');
	});

	it('leaves the currency to the account when no currency is given', async () => {
		const {result} = renderHook(() => useAccountSKUs(10, undefined, 7), {
			wrapper,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());

		const searchParams = vi.mocked(
			HeadlessCommerceDeliveryCatalog.getProductSKUsPage
		).mock.calls[0][2];

		expect(searchParams?.has('currencyCode')).toBe(false);
	});
});
