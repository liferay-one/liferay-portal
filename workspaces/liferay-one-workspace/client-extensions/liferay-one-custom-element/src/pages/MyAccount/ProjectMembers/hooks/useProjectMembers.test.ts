/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Projects from '~/services/spring-boot/Projects';

import {useProjectMembers} from './useProjectMembers';

import type {Designation} from '~/pages/MyAccount/ProjectMembers/types';

const mocks = vi.hoisted(() => ({
	contactRoles: {
		data: undefined as Record<string, Designation[]> | undefined,
		isLoading: false,
		mutate: vi.fn(),
	},
	fetchResponses: {} as Record<
		string,
		{data?: unknown; isLoading?: boolean; mutate?: () => Promise<void>}
	>,
	liferay: {
		CommerceContext: {
			account: {accountId: 7 as number | null},
		},
		ThemeDisplay: {
			getUserId: (): string => '10',
		},
	},
	oneContext: {
		userAccountModel: {
			hasAccountRoleName: () => false,
			isAccountMember: true,
		},
	},
	projectOrders: {
		error: undefined as unknown,
		loading: false,
		placedOrders: [] as unknown[],
	},
	useDataQuery: vi.fn(),
	useFetch: vi.fn(),
	useObjectItems: vi.fn(),
}));

vi.mock('~/hooks/useDataQuery', () => ({
	useDataQuery: mocks.useDataQuery,
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => mocks.oneContext,
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: mocks.useFetch,
}));

vi.mock('~/hooks/useObjectItems', () => ({
	default: mocks.useObjectItems,
}));

vi.mock('~/hooks/useProjectOrders', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/hooks/useProjectOrders')>()),
	useProjectOrders: () => mocks.projectOrders,
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: mocks.liferay,
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {getContactRoles: vi.fn()},
}));

const PROJECTS_URL = '/o/c/projects';
const MEMBERSHIPS_URL = '/o/c/projectmemberships';
const USER_ACCOUNTS_URL =
	'/o/headless-admin-user/v1.0/accounts/7/user-accounts';

const BILLING_DESIGNATION = {
	externalReferenceCode: 'ROLE_BILLING',
	name: 'Billing Contact',
};

const TECH_DESIGNATION = {
	externalReferenceCode: 'ROLE_TECH',
	name: 'Technical Contact',
};

function getContactRolesQuery() {
	const [query] = mocks.useDataQuery.mock.lastCall ?? [];

	return query as {
		fetcher: () => Promise<Record<string, Designation[]>>;
		key: string | null;
	};
}

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

function order(projectName: string) {
	return {customFields: {projectName}};
}

