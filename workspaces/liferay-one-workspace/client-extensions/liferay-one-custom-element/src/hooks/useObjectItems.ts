/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback} from 'react';
import useSWR from 'swr';
import fetcher from '~/services/fetcher/fetcher';

import type {APIResponse} from '~/types/api';

const MAX_PAGES = 20;

const OBJECT_ITEMS_PAGE_SIZE = 500;

type ObjectItemsOptions = {
	fields?: string;
	filter?: string;
	pageSize?: number;
	sort?: string;
};

function toURL(
	path: string,
	page: number,
	{
		fields,
		filter,
		pageSize = OBJECT_ITEMS_PAGE_SIZE,
		sort,
	}: ObjectItemsOptions
) {
	const searchParams = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	});

	if (fields) {
		searchParams.set('fields', fields);
	}

	if (filter) {
		searchParams.set('filter', filter);
	}

	if (sort) {
		searchParams.set('sort', sort);
	}

	return `${path}?${searchParams}`;
}

export function useObjectItems<Item>(
	path: string | null,
	options: ObjectItemsOptions = {}
) {
	const {pageSize = OBJECT_ITEMS_PAGE_SIZE} = options;

	const {data, error, isLoading, mutate} = useSWR<APIResponse<Item>>(
		path ? toURL(path, 1, options) : null,
		async (url: string) => {
			const firstPage = await fetcher<APIResponse<Item>>(url);

			const items = [...firstPage.items];

			if (firstPage.totalCount <= items.length) {
				return {...firstPage, items};
			}

			const lastPage = Math.min(
				Math.ceil(firstPage.totalCount / pageSize),
				MAX_PAGES
			);

			const remainingPages = await Promise.all(
				Array.from({length: lastPage - 1}, (_, index) =>
					fetcher<APIResponse<Item>>(
						toURL(path as string, index + 2, options)
					)
				)
			);

			remainingPages.forEach((remainingPage) =>
				items.push(...remainingPage.items)
			);

			return {...firstPage, items};
		}
	);

	const revalidate = useCallback(() => {
		mutate();
	}, [mutate]);

	return {
		error,
		items: data?.items,
		loading: isLoading,
		revalidate,
		totalCount: data?.totalCount ?? 0,
	};
}

export default useObjectItems;
