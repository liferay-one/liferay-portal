/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {addDays} from 'date-fns';
import useSWR from 'swr';
import {
	METRIC_PARAMETER,
	MetricPeriod,
} from '~/pages/Admin/MPSummary/utils/constants';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';

const useAccountsMetrics = (
	param: MetricPeriod,
	accountTypes: string[] = []
) => {
	const getAccountsMetrics = async () => {
		const currentTime = new Date();

		const beforeLastPeriod = addDays(
			currentTime,
			-METRIC_PARAMETER[param] * 2
		);

		const lastPeriod = addDays(currentTime, -METRIC_PARAMETER[param]);

		beforeLastPeriod.setHours(0, 0, 0, 0);
		lastPeriod.setHours(23, 59, 59);

		const createSearchBuilder = () => {
			const searchBuilder = new SearchBuilder();

			if (accountTypes.length) {
				searchBuilder.in('type', accountTypes).and();
			}

			return searchBuilder;
		};

		const requestsParams = [
			new URLSearchParams({
				fields: 'id',
				...(!!accountTypes.length && {
					filter: SearchBuilder.in('type', accountTypes),
				}),
				pageSize: '1',
			}),
			new URLSearchParams({
				fields: 'id',
				filter: createSearchBuilder()
					.gt('dateCreated', lastPeriod.toISOString())
					.build(),
				pageSize: '1',
			}),
			new URLSearchParams({
				fields: 'id',
				filter: createSearchBuilder()
					.lt('dateCreated', lastPeriod.toISOString())
					.and()
					.gt('dateCreated', beforeLastPeriod.toISOString())
					.build(),
				pageSize: '1',
			}),
		];

		const response = await Promise.all(
			requestsParams.map((searchParam) =>
				HeadlessAdminUser.getAccounts(searchParam)
			)
		);

		const newAccounts = response[1].totalCount - response[2].totalCount;

		let growth = Number(
			((newAccounts / response[1].totalCount) * 100).toFixed(2)
		);

		if (!Number.isFinite(growth)) {
			growth = 0;
		}

		return {
			beforeLastPeriod: response[2].totalCount,
			growth,
			lastPeriod: response[1].totalCount,
			param,
			totalCount: response[0].totalCount,
		};
	};

	return useSWR(
		['metrics/accounts', param, ...accountTypes],
		getAccountsMetrics
	);
};

export default useAccountsMetrics;
