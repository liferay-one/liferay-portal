/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useFetch} from '~/hooks/useFetch';
import {PROJECT_ROLE_ERCS} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';

import type {UserAccount} from '~/types/accounts';
import type {APIResponse} from '~/types/api';

type ProjectMembershipNode = {
	r_userToProjectMembership_userId: number;
	roleExternalReferenceCode: string;
};

export function useProjectContacts(
	projectExternalReferenceCode: string,
	roleExternalReferenceCode: string
) {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	const enabled = Boolean(
		accountId && projectExternalReferenceCode && roleExternalReferenceCode
	);

	const {data: membershipData, isLoading: membershipsLoading} = useFetch<
		APIResponse<ProjectMembershipNode>
	>(enabled ? '/o/c/projectmemberships' : null, {
		params: {
			fields: 'r_userToProjectMembership_userId,roleExternalReferenceCode',
			filter: new SearchBuilder()
				.eq(
					'r_projectToProjectMembership_c_projectERC',
					projectExternalReferenceCode
				)
				.and()
				.in('roleExternalReferenceCode', [
					roleExternalReferenceCode,
					...PROJECT_ROLE_ERCS,
				])
				.build(),
			pageSize: -1,
		},
	});

	const contactUserIds = useMemo(() => {
		const memberships = membershipData?.items ?? [];

		const projectMemberUserIds = new Set(
			memberships
				.filter((membership) =>
					PROJECT_ROLE_ERCS.includes(
						membership.roleExternalReferenceCode
					)
				)
				.map(
					(membership) => membership.r_userToProjectMembership_userId
				)
		);

		return new Set(
			memberships
				.filter(
					(membership) =>
						membership.roleExternalReferenceCode ===
							roleExternalReferenceCode &&
						projectMemberUserIds.has(
							membership.r_userToProjectMembership_userId
						)
				)
				.map(
					(membership) => membership.r_userToProjectMembership_userId
				)
		);
	}, [membershipData, roleExternalReferenceCode]);

	const {data: userAccountData, isLoading: userAccountsLoading} = useFetch<
		APIResponse<UserAccount>
	>(
		enabled && contactUserIds.size
			? `/o/headless-admin-user/v1.0/accounts/${accountId}/user-accounts`
			: null,
		{params: {fields: 'id,name', pageSize: -1, sort: 'givenName:asc'}}
	);

	const contacts = useMemo(
		() =>
			(userAccountData?.items ?? [])
				.filter((userAccount) => contactUserIds.has(userAccount.id))
				.map((userAccount) => userAccount.name),
		[contactUserIds, userAccountData]
	);

	return {contacts, loading: membershipsLoading || userAccountsLoading};
}
