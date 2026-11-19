/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useAccount} from '~/context/AccountContext';
import {useDataQuery} from '~/hooks/useDataQuery';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';

import type {APIResponse, DataQuery} from '~/types/api';
import type {ProjectLicensingSettings} from '~/types/projects';

const PAGE_SIZE = 200;

function getProjectsPage(
	accountId: number | string | null | undefined,
	page: number
) {
	return queryGraphQL<{projects: APIResponse<ProjectLicensingSettings>}>(
		`c { projects(filter: ${toGraphQLString(
			SearchBuilder.eq(
				'r_accountEntryToProject_accountEntryId',
				String(accountId)
			)
		)}, page: ${page}, pageSize: ${PAGE_SIZE}, sort: "name:asc") { items { allowComplimentary allowPermanentLicenses allowSelfProvisioning externalReferenceCode id name } totalCount } }`
	).then((data) => data.projects);
}

export function projectLicensingSettingsQuery(
	accountId?: number | string | null
): DataQuery<APIResponse<ProjectLicensingSettings>> {
	return {
		fetcher: async () => {
			const response = await getProjectsPage(accountId, 1);

			const lastPage = Math.ceil(response.totalCount / PAGE_SIZE);

			const remainingPages = await Promise.all(
				Array.from({length: Math.max(lastPage - 1, 0)}, (_, index) =>
					getProjectsPage(accountId, index + 2)
				)
			);

			return {
				...response,
				items: [
					...response.items,
					...remainingPages.flatMap(
						(remainingPage) => remainingPage.items
					),
				],
			};
		},
		key: accountId
			? `/graphql/projects/${accountId}/licensing-settings`
			: null,
	};
}

export default function useProjectLicensingSettings() {
	const {account, loading} = useAccount();

	const query = useDataQuery(projectLicensingSettingsQuery(account?.id));

	return {...query, isLoading: loading || query.isLoading};
}
