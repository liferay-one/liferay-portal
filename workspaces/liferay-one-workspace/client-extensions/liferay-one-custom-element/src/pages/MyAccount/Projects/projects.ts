/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '../../../context/OneContext';
import {useFetch} from '../../../hooks/useFetch';
import {Liferay} from '../../../liferay/liferay';

export const LAST_PROJECT_STORAGE_KEY = 'liferay-one:last-project';

// Synthetic project that buckets the products and applications entitled through
// the account's contracts that are not linked to any project ("One-Time
// Purchases"). It is not a real project entry, so it carries a reserved
// external reference code that real projects never use.

export const UNASSIGNED_PROJECT_ERC = 'one-time-purchases';

export function isUnassignedProject(
	projectExternalReferenceCode: string
): boolean {
	return projectExternalReferenceCode === UNASSIGNED_PROJECT_ERC;
}

export function resolveProjectId(): string {
	return localStorage.getItem(LAST_PROJECT_STORAGE_KEY) ?? '';
}

export type UserProject = {
	externalReferenceCode: string;
	id: number;
	name: string;
	unassigned?: boolean;
};

type ProjectAPIItem = {
	externalReferenceCode: string;
	id: number;
	name: string;
};

type ProjectMembershipAPIItem = {
	r_projectToProjectMembership_c_projectERC: string;
};

// Returns the projects the current user can access within the currently
// selected account. Projects are company scoped, so they are filtered by the
// account relationship, then narrowed to the projects the user has a
// ProjectMembership for. Super admins are not membership-scoped, so they see
// every project in the account.

export function useUserProjects(): {loading: boolean; projects: UserProject[]} {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const userId = Liferay.ThemeDisplay.getUserId();

	const {marketplaceUserAccount} = useOneContext();

	const isAdmin = Boolean(marketplaceUserAccount?.isAdmin);

	const enabled = Boolean(accountId && userId);

	const {data: membershipData, loading: membershipsLoading} = useFetch<
		APIResponse<ProjectMembershipAPIItem>
	>(enabled && !isAdmin ? '/o/c/projectmemberships' : null, {
		params: {
			fields: 'r_projectToProjectMembership_c_projectERC',
			filter: `r_accountEntryToProjectMembership_accountEntryId eq '${accountId}' and r_userToProjectMembership_userId eq '${userId}'`,
			pageSize: 200,
		},
	});

	const {data: projectData, loading: projectsLoading} = useFetch<
		APIResponse<ProjectAPIItem>
	>(enabled ? '/o/c/projects' : null, {
		params: {
			filter: `r_accountEntryToProject_accountEntryId eq '${accountId}'`,
			pageSize: 200,
			sort: 'name:asc',
		},
	});

	const memberProjectExternalReferenceCodes = new Set(
		(membershipData?.items ?? []).map(
			(item) => item.r_projectToProjectMembership_c_projectERC
		)
	);

	const projects: UserProject[] = (projectData?.items ?? [])
		.filter(
			(item) =>
				isAdmin ||
				memberProjectExternalReferenceCodes.has(
					item.externalReferenceCode
				)
		)
		.map((item) => ({
			externalReferenceCode: item.externalReferenceCode,
			id: item.id,
			name: item.name,
		}));

	return {loading: membershipsLoading || projectsLoading, projects};
}
