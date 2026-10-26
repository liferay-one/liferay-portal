/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {toPageURL} from '~/services/fetcher/fetchAllPages';
import fetcher from '~/services/fetcher/fetcher';

import type {APIResponse, DataQuery} from '~/types/api';

const ACCOUNT_INSPECTOR_METRIC_PATHS = {
	accounts: '/o/headless-admin-user/v1.0/accounts',
	contracts: '/o/c/contracts',
	entitlements: '/o/c/entitlements',
	projects: '/o/c/projects',
} as const;

export type AccountInspectorMetrics = Partial<
	Record<keyof typeof ACCOUNT_INSPECTOR_METRIC_PATHS, number>
>;

async function getTotalCount(path: string) {
	const {totalCount} = await fetcher<APIResponse<unknown>>(
		toPageURL(path, 1, 1)
	);

	return totalCount;
}

async function getAccountInspectorMetrics(): Promise<AccountInspectorMetrics> {
	const entries = Object.entries(ACCOUNT_INSPECTOR_METRIC_PATHS);

	const totalCounts = await Promise.allSettled(
		entries.map(([, path]) => getTotalCount(path))
	);

	return Object.fromEntries(
		entries.map(([key], index) => {
			const totalCount = totalCounts[index];

			return [
				key,
				totalCount.status === 'fulfilled'
					? totalCount.value
					: undefined,
			];
		})
	);
}

export function accountInspectorMetricsQuery(): DataQuery<AccountInspectorMetrics> {
	return {
		fetcher: getAccountInspectorMetrics,
		key: '/account-inspector-metrics',
	};
}
