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

import {useAIHubProduct} from './useAIHubProduct';

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

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEAIHUBPRODUCT] useAIHubProduct', () => {
	beforeEach(() => {
		Liferay.CommerceContext.commerceChannelId = '42';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends no request until a commerce channel ID exists', async () => {
		Liferay.CommerceContext.commerceChannelId = '';

		const getProductsPage = mockProductsPage({items: []});

		const {result} = renderHook(() => useAIHubProduct(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getProductsPage).not.toHaveBeenCalled();
	});

	it('returns the first item of the AI Hub filtered products page', async () => {
		const product = {id: 1};

		const getProductsPage = mockProductsPage({items: [product, {id: 2}]});

		const {result} = renderHook(() => useAIHubProduct(), {wrapper});

		await waitFor(() => expect(result.current.data).toEqual(product));

		const [channelId, params] = getProductsPage.mock.calls[0];

		expect(channelId).toBe('42');
		expect(params?.get('filter')).toBe(
			"(specificationValues/any(x:(x eq 'ai-hub')))"
		);
		expect(params?.get('pageSize')).toBe('1');
	});

	it('returns undefined when the products page is empty', async () => {
		const getProductsPage = mockProductsPage({items: []});

		const {result} = renderHook(
			() => {
				const {data, isLoading} = useAIHubProduct();

				return {data, isLoading};
			},
			{wrapper}
		);

		await waitFor(() => expect(getProductsPage).toHaveBeenCalled());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.data).toBeUndefined();
	});
});
