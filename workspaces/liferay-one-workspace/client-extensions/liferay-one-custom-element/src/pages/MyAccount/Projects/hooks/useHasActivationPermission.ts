/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useFetch} from '~/hooks/useFetch';
import {
	LIFERAY_SALES,
	PARTNER_MANAGER,
	SUPPORT_ADMINISTRATOR,
} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {PROJECT_ADMIN_ERC} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';
import escapeODataString from '~/utils/escapeODataString';

import type {APIResponse} from '~/types/api';

type ActivationPermission = {
	hasActivationPermission: boolean;
	loading: boolean;
};

type ProjectMembershipAPIItem = {
	roleExternalReferenceCode: string;
};

const LICENSE_KEY_MANAGER_ROLES = [
	LIFERAY_SALES,
	PARTNER_MANAGER,
	SUPPORT_ADMINISTRATOR,
];

function useProjectAdminPermission(
	hasElevatedRole: boolean,
	projectExternalReferenceCode: string
): ActivationPermission {
	const {myUserAccount} = useOneContext();

	const userId = Liferay.ThemeDisplay.getUserId();

	const filter = [
		SearchBuilder.eq(
			'r_projectToProjectMembership_c_projectERC',
			escapeODataString(projectExternalReferenceCode)
		),
		SearchBuilder.eq('r_userToProjectMembership_userId', userId),
		SearchBuilder.eq('roleExternalReferenceCode', PROJECT_ADMIN_ERC),
	].join(' and ');

	const {data: membershipData, isLoading: membershipLoading} = useFetch<
		APIResponse<ProjectMembershipAPIItem>
	>(
		!hasElevatedRole && projectExternalReferenceCode && userId
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
		return {hasActivationPermission: false, loading: true};
	}

	if (hasElevatedRole) {
		return {hasActivationPermission: true, loading: false};
	}

	const membershipRoleExternalReferenceCode =
		membershipData?.items?.[0]?.roleExternalReferenceCode;

	return {
		hasActivationPermission:
			membershipRoleExternalReferenceCode === PROJECT_ADMIN_ERC,
		loading: membershipLoading,
	};
}

export function useHasActivationPermission(
	projectExternalReferenceCode: string
): ActivationPermission {
	const {userAccountModel} = useOneContext();

	return useProjectAdminPermission(
		Boolean(
			userAccountModel?.isAccountAdministrator ||
				userAccountModel?.canManageAllAccounts ||
				userAccountModel?.isLiferayStaff
		),
		projectExternalReferenceCode
	);
}

export function useHasLicenseKeyPermission(
	projectExternalReferenceCode: string
): ActivationPermission {
	const {userAccountModel} = useOneContext();

	const unassigned = isUnassignedProject(projectExternalReferenceCode);

	return useProjectAdminPermission(
		Boolean(
			userAccountModel?.isAccountAdministrator ||
				userAccountModel?.canManageAllAccounts ||
				userAccountModel?.isLiferayStaff ||
				userAccountModel?.hasAccountRoleName(PARTNER_MANAGER) ||
				(unassigned &&
					LICENSE_KEY_MANAGER_ROLES.some((roleName) =>
						userAccountModel?.hasAccountRoleName(roleName)
					))
		),
		unassigned ? '' : projectExternalReferenceCode
	);
}

export default useHasActivationPermission;
