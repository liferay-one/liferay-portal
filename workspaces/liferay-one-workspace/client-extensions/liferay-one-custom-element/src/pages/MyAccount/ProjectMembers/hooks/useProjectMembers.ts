/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useOneContext} from '~/context/OneContextProvider';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import useObjectItems from '~/hooks/useObjectItems';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import {canViewAllAccountProjects} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {
	PROJECT_ADMIN_ERC,
	PROJECT_ROLE_ERCS,
} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {getProjectsWithOrders} from '~/pages/MyAccount/Projects/utils/getProjectsWithOrders';
import {Liferay} from '~/services/liferay/liferay';
import Projects from '~/services/spring-boot/Projects';

import type {
	AccountMemberOption,
	Designation,
	ProjectMembersRow,
} from '~/pages/MyAccount/ProjectMembers/types';
import type {UserAccount} from '~/types/accounts';
import type {APIResponse, DataQuery} from '~/types/api';

const CONTACT_ROLES_CHUNK_SIZE = 100;

type ProjectItem = {
	externalReferenceCode: string;
	id: number;
	name: string;
};

type ProjectMembershipItem = {
	id: number;
	r_projectToProjectMembership_c_projectERC: string;
	r_userToProjectMembership_userId: number;
	roleExternalReferenceCode: string;
};

type UserInfo = {
	email: string;
	name: string;
};

function projectContactRolesQuery(
	projectExternalReferenceCodes: string[]
): DataQuery<Record<string, Designation[]>> {
	return {
		fetcher: async () => {
			const chunks: string[][] = [];

			for (
				let index = 0;
				index < projectExternalReferenceCodes.length;
				index += CONTACT_ROLES_CHUNK_SIZE
			) {
				chunks.push(
					projectExternalReferenceCodes.slice(
						index,
						index + CONTACT_ROLES_CHUNK_SIZE
					)
				);
			}

			const results = await Promise.all(
				chunks.map((chunk) => Projects.getContactRoles(chunk))
			);

			return Object.assign({}, ...results);
		},
		key: projectExternalReferenceCodes.length
			? `/project-contact-roles/${projectExternalReferenceCodes.join(',')}`
			: null,
	};
}

