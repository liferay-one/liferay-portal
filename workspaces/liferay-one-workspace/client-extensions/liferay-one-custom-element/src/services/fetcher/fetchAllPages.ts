/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetcher from './fetcher';

import type {APIResponse} from '~/types/api';

export const DEFAULT_PAGE_SIZE = 500;

export const MAX_PAGES = 20;

export type AllPages<Item> = {
	failedPageCount: number;
	items: Item[];
	totalCount: number;
	truncated: boolean;
};

export function toPageURL(
	path: string,
	page: number,
	pageSize: number,
	parameters: Record<string, string | undefined> = {}
) {
	const searchParams = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	});

	Object.entries(parameters).forEach(([key, value]) => {
		if (value) {
			searchParams.set(key, value);
		}
	});

	return `${path}?${searchParams}`;
}

async function fetchAllPages<Item>(
	path: string,
	parameters: Record<string, string | undefined> = {},
	pageSize = DEFAULT_PAGE_SIZE
): Promise<AllPages<Item>> {
	const firstPage = await fetcher<APIResponse<Item>>(
		toPageURL(path, 1, pageSize, parameters)
	);

	const lastPage = Math.min(
		Math.ceil(firstPage.totalCount / pageSize),
		MAX_PAGES
	);

	const remainingPages = await Promise.allSettled(
		Array.from({length: Math.max(lastPage - 1, 0)}, (_, index) =>
			fetcher<APIResponse<Item>>(
				toPageURL(path, index + 2, pageSize, parameters)
			)
		)
	);

	const items = [
		firstPage.items,
		...remainingPages.map((remainingPage) =>
			remainingPage.status === 'fulfilled'
				? remainingPage.value.items
				: []
		),
	].flat();

	return {
		failedPageCount: remainingPages.filter(
			({status}) => status === 'rejected'
		).length,
		items,
		totalCount: firstPage.totalCount,
		truncated: items.length < firstPage.totalCount,
	};
}

export default fetchAllPages;
