/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import {useFetch} from '~/hooks/useFetch';
import {
	getMembershipRoleNames,
	hasAdministratorRole,
	sortRoleNames,
} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {getProjectRoleLabel} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';

import type {AccountMemberRow} from '~/pages/MyAccount/AccountMembers/types';
import type {Account, UserAccount} from '~/types/accounts';
import type {APIResponse} from '~/types/api';

type ProjectItem = {
	externalReferenceCode: string;
	name: string;
};

function getProjectRoleName(
	projectRoleExternalReferenceCode?: string,
	projectName?: string
) {
	if (!projectName) {
		return undefined;
	}

	const projectRoleLabel = getProjectRoleLabel(
		projectRoleExternalReferenceCode ?? ''
	);

	if (!projectRoleLabel) {
		return projectName;
	}

	return `${projectName}: ${projectRoleLabel}`;
}

export function useAccountMembers() {
	const accountId = Liferay.CommerceContext?.account?.accountId;
	const currentUserId = Liferay.ThemeDisplay.getUserId();

	const {
		data: account,
		error: accountError,
		isLoading: accountLoading,
	} = useFetch<Account>(
		accountId ? `/o/headless-admin-user/v1.0/accounts/${accountId}` : null
	);

	const accountExternalReferenceCode = account?.externalReferenceCode;

	const {
		data: userAccountData,
		error: userAccountsError,
		isLoading: userAccountsLoading,
		mutate: mutateUserAccounts,
	} = useFetch<APIResponse<UserAccount>>(
		accountId
			? `/o/headless-admin-user/v1.0/accounts/${accountId}/user-accounts`
			: null,
		{params: {pageSize: -1, sort: 'givenName:asc'}}
	);

	const {
		data: invitations,
		error: invitationsError,
		isLoading: invitationsLoading,
		mutate: mutateInvitations,
	} = useSWR(
		accountExternalReferenceCode
			? ['account-invitations', accountExternalReferenceCode]
			: null,
		([, externalReferenceCode]) =>
			Accounts.getInvitations(externalReferenceCode)
	);

	const {data: projectData} = useFetch<APIResponse<ProjectItem>>(
		accountId ? '/o/c/projects' : null,
		{
			params: {
				fields: 'externalReferenceCode,name',
				filter: `r_accountEntryToProject_accountEntryId eq '${accountId}'`,
				pageSize: -1,
			},
		}
	);

	const projectNamesByExternalReferenceCode = useMemo(() => {
		const map: Record<string, string> = {};

		(projectData?.items ?? []).forEach((project) => {
			map[project.externalReferenceCode] = project.name;
		});

		return map;
	}, [projectData]);

	const rows = useMemo<AccountMemberRow[]>(() => {
		const memberRows = (userAccountData?.items ?? []).map<AccountMemberRow>(
			(userAccount) => {
				const accountRoleBriefs =
					userAccount.accountBriefs?.find(
						(accountBrief) =>
							String(accountBrief.id) === String(accountId)
					)?.roleBriefs ?? [];

				return {
					email: userAccount.emailAddress,
					id: userAccount.id,
					image: userAccount.image,
					invitationIds: [],
					isAdministrator: hasAdministratorRole(accountRoleBriefs),
					isCurrentUser: String(userAccount.id) === currentUserId,
					name: userAccount.name,
					roleBriefs: accountRoleBriefs,
					roleNames: getMembershipRoleNames(accountRoleBriefs),
					status: 'active',
				};
			}
		);

		const memberEmailAddresses = new Set(
			memberRows.map((memberRow) => memberRow.email.toLowerCase())
		);

		const invitationRows: AccountMemberRow[] = [];

		(invitations ?? []).forEach((invitation) => {
			const projectExternalReferenceCode =
				invitation.projectExternalReferenceCode;

			if (
				!projectExternalReferenceCode &&
				memberEmailAddresses.has(invitation.emailAddress.toLowerCase())
			) {
				return;
			}

			invitationRows.push({
				email: invitation.emailAddress,
				id: invitation.id,
				invitationIds: [invitation.id],
				isAdministrator: false,
				isCurrentUser: false,
				name: [invitation.givenName, invitation.familyName]
					.filter(Boolean)
					.join(' '),
				projectRoleName: getProjectRoleName(
					invitation.projectRoleExternalReferenceCode,
					projectExternalReferenceCode
						? projectNamesByExternalReferenceCode[
								projectExternalReferenceCode
							] ?? projectExternalReferenceCode
						: undefined
				),
				roleBriefs: [],
				roleNames: sortRoleNames(invitation.roleNames ?? []),
				status: 'invited',
			});
		});

		invitationRows.sort(
			(a, b) =>
				a.name.localeCompare(b.name) ||
				(a.projectRoleName ?? '').localeCompare(b.projectRoleName ?? '')
		);

		return [...memberRows, ...invitationRows];
	}, [
		accountId,
		currentUserId,
		invitations,
		projectNamesByExternalReferenceCode,
		userAccountData,
	]);

	const mutate = async () => {
		await Promise.all([mutateInvitations(), mutateUserAccounts()]);
	};

	return {
		account,
		error: accountError || userAccountsError || invitationsError,
		loading: accountLoading || invitationsLoading || userAccountsLoading,
		mutate,
		projectNamesByExternalReferenceCode,
		rows,
	};
}
