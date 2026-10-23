/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback} from 'react';
import useSWR from 'swr';
import FetcherError from '~/services/fetcher/FetcherError';
import fetchAllPages, {
	DEFAULT_PAGE_SIZE,
	toPageURL,
} from '~/services/fetcher/fetchAllPages';

type ObjectItemsOptions = {
	fields?: string;
	filter?: string;
	pageSize?: number;
	sort?: string;
};

export function useObjectItems<Item>(
	path: string | null,
	{
		fields,
		filter,
		pageSize = DEFAULT_PAGE_SIZE,
		sort,
	}: ObjectItemsOptions = {}
) {
	const parameters = {fields, filter, sort};

	const {data, error, isLoading, mutate} = useSWR(
		path ? toPageURL(path, 1, pageSize, parameters) : null,
		async () => {
			const {failedPageCount, items, totalCount} =
				await fetchAllPages<Item>(path as string, parameters, pageSize);

			if (failedPageCount) {
				throw new FetcherError('Unable to fetch every page');
			}

			return {items, totalCount};
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
