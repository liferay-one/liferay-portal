/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import {Liferay} from '~/services/liferay/liferay';

import {useDeliveryProductByExternalReferenceCode} from './useDeliveryProductByExternalReferenceCode';

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

describe('[HOOK-USEDELIVERYPRODUCTBYEXTERNALREFERENCECODE] useDeliveryProductByExternalReferenceCode', () => {
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

	it('sends no request without an external reference code', async () => {
		const getProductsPage = mockProductsPage({items: []});

		const {result} = renderHook(
			() => useDeliveryProductByExternalReferenceCode(undefined),
			{wrapper}
		);

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getProductsPage).not.toHaveBeenCalled();
	});

	it('returns the product matching the external reference code', async () => {
		const product = {externalReferenceCode: 'PRDCT-LR-TOKENS', id: 1};

		const getProductsPage = mockProductsPage({items: [product]});

		const {result} = renderHook(
			() => useDeliveryProductByExternalReferenceCode('PRDCT-LR-TOKENS'),
			{wrapper}
		);

		await waitFor(() => expect(result.current.data).toEqual(product));

		const [channelId, params] = getProductsPage.mock.calls[0];

		expect(channelId).toBe('42');
		expect(params?.get('filter')).toBe(
			"externalReferenceCode eq 'PRDCT-LR-TOKENS'"
		);
		expect(params?.get('pageSize')).toBe('1');
	});
});
