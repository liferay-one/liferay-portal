/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import fetchAllPages from './fetchAllPages';

import type {InspectedCollection} from '~/types/accountInspection';

import type FetcherError from './FetcherError';

function toErrorMessage(error: unknown) {
	const fetcherError = error as FetcherError;

	const title = fetcherError.info?.title ?? fetcherError.message;

	return fetcherError.status ? `${fetcherError.status} ${title}` : title;
}

async function fetchInspectedCollection<Item>(
	path: string,
	parameters: Record<string, string> = {},
	pageSize?: number
): Promise<InspectedCollection<Item>> {
	try {
		const {items, totalCount, truncated} = await fetchAllPages<Item>(
			path,
			parameters,
			pageSize
		);

		return {items, totalCount, truncated};
	}
	catch (error) {
		return {error: toErrorMessage(error), items: [], totalCount: 0};
	}
}

export default fetchInspectedCollection;
