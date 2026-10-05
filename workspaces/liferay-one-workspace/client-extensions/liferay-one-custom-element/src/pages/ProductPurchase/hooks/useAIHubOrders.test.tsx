/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';

import useAIHubOrders from './useAIHubOrders';

function mockPlacedOrders(response: unknown) {
	return vi
		.spyOn(HeadlessCommerceDeliveryOrder, 'getPlacedOrders')
		.mockResolvedValue(
			response as Awaited<
				ReturnType<typeof HeadlessCommerceDeliveryOrder.getPlacedOrders>
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

describe('[HOOK-PRODUCTPURCHASE-USEAIHUBORDERS] useAIHubOrders', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		Liferay.CommerceContext.commerceChannelId = '42';
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.restoreAllMocks();
	});

	it('sends no request without an account ID', async () => {
		const getPlacedOrders = mockPlacedOrders({items: []});

		const {result} = renderHook(() => useAIHubOrders(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getPlacedOrders).not.toHaveBeenCalled();
	});

	it('sends no request without a channel ID', async () => {
		Liferay.CommerceContext.commerceChannelId = '';

		const getPlacedOrders = mockPlacedOrders({items: []});

		const {result} = renderHook(() => useAIHubOrders(7), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getPlacedOrders).not.toHaveBeenCalled();
	});

	it('filters the placed orders by order type with a page size of 1', async () => {
		const order = {id: 1};

		const getPlacedOrders = mockPlacedOrders({items: [order]});

		const {result} = renderHook(() => useAIHubOrders(7), {wrapper});

		await waitFor(() => expect(result.current.data).toEqual([order]));

		const [channelId, accountId, params] = getPlacedOrders.mock.calls[0];

		expect(channelId).toBe('42');
		expect(accountId).toBe(7);
		expect(params?.get('filter')).toBe(
			"orderTypeExternalReferenceCode eq 'AI_HUB'"
		);
		expect(params?.get('pageSize')).toBe('1');
	});

	it('returns an empty list when the response has no items', async () => {
		mockPlacedOrders({});

		const {result} = renderHook(() => useAIHubOrders(7), {wrapper});

		await waitFor(() => expect(result.current.data).toEqual([]));
	});
});
