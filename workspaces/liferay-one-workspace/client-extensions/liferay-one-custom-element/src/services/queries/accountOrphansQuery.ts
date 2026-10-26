/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import fetchInspectedCollection from '~/services/fetcher/fetchInspectedCollection';

import type {
	InspectedCollection,
	InspectedEntry,
	InspectedUser,
} from '~/types/accountInspection';
import type {DataQuery} from '~/types/api';

const USER_BATCH_SIZE = 20;

function toUncheckedCollection(): InspectedCollection {
	return {
		error: i18n.translate(
			'this-list-could-not-be-checked-because-its-records-did-not-load-completely'
		),
		items: [],
		totalCount: 0,
	};
}

const NO_ACCOUNT_SOURCES = {
	activationKeysWithoutAccount: {
		field: 'r_accountEntryToActivationKey_accountEntryId',
		path: '/o/c/activationkeys',
	},
	contractsWithoutAccount: {
		field: 'r_accountEntryToContract_accountEntryId',
		path: '/o/c/contracts',
	},
	entitlementsWithoutAccount: {
		field: 'r_accountEntryToEntitlement_accountEntryId',
		path: '/o/c/entitlements',
	},
	entitlementsWithoutDefinition: {
		field: 'r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId',
		path: '/o/c/entitlements',
	},
	licenseKeysWithoutAccount: {
		field: 'r_accountEntryToLicenseKey_accountEntryId',
		path: '/o/c/licensekeys',
	},
	projectsWithoutAccount: {
		field: 'r_accountEntryToProject_accountEntryId',
		path: '/o/c/projects',
	},
} as const;

export type AccountOrphanKey =
	| 'accountsWithoutUsers'
	| 'projectMembershipsOutsideAccount'
	| keyof typeof NO_ACCOUNT_SOURCES;

export type AccountOrphans = Record<AccountOrphanKey, InspectedCollection>;

type InspectedAccount = InspectedEntry & {numberOfUsers?: number};

type InspectedProjectMembership = InspectedEntry & {
	r_accountEntryToProjectMembership_accountEntryId?: number;
	r_userToProjectMembership_userId?: number;
};

async function getAccountsWithoutUsers(): Promise<InspectedCollection> {
	const accounts = await fetchInspectedCollection<InspectedAccount>(
		'/o/headless-admin-user/v1.0/accounts',
		{sort: 'name:asc'}
	);

	if (accounts.error || accounts.truncated) {
		return toUncheckedCollection();
	}

	const items = accounts.items.filter(({numberOfUsers}) => !numberOfUsers);

	return {items, totalCount: items.length};
}

async function getUserAccountIds(userIds: number[]) {
	const batches = Array.from(
		{length: Math.ceil(userIds.length / USER_BATCH_SIZE)},
		(_, index) =>
			userIds.slice(
				index * USER_BATCH_SIZE,
				(index + 1) * USER_BATCH_SIZE
			)
	);

	const users = await Promise.all(
		batches.map((batch) =>
			fetchInspectedCollection<InspectedUser>(
				'/o/headless-admin-user/v1.0/user-accounts',
				{filter: SearchBuilder.in('id', batch.map(String))}
			)
		)
	);

	if (users.some(({error, truncated}) => error || truncated)) {
		return null;
	}

	return new Map(
		users
			.flatMap(({items}) => items)
			.map(({accountBriefs, id}) => [
				id,
				new Set(
					(accountBriefs ?? []).map((accountBrief) => accountBrief.id)
				),
			])
	);
}

async function getProjectMembershipsOutsideAccount(): Promise<InspectedCollection> {
	const projectMemberships =
		await fetchInspectedCollection<InspectedProjectMembership>(
			'/o/c/projectmemberships'
		);

	if (projectMemberships.error || projectMemberships.truncated) {
		return toUncheckedCollection();
	}

	const userAccountIds = await getUserAccountIds([
		...new Set(
			projectMemberships.items
				.map(
					(projectMembership) =>
						projectMembership.r_userToProjectMembership_userId
				)
				.filter((userId): userId is number => Boolean(userId))
		),
	]);

	if (!userAccountIds) {
		return toUncheckedCollection();
	}

	const items = projectMemberships.items.filter(
		({
			r_accountEntryToProjectMembership_accountEntryId: accountId,
			r_userToProjectMembership_userId: userId,
		}) => !userAccountIds.get(userId ?? 0)?.has(accountId ?? 0)
	);

	return {items, totalCount: items.length};
}

async function getAccountOrphans(): Promise<AccountOrphans> {
	const noAccountEntries = Object.entries(NO_ACCOUNT_SOURCES);

	const [accountsWithoutUsers, projectMembershipsOutsideAccount, ...rest] =
		await Promise.all([
			getAccountsWithoutUsers(),
			getProjectMembershipsOutsideAccount(),
			...noAccountEntries.map(([, {field, path}]) =>
				fetchInspectedCollection<InspectedEntry>(path, {
					filter: SearchBuilder.eq(field, '0'),
				})
			),
		]);

	return {
		accountsWithoutUsers,
		projectMembershipsOutsideAccount,
		...Object.fromEntries(
			noAccountEntries.map(([key], index) => [key, rest[index]])
		),
	} as AccountOrphans;
}

export function accountOrphansQuery(): DataQuery<AccountOrphans> {
	return {
		fetcher: getAccountOrphans,
		key: '/account-orphans',
	};
}