export function useProjectMembers() {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const userId = Number(Liferay.ThemeDisplay.getUserId());

	const {userAccountModel} = useOneContext();

	const showAllAccountProjects = canViewAllAccountProjects(userAccountModel);

	const {data: projectData, isLoading: projectsLoading} = useFetch<
		APIResponse<ProjectItem>
	>(accountId ? '/o/c/projects' : null, {
		params: {
			fields: 'externalReferenceCode,id,name',
			filter: `r_accountEntryToProject_accountEntryId eq '${accountId}'`,
			pageSize: -1,
			sort: 'name:asc',
		},
	});

	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders();

	const {
		items: accountMemberships,
		loading: membershipsLoading,
		revalidate: revalidateMemberships,
	} = useObjectItems<ProjectMembershipItem>(
		accountId ? '/o/c/projectmemberships' : null,
		{
			fields: 'id,r_projectToProjectMembership_c_projectERC,r_userToProjectMembership_userId,roleExternalReferenceCode',
			filter: `r_accountEntryToProjectMembership_accountEntryId eq '${accountId}'`,
		}
	);

	const {
		items: userAccounts,
		loading: userAccountsLoading,
		revalidate: revalidateUserAccounts,
	} = useObjectItems<UserAccount>(
		accountId
			? `/o/headless-admin-user/v1.0/accounts/${accountId}/user-accounts`
			: null,
		{sort: 'givenName:asc'}
	);

	const membershipsByProject = useMemo(() => {
		const map = new Map<string, ProjectMembershipItem[]>();

		(accountMemberships ?? []).forEach((membership) => {
			const projectExternalReferenceCode =
				membership.r_projectToProjectMembership_c_projectERC;

			const memberships = map.get(projectExternalReferenceCode) ?? [];

			memberships.push(membership);

			map.set(projectExternalReferenceCode, memberships);
		});

		return map;
	}, [accountMemberships]);

	const projects = useMemo(() => {
		const accountProjects = projectData?.items ?? [];

		const projectsWithOrders = ordersError
			? accountProjects
			: getProjectsWithOrders(accountProjects, placedOrders);

		return projectsWithOrders.filter(
			(project) =>
				showAllAccountProjects ||
				membershipsByProject
					.get(project.externalReferenceCode)
					?.some(
						(membership) =>
							membership.r_userToProjectMembership_userId ===
							userId
					)
		);
	}, [
		membershipsByProject,
		ordersError,
		placedOrders,
		projectData,
		showAllAccountProjects,
		userId,
	]);

	const {
		data: designationsByProject,
		isLoading: contactRolesLoading,
		mutate: mutateContactRoles,
	} = useDataQuery(
		projectContactRolesQuery(
			projects.map(({externalReferenceCode}) => externalReferenceCode)
		)
	);

	const userInfoById = useMemo(() => {
		const map = new Map<number, UserInfo>();

		(userAccounts ?? []).forEach((userAccount) => {
			map.set(userAccount.id, {
				email: userAccount.emailAddress,
				name: userAccount.name,
			});
		});

		return map;
	}, [userAccounts]);

	const accountMemberOptions = useMemo<AccountMemberOption[]>(
		() =>
			(userAccounts ?? []).map((userAccount) => ({
				email: userAccount.emailAddress,
				name: userAccount.name,
				userId: userAccount.id,
			})),
		[userAccounts]
	);

	const rows = useMemo<ProjectMembersRow[]>(() => {
		return projects.map((project) => {
			const memberships =
				membershipsByProject.get(project.externalReferenceCode) ?? [];

			const availableDesignations =
				designationsByProject?.[project.externalReferenceCode] ?? [];

			const designationsByUserId = new Map<number, string[]>();

			memberships.forEach((membership) => {
				if (
					!availableDesignations.some(
						({externalReferenceCode}) =>
							externalReferenceCode ===
							membership.roleExternalReferenceCode
					)
				) {
					return;
				}

				const userId = membership.r_userToProjectMembership_userId;

				designationsByUserId.set(userId, [
					...(designationsByUserId.get(userId) ?? []),
					membership.roleExternalReferenceCode,
				]);
			});

			const members = memberships
				.filter((membership) =>
					PROJECT_ROLE_ERCS.includes(
						membership.roleExternalReferenceCode
					)
				)
				.map((membership) => {
					const userId = membership.r_userToProjectMembership_userId;

					const userInfo = userInfoById.get(userId);

					return {
						designations: designationsByUserId.get(userId) ?? [],
						email: userInfo?.email ?? '',
						membershipId: membership.id,
						name: userInfo?.name ?? '',
						roleExternalReferenceCode:
							membership.roleExternalReferenceCode,
						userId,
					};
				});

			members.sort((a, b) => {
				if (!a.name) {
					return b.name ? 1 : 0;
				}

				if (!b.name) {
					return -1;
				}

				return a.name.localeCompare(b.name);
			});

			return {
				availableDesignations,
				externalReferenceCode: project.externalReferenceCode,
				hasProjectAdmin: members.some(
					(member) =>
						member.roleExternalReferenceCode === PROJECT_ADMIN_ERC
				),
				id: project.id,
				members,
				name: project.name,
			};
		});
	}, [designationsByProject, membershipsByProject, projects, userInfoById]);

	const mutate = async () => {
		await Promise.all([
			mutateContactRoles(),
			revalidateMemberships(),
			revalidateUserAccounts(),
		]);
	};

	return {
		accountMemberOptions,
		loading:
			contactRolesLoading ||
			membershipsLoading ||
			ordersLoading ||
			projectsLoading ||
			userAccountsLoading,
		mutate,
		rows,
	};
}
