/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useAccountMembers} from './useAccountMembers';

type FetchResult = {
	data?: unknown;
	error?: unknown;
	isLoading?: boolean;
	mutate?: () => Promise<unknown>;
};

const mocks = vi.hoisted(() => ({
	fetchResults: {} as Record<string, FetchResult>,
	getInvitations: vi.fn(),
	swrResult: {} as FetchResult,
	useFetch: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: mocks.useFetch,
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {account: {accountId: 10}},
		ThemeDisplay: {getUserId: () => '1'},
	},
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {getInvitations: mocks.getInvitations},
}));

const ACCOUNT_URL = '/o/headless-admin-user/v1.0/accounts/10';
const PROJECTS_URL = '/o/c/projects';
const USER_ACCOUNTS_URL =
	'/o/headless-admin-user/v1.0/accounts/10/user-accounts';

function userAccount(
	id: number,
	name: string,
	emailAddress: string,
	roleNames: string[]
) {
	return {
		accountBriefs: [
			{id: 99, roleBriefs: [{id: 900, name: 'Account Administrator'}]},
			{
				id: 10,
				roleBriefs: roleNames.map((roleName, index) => ({
					id: id * 100 + index,
					name: roleName,
				})),
			},
		],
		emailAddress,
		id,
		image: `/image/${id}`,
		name,
	};
}

function invitation(values: Record<string, unknown>) {
	return {familyName: '', givenName: '', roleNames: [], ...values};
}

function setUp({
	invitations = [] as object[],
	userAccounts = [] as object[],
} = {}) {
	mocks.fetchResults = {
		[ACCOUNT_URL]: {data: {externalReferenceCode: 'ACCNT-1'}},
		[PROJECTS_URL]: {
			data: {
				items: [{externalReferenceCode: 'PRJCT-1', name: 'Alpha'}],
			},
		},
		[USER_ACCOUNTS_URL]: {
			data: {items: userAccounts},
			mutate: vi.fn().mockResolvedValue(undefined),
		},
	};
	mocks.swrResult = {
		data: invitations,
		mutate: vi.fn().mockResolvedValue(undefined),
	};
}

describe('[HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERS] useAccountMembers', () => {
	beforeEach(() => {
		mocks.useFetch.mockReset();
		mocks.useFetch.mockImplementation(
			(url: string | null) => (url && mocks.fetchResults[url]) || {}
		);
		mocks.useSWR.mockReset();
		mocks.useSWR.mockImplementation(() => mocks.swrResult);
	});

	it('builds active rows from the account user accounts with the account role briefs and flags', () => {
		setUp({
			userAccounts: [
				userAccount(1, 'Ann', 'ann@x.com', [
					'Account Member',
					'Account Administrator',
				]),
				userAccount(2, 'Bob', 'bob@x.com', ['Account Buyer']),
			],
		});

		const {result} = renderHook(() => useAccountMembers());

		expect(result.current.rows).toEqual([
			{
				email: 'ann@x.com',
				id: 1,
				image: '/image/1',
				invitationIds: [],
				isAdministrator: true,
				isCurrentUser: true,
				name: 'Ann',
				roleBriefs: [
					{id: 100, name: 'Account Member'},
					{id: 101, name: 'Account Administrator'},
				],
				roleNames: ['Account Administrator', 'Account Member'],
				status: 'active',
			},
			expect.objectContaining({
				id: 2,
				isAdministrator: false,
				isCurrentUser: false,
				roleNames: ['Account Buyer'],
			}),
		]);
		expect(result.current.projectNamesByExternalReferenceCode).toEqual({
			'PRJCT-1': 'Alpha',
		});
		expect(mocks.useSWR).toHaveBeenCalledWith(
			['account-invitations', 'ACCNT-1'],
			expect.any(Function)
		);
	});

	it('drops account invitations for existing members but keeps project scoped ones and labels them with the project name and role', () => {
		setUp({
			invitations: [
				invitation({
					emailAddress: 'ANN@x.com',
					givenName: 'Ann',
					id: 11,
				}),
				invitation({
					emailAddress: 'ann@x.com',
					givenName: 'Ann',
					id: 12,
					projectExternalReferenceCode: 'PRJCT-1',
					projectRoleExternalReferenceCode: 'C_PROJECT_ADMIN',
				}),
				invitation({
					emailAddress: 'ann@x.com',
					givenName: 'Ann',
					id: 13,
					projectExternalReferenceCode: 'PRJCT-404',
					projectRoleExternalReferenceCode: 'UNKNOWN',
				}),
			],
			userAccounts: [userAccount(1, 'Ann', 'ann@x.com', [])],
		});

		const {result} = renderHook(() => useAccountMembers());

		const invitedRows = result.current.rows.filter(
			({status}) => status === 'invited'
		);

		expect(
			invitedRows.map(({id, projectRoleName}) => [id, projectRoleName])
		).toEqual([
			[12, 'Alpha: Admin'],
			[13, 'PRJCT-404'],
		]);
		expect(invitedRows[0]).toEqual(
			expect.objectContaining({
				email: 'ann@x.com',
				invitationIds: [12],
				isAdministrator: false,
				isCurrentUser: false,
				name: 'Ann',
				roleBriefs: [],
			})
		);
	});

	it('sorts invitation rows by name then project role and lists them after the members', () => {
		setUp({
			invitations: [
				invitation({
					emailAddress: 'zed@x.com',
					familyName: 'Zed',
					givenName: 'Al',
					id: 21,
					roleNames: [
						'Account Member',
						'Account Administrator',
						'Bogus',
					],
				}),
				invitation({
					emailAddress: 'b@x.com',
					givenName: 'Al',
					id: 22,
					projectExternalReferenceCode: 'PRJCT-1',
					projectRoleExternalReferenceCode: 'C_PROJECT_USER',
				}),
				invitation({
					emailAddress: 'a@x.com',
					givenName: 'Al',
					id: 23,
					projectExternalReferenceCode: 'PRJCT-1',
					projectRoleExternalReferenceCode: 'C_PROJECT_ADMIN',
				}),
			],
			userAccounts: [userAccount(1, 'Zoe', 'zoe@x.com', [])],
		});

		const {result} = renderHook(() => useAccountMembers());

		expect(result.current.rows.map(({id}) => id)).toEqual([1, 23, 22, 21]);
		expect(result.current.rows[3]).toEqual(
			expect.objectContaining({
				name: 'Al Zed',
				projectRoleName: undefined,
				roleNames: ['Account Administrator', 'Account Member'],
			})
		);
	});

	it('combines the loading and error states', () => {
		setUp();

		mocks.fetchResults[ACCOUNT_URL].isLoading = true;
		mocks.swrResult.error = new Error('invitations');

		const {result} = renderHook(() => useAccountMembers());

		expect(result.current.loading).toBe(true);
		expect(result.current.error).toEqual(new Error('invitations'));
	});

	it('mutates both the invitations and the user accounts', async () => {
		setUp();

		const {result} = renderHook(() => useAccountMembers());

		await result.current.mutate();

		expect(mocks.swrResult.mutate).toHaveBeenCalled();
		expect(mocks.fetchResults[USER_ACCOUNTS_URL].mutate).toHaveBeenCalled();
	});
});
