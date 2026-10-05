/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

import {useSSAProduct} from './useSSAProduct';

function mockProductsPage(response: unknown) {
	return vi
		.spyOn(HeadlessCommerceDeliveryCatalog, 'getProductsPage')
		.mockResolvedValue(
			response as Awaited<
				ReturnType<
					typeof HeadlessCommerceDeliveryCatalog.getProductsPage
				>
			>
		);
}

function product(id: number, solutionType: string) {
	return {
		id,
		productSpecifications: [
			{specificationKey: 'solution-type', value: solutionType},
		],
	};
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USESSAPRODUCT] useSSAProduct', () => {
	beforeEach(() => {
		Liferay.CommerceContext.commerceChannelId = '42';
		Liferay.CommerceContext.currency = {
			currencyCode: 'USD',
			currencyId: '1',
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends no request without a channel ID', async () => {
		Liferay.CommerceContext.commerceChannelId = '';

		const getProductsPage = mockProductsPage({items: []});

		const {result} = renderHook(() => useSSAProduct(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getProductsPage).not.toHaveBeenCalled();
	});

	it('returns the first item whose solution type is the pre built trial', async () => {
		const getProductsPage = mockProductsPage({
			items: [
				product(1, 'ai-hub'),
				product(2, 'pre-built-trial'),
				product(3, 'pre-built-trial'),
			],
		});

		const {result} = renderHook(() => useSSAProduct(), {wrapper});

		await waitFor(() =>
			expect(result.current.data).toEqual(product(2, 'pre-built-trial'))
		);

		const [channelId, params] = getProductsPage.mock.calls[0];

		expect(channelId).toBe('42');
		expect(params?.get('filter')).toBe(
			"(specificationValues/any(x:(x eq 'pre-built-trial')))"
		);
		expect(params?.get('skus.currencyCode')).toBe('USD');
	});

	it('returns undefined when no item is a pre built trial', async () => {
		const getProductsPage = mockProductsPage({
			items: [product(1, 'ai-hub')],
		});

		const {result} = renderHook(
			() => {
				const {data, isLoading} = useSSAProduct();

				return {data, isLoading};
			},
			{wrapper}
		);

		await waitFor(() => expect(getProductsPage).toHaveBeenCalled());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.data).toBeUndefined();
	});
});
