/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';
import escapeODataString from '~/utils/escapeODataString';

import type {APIResponse} from '~/types/api';

const PROJECT_ADMIN_ROLE_ERC = 'C_PROJECT_ADMIN';
const PROJECT_REQUESTER_ROLE_ERC = 'C_PROJECT_REQUESTER';

type ProjectMembershipAPIItem = {
	roleExternalReferenceCode: string;
};

export default function useHasAllEventsPermissions(projectERC?: string): {
	hasAllEventsPermissions: boolean;
	loading: boolean;
} {
	const {myUserAccount, userAccountModel} = useOneContext();

	const userId = Liferay.ThemeDisplay.getUserId();

	const hasElevatedRole = Boolean(
		userAccountModel?.isAdmin || userAccountModel?.isAccountAdministrator
	);

	const projectTicketRoleExternalReferenceCodes = [
		PROJECT_ADMIN_ROLE_ERC,
		PROJECT_REQUESTER_ROLE_ERC,
	];

	const filter = [
		SearchBuilder.eq(
			'r_projectToProjectMembership_c_projectERC',
			escapeODataString(projectERC ?? '')
		),
		SearchBuilder.eq('r_userToProjectMembership_userId', userId),
		SearchBuilder.in(
			'roleExternalReferenceCode',
			projectTicketRoleExternalReferenceCodes
		),
	].join(' and ');

	const {data: membershipData, isLoading: membershipLoading} = useFetch<
		APIResponse<ProjectMembershipAPIItem>
	>(
		!hasElevatedRole && projectERC && userId
			? '/o/c/projectmemberships'
			: null,
		{
			params: {
				fields: 'roleExternalReferenceCode',
				filter,
				pageSize: 1,
			},
		}
	);

	if (!myUserAccount) {
		return {hasAllEventsPermissions: false, loading: true};
	}

	if (hasElevatedRole) {
		return {hasAllEventsPermissions: true, loading: false};
	}

	const membershipRoleExternalReferenceCode =
		membershipData?.items?.[0]?.roleExternalReferenceCode;

	const hasProjectTicketRole =
		projectTicketRoleExternalReferenceCodes.includes(
			membershipRoleExternalReferenceCode ?? ''
		);

	return {
		hasAllEventsPermissions: hasProjectTicketRole,
		loading: membershipLoading,
	};
}
