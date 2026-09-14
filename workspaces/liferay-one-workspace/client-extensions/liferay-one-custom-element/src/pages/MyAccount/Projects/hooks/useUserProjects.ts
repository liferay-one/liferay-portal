/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import {Liferay} from '~/services/liferay/liferay';

import type {UserProject} from '~/pages/MyAccount/Projects/types';
import type {APIResponse, DataQuery} from '~/types/api';

type ProjectAPIItem = {
	externalReferenceCode: string;
	id: number;
	liferayVersion?: string;
	name: string;
};

type ProjectMembershipAPIItem = {
	r_projectToProjectMembership_c_projectERC: string;
};

export function userProjectsQuery(
	accountId?: number | string | null
): DataQuery<APIResponse<ProjectAPIItem>> {
	return {
		fetcher: () =>
			queryGraphQL<{projects: APIResponse<ProjectAPIItem>}>(
				`c { projects(filter: ${toGraphQLString(
					`r_accountEntryToProject_accountEntryId eq '${accountId}'`
				)}, pageSize: 200, sort: "name:asc") { items { externalReferenceCode id liferayVersion name } totalCount } }`
			).then((data) => data.projects),
		key: accountId ? `/graphql/projects/${accountId}` : null,
	};
}

export function useUserProjects(): {
	hasAccountProjects: boolean;
	loading: boolean;
	projects: UserProject[];
} {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const userId = Liferay.ThemeDisplay.getUserId();

	const {userAccountModel} = useOneContext();

	const showAllAccountProjects = Boolean(
		userAccountModel?.isAccountAdministrator || userAccountModel?.isAdmin
	);

	const enabled = Boolean(accountId && userId);

	const {data: membershipData, isLoading: membershipsLoading} = useFetch<
		APIResponse<ProjectMembershipAPIItem>
	>(enabled && !showAllAccountProjects ? '/o/c/projectmemberships' : null, {
		params: {
			fields: 'r_projectToProjectMembership_c_projectERC',
			filter: `r_accountEntryToProjectMembership_accountEntryId eq '${accountId}' and r_userToProjectMembership_userId eq '${userId}'`,
			pageSize: 200,
		},
	});

	const {data: projectData, isLoading: projectsLoading} = useDataQuery(
		userProjectsQuery(enabled ? accountId : null)
	);

	const memberProjectExternalReferenceCodes = new Set(
		(membershipData?.items ?? []).map(
			(item) => item.r_projectToProjectMembership_c_projectERC
		)
	);

	const projects: UserProject[] = (projectData?.items ?? [])
		.filter(
			(item) =>
				showAllAccountProjects ||
				memberProjectExternalReferenceCodes.has(
					item.externalReferenceCode
				)
		)
		.map((item) => ({
			externalReferenceCode: item.externalReferenceCode,
			id: item.id,
			liferayVersion: item.liferayVersion,
			name: item.name,
		}));

	return {
		hasAccountProjects: !!(projectData?.items ?? []).length,
		loading: membershipsLoading || projectsLoading,
		projects,
	};
}
