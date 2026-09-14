/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR, {SWRConfiguration, preload} from 'swr';

import type {DataQuery} from '~/types/api';

export function preloadDataQuery<Data>({fetcher, key}: DataQuery<Data>) {
	if (key) {
		preload(key, fetcher);
	}
}

export function useDataQuery<Data>(
	{fetcher, key}: DataQuery<Data>,
	options?: SWRConfiguration
) {
	return useSWR(key, fetcher, options);
}
