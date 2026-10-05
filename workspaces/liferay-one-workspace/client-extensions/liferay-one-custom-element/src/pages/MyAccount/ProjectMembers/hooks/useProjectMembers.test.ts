/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProjectMembers} from './useProjectMembers';

const mocks = vi.hoisted(() => ({
	contactRoles: {
		contactRoleExternalReferenceCodesByProjectId: new Map<
			number,
			string[]
		>(),
		loading: false,
	},
	fetchResponses: {} as Record<
		string,
		{data?: unknown; isLoading?: boolean; mutate?: () => Promise<void>}
	>,
	liferay: {
		CommerceContext: {
			account: {accountId: 7 as number | null},
		},
	},
	useFetch: vi.fn(),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: mocks.useFetch,
}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useAccountProjectContactRoles: () => mocks.contactRoles,
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: mocks.liferay,
}));

const PROJECTS_URL = '/o/c/projects';
const MEMBERSHIPS_URL = '/o/c/projectmemberships';
const USER_ACCOUNTS_URL =
	'/o/headless-admin-user/v1.0/accounts/7/user-accounts';
const ACCOUNT_ROLES_URL =
	'/o/headless-admin-user/v1.0/accounts/7/account-roles';

function membership(
	id: number,
	projectExternalReferenceCode: string,
	userId: number,
	roleExternalReferenceCode: string
) {
	return {
		id,
		r_projectToProjectMembership_c_projectERC: projectExternalReferenceCode,
		r_userToProjectMembership_userId: userId,
		roleExternalReferenceCode,
	};
}

function userAccount(
	id: number,
	name: string,
	roleBriefs: {id: number; name: string}[]
) {
	return {
		accountBriefs: [
			{id: 99, roleBriefs: [{id: 500, name: 'Other Account Role'}]},
			{id: 7, roleBriefs},
		],
		emailAddress: `${name || 'unnamed'}@example.com`,
		id,
		name,
	};
}

function setDefaultResponses() {
	mocks.fetchResponses = {
		[ACCOUNT_ROLES_URL]: {
			data: {
				items: [
					{
						externalReferenceCode: 'ROLE_TECH',
						name: 'Technical Contact',
					},
					{
						externalReferenceCode: 'ROLE_BILLING',
						name: 'Billing Contact',
					},
					{externalReferenceCode: '', name: 'No ERC Role'},
				],
			},
		},
		[MEMBERSHIPS_URL]: {
			data: {
				items: [
					membership(1, 'PRJ-A', 10, 'C_PROJECT_USER'),
					membership(2, 'PRJ-A', 11, 'C_PROJECT_ADMIN'),
					membership(3, 'PRJ-A', 12, 'C_UNKNOWN_ROLE'),
					membership(4, 'PRJ-A', 13, 'C_PROJECT_REQUESTER'),
					membership(5, 'PRJ-B', 10, 'C_PROJECT_USER'),
				],
			},
		},
		[PROJECTS_URL]: {
			data: {
				items: [
					{externalReferenceCode: 'PRJ-A', id: 100, name: 'Alpha'},
					{externalReferenceCode: 'PRJ-B', id: 200, name: 'Beta'},
					{externalReferenceCode: 'PRJ-C', id: 300, name: 'Gamma'},
				],
			},
		},
		[USER_ACCOUNTS_URL]: {
			data: {
				items: [
					userAccount(10, 'Zoe', [
						{id: 1, name: 'Technical Contact'},
						{id: 2, name: 'Account Member'},
					]),
					userAccount(11, 'Adam', [{id: 3, name: 'Billing Contact'}]),
					userAccount(13, '', []),
				],
			},
		},
	};
}

