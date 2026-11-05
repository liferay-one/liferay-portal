/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useDataQuery} from '~/hooks/useDataQuery';
import {canViewAllAccountProjects} from '~/pages/MyAccount/AccountMembers/accountRoles';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {queryGraphQL, toGraphQLString} from '~/services/graphql/GraphQL';
import {Liferay} from '~/services/liferay/liferay';
import ProjectMemberships from '~/services/objects/ProjectMemberships';

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

export function userProjectMembershipsQuery(
	accountId?: number | string | null,
	userId?: number | string | null
): DataQuery<APIResponse<ProjectMembershipAPIItem>> {
	const params = new URLSearchParams({
		fields: 'r_projectToProjectMembership_c_projectERC',
		filter: new SearchBuilder()
			.eq(
				'r_accountEntryToProjectMembership_accountEntryId',
				accountId ?? ''
			)
			.and()
			.eq('r_userToProjectMembership_userId', userId ?? '')
			.build(),
		pageSize: '200',
	});

	return {
		fetcher: () =>
			ProjectMemberships.getProjectMemberships<ProjectMembershipAPIItem>(
				params
			),
		key: accountId && userId ? `/o/c/projectmemberships?${params}` : null,
	};
}

export function useUserProjects(): {
	accountProjects: UserProject[];
	hasAccountProjects: boolean;
	loading: boolean;
	projects: UserProject[];
} {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const userId = Liferay.ThemeDisplay.getUserId();

	const {userAccountModel} = useOneContext();

	const showAllAccountProjects = canViewAllAccountProjects(userAccountModel);

	const enabled = Boolean(accountId && userId);

	const {data: membershipData, isLoading: membershipsLoading} = useDataQuery(
		userProjectMembershipsQuery(
			enabled ? accountId : null,
			enabled ? userId : null
		)
	);

	const {data: projectData, isLoading: projectsLoading} = useDataQuery(
		userProjectsQuery(enabled ? accountId : null)
	);

	const memberProjectExternalReferenceCodes = new Set(
		(membershipData?.items ?? []).map(
			(item) => item.r_projectToProjectMembership_c_projectERC
		)
	);

	const accountProjects: UserProject[] = (projectData?.items ?? []).map(
		(item) => ({
			externalReferenceCode: item.externalReferenceCode,
			id: item.id,
			liferayVersion: item.liferayVersion,
			member: memberProjectExternalReferenceCodes.has(
				item.externalReferenceCode
			),
			name: item.name,
		})
	);

	const projects = accountProjects.filter(
		(project) =>
			showAllAccountProjects ||
			memberProjectExternalReferenceCodes.has(
				project.externalReferenceCode
			)
	);

	return {
		accountProjects,
		hasAccountProjects: !!accountProjects.length,
		loading: membershipsLoading || projectsLoading,
		projects,
	};
}
