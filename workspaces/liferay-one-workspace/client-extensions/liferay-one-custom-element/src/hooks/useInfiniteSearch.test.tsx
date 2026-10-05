/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useDebounce from './useDebounce';
import useInfiniteSearch, {FetcherParams} from './useInfiniteSearch';

vi.mock('./useDebounce', () => ({
	default: vi.fn((value: string) => value),
}));

type Page = {
	items: string[];
	lastPage: number;
	page: number;
	totalCount: number;
};

const fetcher = vi.fn<(params: FetcherParams) => Promise<Page>>();

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

function renderInfiniteSearch() {
	return renderHook(
		() => useInfiniteSearch<string>('accounts', fetcher as never),
		{
			wrapper,
		}
	);
}

function pageIndexes() {
	return fetcher.mock.calls.map(
		([params]) => (params as unknown as {pageIndex: number}).pageIndex
	);
}

describe('[HOOK-USEINFINITESEARCH] useInfiniteSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the first page and flattens pages into items', async () => {
		fetcher.mockImplementation(async (params) => {
			const pageIndex = (params as unknown as {pageIndex: number})
				.pageIndex;

			return {
				items: [`item-${pageIndex}-a`, `item-${pageIndex}-b`],
				lastPage: 3,
				page: pageIndex + 1,
				totalCount: 6,
			};
		});

		const {result} = renderInfiniteSearch();

		await waitFor(() =>
			expect(result.current.items).toEqual(['item-0-a', 'item-0-b'])
		);

		expect(fetcher.mock.calls[0][0]).toEqual({
			key: '/infinite-search/0',
			pageIndex: 0,
			search: '',
			searchKey: 'accounts',
		});
		expect(result.current.infiniteSearch.allowFetching).toBe(true);

		act(() => result.current.infiniteSearch.fetchMore());

		await waitFor(() =>
			expect(result.current.items).toEqual([
				'item-0-a',
				'item-0-b',
				'item-1-a',
				'item-1-b',
			])
		);

		expect(pageIndexes()).toContain(1);
	});

	it('stops requesting pages once the last page is reached', async () => {
		fetcher.mockResolvedValue({
			items: ['only'],
			lastPage: 1,
			page: 1,
			totalCount: 1,
		});

		const {result} = renderInfiniteSearch();

		await waitFor(() => expect(result.current.items).toEqual(['only']));

		expect(result.current.infiniteSearch.allowFetching).toBe(false);

		await act(async () => {
			result.current.infiniteSearch.fetchMore();
		});

		expect(pageIndexes()).not.toContain(1);
		expect(result.current.items).toEqual(['only']);
	});

	it('shows the search box only when totalCount exceeds 20', async () => {
		fetcher.mockResolvedValue({
			items: [],
			lastPage: 2,
			page: 1,
			totalCount: 20,
		});

		const {result} = renderInfiniteSearch();

		await waitFor(() =>
			expect(result.current.infiniteSearch.totalCount).toBe(20)
		);

		expect(result.current.infiniteSearch.displaySearch).toBe(false);

		fetcher.mockResolvedValue({
			items: [],
			lastPage: 2,
			page: 1,
			totalCount: 21,
		});

		const {result: largerResult} = renderInfiniteSearch();

		await waitFor(() =>
			expect(largerResult.current.infiniteSearch.totalCount).toBe(21)
		);

		expect(largerResult.current.infiniteSearch.displaySearch).toBe(true);
	});

	it('reports no data and hides the search box before the first page loads', () => {
		fetcher.mockReturnValue(new Promise(() => {}));

		const {result} = renderInfiniteSearch();

		expect(result.current.items).toEqual([]);
		expect(result.current.infiniteSearch.displaySearch).toBe(false);
		expect(result.current.infiniteSearch.totalCount).toBe(-1);
	});

	it('passes the search through useDebounce and resets the size to 1 on a new search', async () => {
		fetcher.mockImplementation(async (params) => {
			const {pageIndex, search} = params as unknown as {
				pageIndex: number;
				search: string;
			};

			return {
				items: [`${search || 'all'}-${pageIndex}`],
				lastPage: 5,
				page: pageIndex + 1,
				totalCount: 50,
			};
		});

		const {result} = renderInfiniteSearch();

		await waitFor(() => expect(result.current.items).toEqual(['all-0']));

		act(() => result.current.infiniteSearch.fetchMore());

		await waitFor(() =>
			expect(result.current.items).toEqual(['all-0', 'all-1'])
		);

		act(() => result.current.infiniteSearch.setSearch('acme'));

		expect(useDebounce).toHaveBeenLastCalledWith('acme');

		await waitFor(() => expect(result.current.items).toEqual(['acme-0']));

		expect(result.current.infiniteSearch.search).toBe('acme');
		expect(result.current.items).toHaveLength(1);
	});
});
