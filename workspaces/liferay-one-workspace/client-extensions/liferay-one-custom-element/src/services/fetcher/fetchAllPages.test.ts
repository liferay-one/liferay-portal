/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import fetchAllPages, {toPageURL} from './fetchAllPages';
import fetcher from './fetcher';

vi.mock('./fetcher', () => ({default: vi.fn()}));

function page(items: number[], totalCount: number) {
	return {items, totalCount};
}

function getPageNumber(url: unknown) {
	return Number(
		new URL(url as string, 'http://localhost').searchParams.get('page')
	);
}

describe('[CLIENT-FETCHER-FETCHALLPAGES] fetchAllPages', () => {
	beforeEach(() => {
		vi.mocked(fetcher).mockReset();
	});

	it('builds the page URL with the page first and skips empty parameters', () => {
		expect(
			toPageURL('/o/c/projects', 2, 50, {
				fields: undefined,
				filter: "name eq 'x'",
			})
		).toBe('/o/c/projects?page=2&pageSize=50&filter=name+eq+%27x%27');
	});

	it('reads one page when the first page holds every row', async () => {
		vi.mocked(fetcher).mockResolvedValue(page([1, 2], 2));

		await expect(fetchAllPages('/o/c/projects')).resolves.toEqual({
			failedPageCount: 0,
			items: [1, 2],
			totalCount: 2,
			truncated: false,
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('stops at 20 pages and marks the result truncated', async () => {
		vi.mocked(fetcher).mockResolvedValue(page([1], 1000));

		const result = await fetchAllPages('/o/c/projects', {}, 1);

		expect(fetcher).toHaveBeenCalledTimes(20);
		expect(result.items).toHaveLength(20);
		expect(result.truncated).toBe(true);
	});

	it('keeps the pages that loaded and counts the pages that failed', async () => {
		vi.mocked(fetcher).mockImplementation(async (url) => {
			if (getPageNumber(url) === 2) {
				throw new Error('Failed');
			}

			return page([getPageNumber(url)], 3);
		});

		await expect(fetchAllPages('/o/c/projects', {}, 1)).resolves.toEqual({
			failedPageCount: 1,
			items: [1, 3],
			totalCount: 3,
			truncated: true,
		});
	});

	it('fails when the first page fails', async () => {
		vi.mocked(fetcher).mockRejectedValue(new Error('Failed'));

		await expect(fetchAllPages('/o/c/projects')).rejects.toThrow('Failed');
	});
});
