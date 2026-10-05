/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';
import {Liferay} from '~/services/liferay/liferay';

import usePublisherCatalog from './usePublisherCatalog';

function mockCatalogPages(
	pages: {items?: {accountId: number}[]; lastPage: number}[]
) {
	return vi
		.spyOn(HeadlessCommerceAdminCatalog, 'getCatalogs')
		.mockImplementation(((params: URLSearchParams) =>
			Promise.resolve(
				pages[Number(params.get('page')) - 1]
			)) as unknown as typeof HeadlessCommerceAdminCatalog.getCatalogs);
}

function pagesRequested(getCatalogs: ReturnType<typeof mockCatalogPages>) {
	return getCatalogs.mock.calls.map(([params]) =>
		(params as URLSearchParams).get('page')
	);
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEPUBLISHERCATALOG] usePublisherCatalog', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {accountId: '7', accountName: 'Acme'};
	});

	afterEach(() => {
		vi.restoreAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('sends no request without an account ID', async () => {
		Liferay.CommerceContext.account = undefined;

		const getCatalogs = mockCatalogPages([]);

		const {result} = renderHook(() => usePublisherCatalog(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getCatalogs).not.toHaveBeenCalled();
	});

	it('pages through the catalogs until one matches the account ID', async () => {
		const getCatalogs = mockCatalogPages([
			{items: [{accountId: 1}], lastPage: 3},
			{items: [{accountId: 2}, {accountId: 7}], lastPage: 3},
			{items: [{accountId: 3}], lastPage: 3},
		]);

		const {result} = renderHook(() => usePublisherCatalog(), {wrapper});

		await waitFor(() =>
			expect(result.current.data).toEqual({accountId: 7})
		);

		expect(pagesRequested(getCatalogs)).toEqual(['1', '2']);
		expect(
			(getCatalogs.mock.calls[0][0] as URLSearchParams).get('pageSize')
		).toBe('100');
	});

	it('returns null after the last page when no catalog matches', async () => {
		const getCatalogs = mockCatalogPages([
			{items: [{accountId: 1}], lastPage: 2},
			{items: [{accountId: 2}], lastPage: 2},
		]);

		const {result} = renderHook(() => usePublisherCatalog(), {wrapper});

		await waitFor(() => expect(result.current.data).toBeNull());

		expect(pagesRequested(getCatalogs)).toEqual(['1', '2']);
	});

	it('stops at an empty page', async () => {
		const getCatalogs = mockCatalogPages([
			{items: [{accountId: 1}], lastPage: 5},
			{items: [], lastPage: 5},
		]);

		const {result} = renderHook(() => usePublisherCatalog(), {wrapper});

		await waitFor(() => expect(result.current.data).toBeNull());

		expect(pagesRequested(getCatalogs)).toEqual(['1', '2']);
	});

	it('stops after 20 pages', async () => {
		const getCatalogs = mockCatalogPages(
			Array.from({length: 30}, () => ({
				items: [{accountId: 1}],
				lastPage: 30,
			}))
		);

		const {result} = renderHook(() => usePublisherCatalog(), {wrapper});

		await waitFor(() => expect(result.current.data).toBeNull());

		expect(getCatalogs).toHaveBeenCalledTimes(20);
	});
});
