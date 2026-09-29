/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useOneContext} from '~/context/OneContextProvider';
import {useFetch} from '~/hooks/useFetch';
import {PARTNER_MANAGER} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {PROJECT_ADMIN_ERC} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';
import escapeODataString from '~/utils/escapeODataString';

import type {APIResponse} from '~/types/api';

type ActivationPermission = {
	hasActivationPermission: boolean;
	loading: boolean;
};

type ProjectMembershipAPIItem = {
	roleExternalReferenceCode: string;
};

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
				userAccountModel?.isAdmin ||
				userAccountModel?.isLiferayStaff
		),
		projectExternalReferenceCode
	);
}

export function useHasLicenseKeyPermission(
	projectExternalReferenceCode: string
): ActivationPermission {
	const {userAccountModel} = useOneContext();

	return useProjectAdminPermission(
		Boolean(
			userAccountModel?.isAccountAdministrator ||
				userAccountModel?.isAdmin ||
				userAccountModel?.isLiferayStaff ||
				userAccountModel?.hasAccountRoleName(PARTNER_MANAGER)
		),
		projectExternalReferenceCode
	);
}

export default useHasActivationPermission;