function setDefaultResponses() {
	mocks.projectOrders = {
		error: undefined,
		loading: false,
		placedOrders: [order('Alpha'), order('Beta'), order('Gamma')],
	};

	mocks.fetchResponses = {
		[MEMBERSHIPS_URL]: {
			data: {
				items: [
					membership(1, 'PRJ-A', 10, 'C_PROJECT_USER'),
					membership(2, 'PRJ-A', 11, 'C_PROJECT_ADMIN'),
					membership(3, 'PRJ-A', 12, 'C_UNKNOWN_ROLE'),
					membership(4, 'PRJ-A', 13, 'C_PROJECT_REQUESTER'),
					membership(5, 'PRJ-B', 10, 'C_PROJECT_USER'),
					membership(6, 'PRJ-A', 10, 'ROLE_TECH'),
					membership(7, 'PRJ-A', 11, 'ROLE_BILLING'),
					membership(8, 'PRJ-B', 10, 'ROLE_TECH'),
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
		mocks.liferay.ThemeDisplay.getUserId = () => '10';
		mocks.oneContext.userAccountModel.isAccountMember = true;
		mocks.contactRoles = {
			data: {
				'PRJ-A': [TECH_DESIGNATION, BILLING_DESIGNATION],
				'PRJ-B': [BILLING_DESIGNATION, TECH_DESIGNATION],
			},
			isLoading: false,
			mutate: vi.fn(() => Promise.resolve()),
		};
		mocks.useDataQuery.mockReset();
		mocks.useDataQuery.mockImplementation(() => mocks.contactRoles);
		vi.mocked(Projects.getContactRoles).mockReset();
		mocks.useFetch.mockReset();
		mocks.useFetch.mockImplementation((url: string | null) => ({
			data: undefined,
			isLoading: false,
			mutate: vi.fn(() => Promise.resolve()),
			...(url ? mocks.fetchResponses[url] : {}),
		}));

		mocks.useObjectItems.mockReset();
		mocks.useObjectItems.mockImplementation((path: string | null) => {
			const {data, error, isLoading, mutate} = mocks.useFetch(path) ?? {};

			return {
				error,
				items: data?.items,
				loading: isLoading,
				revalidate: mutate,
			};
		});

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

	it('exposes the account members as options', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.accountMemberOptions).toEqual([
			{
				email: 'Zoe@example.com',
				name: 'Zoe',
				userId: 10,
			},
			{
				email: 'Adam@example.com',
				name: 'Adam',
				userId: 11,
			},
			{
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

	it('hides a project that has no placed order', () => {
		mocks.projectOrders.placedOrders = [
			order('Alpha'),
			{customFields: {salesforceProjectId: 'PRJ-C'}},
		];

		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({externalReferenceCode}) => externalReferenceCode
			)
		).toEqual(['PRJ-A', 'PRJ-C']);
	});

	it('lists every project when the orders cannot be read', () => {
		mocks.projectOrders = {
			error: new Error('Unable to read orders'),
			loading: false,
			placedOrders: [],
		};

		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({externalReferenceCode}) => externalReferenceCode
			)
		).toEqual(['PRJ-A', 'PRJ-B', 'PRJ-C']);
	});

	it('reports loading while the orders load', () => {
		mocks.projectOrders = {...mocks.projectOrders, loading: true};

		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.loading).toBe(true);
	});

	it('lists only the projects of the current user without an account role', () => {
		mocks.oneContext.userAccountModel.isAccountMember = false;

		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({externalReferenceCode}) => externalReferenceCode
			)
		).toEqual(['PRJ-A', 'PRJ-B']);
	});

	it('lists the available designations of each project from Spring Boot', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(
			result.current.rows.map(
				({availableDesignations}) => availableDesignations
			)
		).toEqual([
			[TECH_DESIGNATION, BILLING_DESIGNATION],
			[BILLING_DESIGNATION, TECH_DESIGNATION],
			[],
		]);
	});

	it('requests the contact roles of the visible projects only', () => {
		mocks.oneContext.userAccountModel.isAccountMember = false;

		renderHook(() => useProjectMembers());

		expect(getContactRolesQuery().key).toBe(
			'/project-contact-roles/PRJ-A,PRJ-B'
		);
	});

	it('requests no contact roles when no project is visible', () => {
		mocks.fetchResponses[PROJECTS_URL].data = {items: []};

		renderHook(() => useProjectMembers());

		expect(getContactRolesQuery().key).toBeNull();
	});

	it('reads the contact roles of every visible project in one request', async () => {
		vi.mocked(Projects.getContactRoles).mockResolvedValue({
			'PRJ-A': [TECH_DESIGNATION],
			'PRJ-C': [BILLING_DESIGNATION],
		});

		renderHook(() => useProjectMembers());

		await expect(getContactRolesQuery().fetcher()).resolves.toEqual({
			'PRJ-A': [TECH_DESIGNATION],
			'PRJ-C': [BILLING_DESIGNATION],
		});

		expect(Projects.getContactRoles).toHaveBeenCalledTimes(1);
		expect(Projects.getContactRoles).toHaveBeenCalledWith([
			'PRJ-A',
			'PRJ-B',
			'PRJ-C',
		]);
	});

	it('fails the contact roles query when the contact roles cannot be read', async () => {
		vi.mocked(Projects.getContactRoles).mockRejectedValue(
			new Error('Unable to read contact roles')
		);

		renderHook(() => useProjectMembers());

		await expect(getContactRolesQuery().fetcher()).rejects.toThrow(
			'Unable to read contact roles'
		);
	});

	it('requests the contact roles in groups of 100 projects', async () => {
		mocks.fetchResponses[PROJECTS_URL].data = {
			items: Array.from({length: 150}, (_, index) => ({
				externalReferenceCode: `PRJ-${index}`,
				id: index,
				name: `Project ${index}`,
			})),
		};
		mocks.projectOrders.error = new Error('Unable to read orders');

		vi.mocked(Projects.getContactRoles).mockImplementation(
			async (projectExternalReferenceCodes) =>
				Object.fromEntries(
					projectExternalReferenceCodes.map(
						(projectExternalReferenceCode) => [
							projectExternalReferenceCode,
							[TECH_DESIGNATION],
						]
					)
				)
		);

		renderHook(() => useProjectMembers());

		const designationsByProject = await getContactRolesQuery().fetcher();

		expect(Projects.getContactRoles).toHaveBeenCalledTimes(2);
		expect(
			vi
				.mocked(Projects.getContactRoles)
				.mock.calls.map(
					([projectExternalReferenceCodes]) =>
						projectExternalReferenceCodes.length
				)
		).toEqual([100, 50]);
		expect(Object.keys(designationsByProject)).toHaveLength(150);
	});

	it('shows the designations to a project admin without an account role', () => {
		mocks.oneContext.userAccountModel.isAccountMember = false;
		mocks.liferay.ThemeDisplay.getUserId = () => '11';

		const {result} = renderHook(() => useProjectMembers());

		const [alpha] = result.current.rows;

		expect(alpha.externalReferenceCode).toBe('PRJ-A');
		expect(alpha.availableDesignations).toEqual([
			TECH_DESIGNATION,
			BILLING_DESIGNATION,
		]);
	});

	it('reads designations from the memberships of each project only', () => {
		mocks.contactRoles = {
			data: {
				'PRJ-A': [TECH_DESIGNATION],
				'PRJ-B': [TECH_DESIGNATION],
			},
			isLoading: false,
			mutate: vi.fn(() => Promise.resolve()),
		};
		mocks.fetchResponses[MEMBERSHIPS_URL].data = {
			items: [
				membership(1, 'PRJ-A', 10, 'C_PROJECT_USER'),
				membership(2, 'PRJ-A', 10, 'ROLE_TECH'),
				membership(3, 'PRJ-B', 10, 'C_PROJECT_USER'),
			],
		};

		const {result} = renderHook(() => useProjectMembers());

		const [alpha, beta] = result.current.rows;

		expect(alpha.members[0].designations).toEqual(['ROLE_TECH']);
		expect(beta.members[0].designations).toEqual([]);
	});

	it('reports loading when any query is loading', () => {
		mocks.fetchResponses[MEMBERSHIPS_URL].isLoading = true;

		const {rerender, result} = renderHook(() => useProjectMembers());

		expect(result.current.loading).toBe(true);

		mocks.fetchResponses[MEMBERSHIPS_URL].isLoading = false;
		mocks.contactRoles = {...mocks.contactRoles, isLoading: true};

		rerender();

		expect(result.current.loading).toBe(true);

		mocks.contactRoles = {...mocks.contactRoles, isLoading: false};

		rerender();

		expect(result.current.loading).toBe(false);
	});

	it('resolves member details and lists the designations each member holds on the project', () => {
		const {result} = renderHook(() => useProjectMembers());

		expect(result.current.rows[0].members).toEqual([
			{
				designations: ['ROLE_BILLING'],
				email: 'Adam@example.com',
				membershipId: 2,
				name: 'Adam',
				roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				userId: 11,
			},
			{
				designations: ['ROLE_TECH'],
				email: 'Zoe@example.com',
				membershipId: 1,
				name: 'Zoe',
				roleExternalReferenceCode: 'C_PROJECT_USER',
				userId: 10,
			},
			{
				designations: [],
				email: 'unnamed@example.com',
				membershipId: 4,
				name: '',
				roleExternalReferenceCode: 'C_PROJECT_REQUESTER',
				userId: 13,
			},
		]);
		expect(result.current.rows[1].members[0].designations).toEqual([
			'ROLE_TECH',
		]);
	});

	it('revalidates the contact roles, memberships, and user accounts on mutate', async () => {
		const mutateMemberships = vi.fn(() => Promise.resolve());
		const mutateUserAccounts = vi.fn(() => Promise.resolve());

		mocks.fetchResponses[MEMBERSHIPS_URL].mutate = mutateMemberships;
		mocks.fetchResponses[USER_ACCOUNTS_URL].mutate = mutateUserAccounts;

		const {result} = renderHook(() => useProjectMembers());

		await result.current.mutate();

		expect(mocks.contactRoles.mutate).toHaveBeenCalledTimes(1);
		expect(mutateMemberships).toHaveBeenCalledTimes(1);
		expect(mutateUserAccounts).toHaveBeenCalledTimes(1);
	});

	it('reads every page of the memberships and the account user accounts', () => {
		renderHook(() => useProjectMembers());

		expect(mocks.useObjectItems).toHaveBeenCalledWith(
			MEMBERSHIPS_URL,
			expect.objectContaining({
				filter: "r_accountEntryToProjectMembership_accountEntryId eq '7'",
			})
		);
		expect(mocks.useObjectItems).toHaveBeenCalledWith(USER_ACCOUNTS_URL, {
			sort: 'givenName:asc',
		});
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
