/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import useSWR from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import useObjectItems from './useObjectItems';

vi.mock('swr', () => ({
	default: vi.fn(),
}));

vi.mock('~/services/fetcher/fetcher', () => ({
	default: vi.fn(),
}));

const mutate = vi.fn();

function mockSWR(data?: unknown) {
	vi.mocked(useSWR).mockReturnValue({
		data,
		error: undefined,
		isLoading: false,
		mutate,
	} as unknown as ReturnType<typeof useSWR>);
}

function getSWRCall() {
	return vi.mocked(useSWR).mock.calls[0] as unknown as [
		string | null,
		(url: string) => Promise<{items: number[]; totalCount: number}>,
	];
}

function page(items: number[], totalCount: number) {
	return {items, totalCount};
}

describe('[HOOK-USEOBJECTITEMS] useObjectItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockSWR();
	});

	it('sends no request for a null path', () => {
		const {result} = renderHook(() => useObjectItems(null));

		expect(getSWRCall()[0]).toBeNull();
		expect(result.current.items).toBeUndefined();
		expect(result.current.totalCount).toBe(0);
	});

	it('requests the first page with the default page size', () => {
		renderHook(() => useObjectItems('/o/c/projects'));

		expect(getSWRCall()[0]).toBe('/o/c/projects?page=1&pageSize=500');
	});

	it('adds the optional fields, filter, and sort to the URL', () => {
		renderHook(() =>
			useObjectItems('/o/c/projects', {
				fields: 'id,name',
				filter: "name eq 'x'",
				pageSize: 50,
				sort: 'name:asc',
			})
		);

		const url = new URL(getSWRCall()[0] as string, 'http://localhost');

		expect(Object.fromEntries(url.searchParams)).toEqual({
			fields: 'id,name',
			filter: "name eq 'x'",
			page: '1',
			pageSize: '50',
			sort: 'name:asc',
		});
	});

	it('returns the first page alone when totalCount fits', async () => {
		vi.mocked(fetcher).mockResolvedValue(page([1, 2], 2));

		renderHook(() => useObjectItems('/o/c/projects'));

		const [url, swrFetcher] = getSWRCall();

		await expect(swrFetcher(url as string)).resolves.toEqual(
			page([1, 2], 2)
		);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('fetches and merges the remaining pages', async () => {
		vi.mocked(fetcher).mockImplementation(async (url) => {
			const pageNumber = Number(
				new URL(url as string, 'http://localhost').searchParams.get(
					'page'
				)
			);

			return page([pageNumber * 10, pageNumber * 10 + 1], 5);
		});

		renderHook(() =>
			useObjectItems('/o/c/projects', {filter: 'f', pageSize: 2})
		);

		const [url, swrFetcher] = getSWRCall();

		const response = await swrFetcher(url as string);

		expect(response).toEqual(page([10, 11, 20, 21, 30, 31], 5));
		expect(vi.mocked(fetcher).mock.calls.map(([call]) => call)).toEqual([
			'/o/c/projects?page=1&pageSize=2&filter=f',
			'/o/c/projects?page=2&pageSize=2&filter=f',
			'/o/c/projects?page=3&pageSize=2&filter=f',
		]);
	});

	it('caps the remaining page requests at 20 pages', async () => {
		vi.mocked(fetcher).mockResolvedValue(page([1], 1000));

		renderHook(() => useObjectItems('/o/c/projects', {pageSize: 1}));

		const [url, swrFetcher] = getSWRCall();

		const response = await swrFetcher(url as string);

		expect(fetcher).toHaveBeenCalledTimes(20);
		expect(response.items).toHaveLength(20);
		expect(response.totalCount).toBe(1000);
	});

	it('exposes the items and totalCount and revalidates through mutate', () => {
		mockSWR(page([1, 2], 2));

		const {result} = renderHook(() => useObjectItems('/o/c/projects'));

		expect(result.current.items).toEqual([1, 2]);
		expect(result.current.totalCount).toBe(2);

		result.current.revalidate();

		expect(mutate).toHaveBeenCalledTimes(1);
	});
});
