/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';
import {useDataQuery} from '~/hooks/useDataQuery';
import {Liferay} from '~/services/liferay/liferay';

import {useUserProjects} from './useUserProjects';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

vi.mock('~/hooks/useDataQuery', () => ({
	useDataQuery: vi.fn(),
}));

vi.mock('~/services/graphql/GraphQL', () => ({
	queryGraphQL: vi.fn(),
	toGraphQLString: (value: string) => JSON.stringify(value),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {
			account: {accountId: 100, accountName: 'Account'},
		},
		ThemeDisplay: {
			getUserId: () => '42',
		},
	},
}));

const mockedUseDataQuery = vi.mocked(useDataQuery);
const mockedUseOneContext = vi.mocked(useOneContext);

const projectItems = [
	{
		externalReferenceCode: 'PRJCT-1',
		id: 1,
		liferayVersion: '2025.Q1',
		name: 'Alpha',
	},
	{
		externalReferenceCode: 'PRJCT-2',
		id: 2,
		liferayVersion: '2025.Q2',
		name: 'Beta',
	},
];

function mockQueries({
	membershipERCs = [],
	membershipsLoading = false,
	projects = projectItems,
	projectsLoading = false,
}: {
	membershipERCs?: string[];
	membershipsLoading?: boolean;
	projects?: typeof projectItems;
	projectsLoading?: boolean;
}) {
	mockedUseDataQuery.mockImplementation(({key}) => {
		if (key?.startsWith('/o/c/projectmemberships')) {
			return {
				data: {
					items: membershipERCs.map((externalReferenceCode) => ({
						r_projectToProjectMembership_c_projectERC:
							externalReferenceCode,
					})),
				},
				isLoading: membershipsLoading,
			} as unknown as ReturnType<typeof useDataQuery>;
		}

		return {
			data: {items: projects, totalCount: projects.length},
			isLoading: projectsLoading,
		} as unknown as ReturnType<typeof useDataQuery>;
	});
}

function mockUserAccountModel(userAccountModel: Record<string, unknown>) {
	mockedUseOneContext.mockReturnValue({
		userAccountModel: {
			hasAccountRoleName: () => false,
			...userAccountModel,
		},
	} as unknown as ReturnType<typeof useOneContext>);
}

function membershipsKey() {
	return mockedUseDataQuery.mock.calls
		.map(([query]) => query.key)
		.find((key) => key?.startsWith('/o/c/projectmemberships'));
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEUSERPROJECTS] useUserProjects', () => {
	beforeEach(() => {
		mockedUseDataQuery.mockReset();
		mockedUseOneContext.mockReset();
		Liferay.CommerceContext.account = {
			accountId: 100,
			accountName: 'Account',
		};
	});

	it.each([
		'canManageAllAccounts',
		'isAccountAdministrator',
		'isAccountMember',
	])(
		'shows every account project to %s and marks the projects the user is a member of',
		(roleFlag) => {
			mockUserAccountModel({[roleFlag]: true});
			mockQueries({membershipERCs: ['PRJCT-2']});

			const {result} = renderHook(() => useUserProjects());

			expect(membershipsKey()).toMatch(/^\/o\/c\/projectmemberships\?/);
			expect(result.current.projects).toEqual([
				{...projectItems[0], member: false},
				{...projectItems[1], member: true},
			]);
			expect(result.current.hasAccountProjects).toBe(true);
		}
	);

	it.each([
		'Partner Account Admin',
		'Partner Manager',
		'Partner Marketing User',
		'Partner Member',
		'Partner Sales User',
		'Partner Technical User',
	])(
		'shows every account project to the %s role and marks the projects the user is a member of',
		(roleName) => {
			mockUserAccountModel({
				hasAccountRoleName: (accountRoleName: string) =>
					accountRoleName === roleName,
			});
			mockQueries({membershipERCs: ['PRJCT-1']});

			const {result} = renderHook(() => useUserProjects());

			expect(membershipsKey()).toMatch(/^\/o\/c\/projectmemberships\?/);
			expect(result.current.projects).toEqual([
				{...projectItems[0], member: true},
				{...projectItems[1], member: false},
			]);
		}
	);

	it('shows other users only the projects with a membership record', () => {
		mockUserAccountModel({});
		mockQueries({membershipERCs: ['PRJCT-2']});

		const {result} = renderHook(() => useUserProjects());

		expect(
			new URLSearchParams(membershipsKey()?.split('?')[1]).get('filter')
		).toBe(
			"r_accountEntryToProjectMembership_accountEntryId eq '100' and r_userToProjectMembership_userId eq '42'"
		);
		expect(result.current.projects).toEqual([
			{...projectItems[1], member: true},
		]);
	});

	it('reports account projects even when the user has no memberships', () => {
		mockUserAccountModel({});
		mockQueries({});

		const {result} = renderHook(() => useUserProjects());

		expect(result.current.projects).toEqual([]);
		expect(result.current.hasAccountProjects).toBe(true);
	});

	it('reports no account projects when the account has none', () => {
		mockUserAccountModel({canManageAllAccounts: true});
		mockQueries({projects: []});

		const {result} = renderHook(() => useUserProjects());

		expect(result.current.hasAccountProjects).toBe(false);
		expect(result.current.projects).toEqual([]);
	});

	it('queries the projects of the current account', () => {
		mockUserAccountModel({canManageAllAccounts: true});
		mockQueries({});

		renderHook(() => useUserProjects());

		expect(
			mockedUseDataQuery.mock.calls.map(([query]) => query.key)
		).toContain('/graphql/projects/100');
	});

	it('skips both queries without an account', () => {
		Liferay.CommerceContext.account = undefined;
		mockUserAccountModel({});
		mockQueries({});

		renderHook(() => useUserProjects());

		expect(
			mockedUseDataQuery.mock.calls.map(([query]) => query.key)
		).toEqual([null, null]);
	});

	it.each([
		[true, false, true],
		[false, true, true],
		[false, false, false],
	])(
		'combines the membership loading %s and project loading %s into %s',
		(membershipsLoading, projectsLoading, loading) => {
			mockUserAccountModel({});
			mockQueries({membershipsLoading, projectsLoading});

			const {result} = renderHook(() => useUserProjects());

			expect(result.current.loading).toBe(loading);
		}
	);
});
