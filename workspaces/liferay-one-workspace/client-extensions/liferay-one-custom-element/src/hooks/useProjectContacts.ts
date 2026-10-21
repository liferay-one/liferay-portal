/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';

import type {UserAccount} from '~/types/accounts';
import type {APIResponse} from '~/types/api';

type ProjectMembershipNode = {
	r_userToProjectMembership_userId: number;
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
			fields: 'r_userToProjectMembership_userId',
			filter: new SearchBuilder()
				.eq(
					'r_projectToProjectMembership_c_projectERC',
					projectExternalReferenceCode
				)
				.and()
				.eq('roleExternalReferenceCode', roleExternalReferenceCode)
				.build(),
			pageSize: -1,
		},
	});

	const {data: userAccountData, isLoading: userAccountsLoading} = useFetch<
		APIResponse<UserAccount>
	>(
		enabled
			? `/o/headless-admin-user/v1.0/accounts/${accountId}/user-accounts`
			: null,
		{params: {pageSize: -1, sort: 'givenName:asc'}}
	);

	const contacts = useMemo(() => {
		const userIds = new Set(
			(membershipData?.items ?? []).map(
				(membership) => membership.r_userToProjectMembership_userId
			)
		);

		return (userAccountData?.items ?? [])
			.filter((userAccount) => userIds.has(userAccount.id))
			.map((userAccount) => userAccount.name);
	}, [membershipData, userAccountData]);

	return {contacts, loading: membershipsLoading || userAccountsLoading};
}