describe('[HOOK-MYACCOUNT-PROJECTMEMBERS-USEPROJECTMEMBERS] useProjectMembers', () => {
	beforeEach(() => {
		mocks.liferay.CommerceContext.account.accountId = 7;
		mocks.contactRoles = {
			contactRoleExternalReferenceCodesByProjectId: new Map([
				[100, ['ROLE_TECH', 'ROLE_MISSING']],
				[200, ['ROLE_BILLING']],
			]),
			loading: false,
		};
		mocks.useFetch.mockReset();
		mocks.useFetch.mockImplementation((url: string | null) => ({
			data: undefined,
			isLoading: false,
			mutate: vi.fn(() => Promise.resolve()),
			...(url ? mocks.fetchResponses[url] : {}),
		}));

		setDefaultResponses();
	});

	it('does not fetch anything without an account', () => {
		mocks.liferay.CommerceContext.account.accountId = null;

		const {result} = renderHook(() => useProjectMembers());

		for (const [url] of mocks.useFetch.mock.calls) {
			expect(url).toBeNull();
		}

		expect(result.current.rows).toEqual([]);
		expect(result.current.accountMemberOptions).toEqual([]);
	});

	it('exposes account member options with the role IDs of the current account', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.accountMemberOptions).toEqual([
			{
				accountRoleIds: [1, 2],
				email: 'Zoe@example.com',
				name: 'Zoe',
				userId: 10,
			},
			{
				accountRoleIds: [3],
				email: 'Adam@example.com',
				name: 'Adam',
				userId: 11,
			},
			{
				accountRoleIds: [],
				email: 'unnamed@example.com',
				name: '',
				userId: 13,
			},
		]);
	});

	it('flags hasProjectAdmin only for projects with a project admin member', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({externalReferenceCode, hasProjectAdmin}) => [
					externalReferenceCode,
					hasProjectAdmin,
				]
			)
		).toEqual([
			['PRJ-A', true],
			['PRJ-B', false],
			['PRJ-C', false],
		]);
	});

	it('groups memberships by project and keeps only members with a known project role', () => {
		const {result} = renderHook(() => useProjectMembers());

		const [alpha, beta, gamma] = result.current.rows;

		expect(alpha.members.map(({membershipId}) => membershipId)).toEqual([
			2, 1, 4,
		]);
		expect(beta.members.map(({userId}) => userId)).toEqual([10]);
		expect(gamma.members).toEqual([]);
	});

	it('lists available designations per project from the contact role names', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({availableDesignations}) => availableDesignations
			)
		).toEqual([['Technical Contact'], ['Billing Contact'], []]);
	});

	it('reports loading when any query is loading', () => {
		mocks.fetchResponses[MEMBERSHIPS_URL].isLoading = true;

		const {rerender, result} = renderHook(() => useProjectMembers());

		expect(result.current.loading).toBe(true);

		mocks.fetchResponses[MEMBERSHIPS_URL].isLoading = false;
		mocks.contactRoles = {...mocks.contactRoles, loading: true};

		rerender();

		expect(result.current.loading).toBe(true);

		mocks.contactRoles = {...mocks.contactRoles, loading: false};

		rerender();

		expect(result.current.loading).toBe(false);
	});

	it('resolves member details and lists designations only for contact role names', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.rows[0].members).toEqual([
			{
				accountRoleIds: [3],
				designations: ['Billing Contact'],
				email: 'Adam@example.com',
				membershipId: 2,
				name: 'Adam',
				roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				userId: 11,
			},
			{
				accountRoleIds: [1, 2],
				designations: ['Technical Contact'],
				email: 'Zoe@example.com',
				membershipId: 1,
				name: 'Zoe',
				roleExternalReferenceCode: 'C_PROJECT_USER',
				userId: 10,
			},
			{
				accountRoleIds: [],
				designations: [],
				email: 'unnamed@example.com',
				membershipId: 4,
				name: '',
				roleExternalReferenceCode: 'C_PROJECT_REQUESTER',
				userId: 13,
			},
		]);
	});

	it('revalidates memberships and user accounts on mutate', async () => {
		const mutateMemberships = vi.fn(() => Promise.resolve());
		const mutateUserAccounts = vi.fn(() => Promise.resolve());

		mocks.fetchResponses[MEMBERSHIPS_URL].mutate = mutateMemberships;
		mocks.fetchResponses[USER_ACCOUNTS_URL].mutate = mutateUserAccounts;

		const {result} = renderHook(() => useProjectMembers());

		await result.current.mutate();

		expect(mutateMemberships).toHaveBeenCalledTimes(1);
		expect(mutateUserAccounts).toHaveBeenCalledTimes(1);
	});

	it('sorts members by name with unnamed members last', () => {
		mocks.fetchResponses[MEMBERSHIPS_URL].data = {
			items: [
				membership(1, 'PRJ-A', 13, 'C_PROJECT_USER'),
				membership(2, 'PRJ-A', 10, 'C_PROJECT_USER'),
				membership(3, 'PRJ-A', 99, 'C_PROJECT_USER'),
				membership(4, 'PRJ-A', 11, 'C_PROJECT_USER'),
			],
		};

		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.rows[0].members.map(({name}) => name)).toEqual([
			'Adam',
			'Zoe',
			'',
			'',
		]);
	});
});
