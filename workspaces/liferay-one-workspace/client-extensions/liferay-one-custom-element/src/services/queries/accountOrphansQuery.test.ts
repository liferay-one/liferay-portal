/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import {accountOrphansQuery} from './accountOrphansQuery';

const mocks = vi.hoisted(() => ({fetcher: vi.fn()}));

vi.mock('~/services/fetcher/fetcher', () => ({default: mocks.fetcher}));

function toPage(items: unknown[]) {
	return {items, totalCount: items.length};
}

type Responder = (url: URL) => unknown;

function mockResponses(responder: Responder) {
	mocks.fetcher.mockImplementation(async (url: string) => {
		const response = responder(new URL(url, 'http://x'));

		if (response instanceof Error) {
			throw response;
		}

		return response ?? toPage([]);
	});
}

const MEMBERSHIPS = [
	{
		id: 1,
		r_accountEntryToProjectMembership_accountEntryId: 10,
		r_userToProjectMembership_userId: 100,
	},
	{
		id: 2,
		r_accountEntryToProjectMembership_accountEntryId: 20,
		r_userToProjectMembership_userId: 100,
	},
	{
		id: 3,
		r_accountEntryToProjectMembership_accountEntryId: 10,
		r_userToProjectMembership_userId: 300,
	},
];

describe('[CLIENT-QUERIES-ACCOUNTORPHANSQUERY] accountOrphansQuery', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
	});

	it('filters each object by an empty relationship', async () => {
		mockResponses(() => toPage([]));

		await accountOrphansQuery().fetcher();

		const filters = mocks.fetcher.mock.calls.map(([url]) => {
			const {pathname, searchParams} = new URL(url, 'http://x');

			return `${pathname} ${searchParams.get('filter') ?? ''}`;
		});

		expect(filters).toEqual(
			expect.arrayContaining([
				"/o/c/projects r_accountEntryToProject_accountEntryId eq '0'",
				"/o/c/entitlements r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId eq '0'",
				"/o/c/licensekeys r_accountEntryToLicenseKey_accountEntryId eq '0'",
			])
		);
	});

	it('lists the accounts without users', async () => {
		mockResponses(({pathname}) =>
			pathname === '/o/headless-admin-user/v1.0/accounts'
				? toPage([
						{id: 1, numberOfUsers: 0},
						{id: 2, numberOfUsers: 3},
					])
				: undefined
		);

		const {accountsWithoutUsers} = await accountOrphansQuery().fetcher();

		expect(accountsWithoutUsers.items.map(({id}) => id)).toEqual([1]);
	});

	it('lists the memberships whose user is not in the account, reading the users in one batch', async () => {
		mockResponses(({pathname}) => {
			if (pathname === '/o/c/projectmemberships') {
				return toPage(MEMBERSHIPS);
			}

			if (pathname === '/o/headless-admin-user/v1.0/user-accounts') {
				return toPage([{accountBriefs: [{id: 10}], id: 100}]);
			}
		});

		const {projectMembershipsOutsideAccount} =
			await accountOrphansQuery().fetcher();

		expect(
			projectMembershipsOutsideAccount.items.map(({id}) => id)
		).toEqual([2, 3]);

		const userRequests = mocks.fetcher.mock.calls
			.map(([url]) => new URL(url, 'http://x'))
			.filter(
				({pathname}) =>
					pathname === '/o/headless-admin-user/v1.0/user-accounts'
			);

		expect(userRequests).toHaveLength(1);
		expect(userRequests[0].searchParams.get('filter')).toBe(
			"id in ('100','300')"
		);
	});

	it('reports a list as not checked when its records fail to load', async () => {
		mockResponses(({pathname}) =>
			pathname === '/o/headless-admin-user/v1.0/user-accounts'
				? new FetcherError('Forbidden')
				: pathname === '/o/c/projectmemberships'
					? toPage(MEMBERSHIPS)
					: undefined
		);

		const {projectMembershipsOutsideAccount} =
			await accountOrphansQuery().fetcher();

		expect(projectMembershipsOutsideAccount.items).toEqual([]);
		expect(projectMembershipsOutsideAccount.error).toBeTruthy();
	});
});
