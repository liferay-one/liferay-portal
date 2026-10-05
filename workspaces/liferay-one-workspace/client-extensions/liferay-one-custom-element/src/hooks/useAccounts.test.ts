/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useDataQuery} from '~/hooks/useDataQuery';
import {queryGraphQL} from '~/services/graphql/GraphQL';
import {Liferay} from '~/services/liferay/liferay';

import {
	accountsQuery,
	currentAccountQuery,
	useAccounts,
	useCurrentAccount,
} from './useAccounts';

vi.mock('~/hooks/useDataQuery', () => ({
	useDataQuery: vi.fn(() => ({data: undefined})),
}));

vi.mock('~/services/graphql/GraphQL', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/services/graphql/GraphQL')>()),
	queryGraphQL: vi.fn(),
}));

describe('[HOOK-USEACCOUNTS] useAccounts', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('doubles single quotes of the search term in the OData filter', async () => {
		vi.mocked(queryGraphQL).mockResolvedValue({
			accounts: {items: [], totalCount: 0},
		});

		await accountsQuery(5, "O'Brien").fetcher();

		const [selection] = vi.mocked(queryGraphQL).mock.calls[0];

		expect(selection).toContain("contains(name, 'O''Brien')");
	});

	it('sends no filter without a search term', async () => {
		vi.mocked(queryGraphQL).mockResolvedValue({
			accounts: {items: [], totalCount: 0},
		});

		await accountsQuery(5).fetcher();

		const [selection] = vi.mocked(queryGraphQL).mock.calls[0];

		expect(selection).not.toContain('filter');
		expect(selection).toContain('accounts(page: 1, pageSize: 20');
	});

	it('uses a null key without an account id', () => {
		expect(accountsQuery(undefined, 'x').key).toBeNull();
		expect(currentAccountQuery(null).key).toBeNull();
	});

	it('keys the queries on the account id and search', () => {
		expect(accountsQuery(5, 'acme').key).toBe('/graphql/accounts/5/acme');
		expect(currentAccountQuery(5).key).toBe('/graphql/account/5');
	});

	it('lowercases the account type in the account list', async () => {
		vi.mocked(queryGraphQL).mockResolvedValue({
			accounts: {
				items: [{id: 1, type: 'BUSINESS'}, {id: 2}],
				totalCount: 2,
			},
		});

		const response = await accountsQuery(5).fetcher();

		expect(response).toEqual({
			items: [
				{id: 1, type: 'business'},
				{id: 2, type: undefined},
			],
			totalCount: 2,
		});
	});

	it('lowercases the account type of the current account', async () => {
		vi.mocked(queryGraphQL).mockResolvedValue({
			account: {id: 5, type: 'Person'},
		});

		const account = await currentAccountQuery(5).fetcher();

		expect(account).toEqual({id: 5, type: 'person'});
		expect(vi.mocked(queryGraphQL).mock.calls[0][0]).toContain(
			'account(accountId: 5)'
		);
	});

	it('queries with the commerce context account id', () => {
		Liferay.CommerceContext.account = {accountId: 7} as never;

		renderHook(() => useAccounts('abc'));
		renderHook(() => useCurrentAccount());

		expect(vi.mocked(useDataQuery).mock.calls[0][0].key).toBe(
			'/graphql/accounts/7/abc'
		);
		expect(vi.mocked(useDataQuery).mock.calls[1][0].key).toBe(
			'/graphql/account/7'
		);
	});

	it('queries with a null key when the commerce context has no account', () => {
		renderHook(() => useCurrentAccount());

		expect(vi.mocked(useDataQuery).mock.calls[0][0].key).toBeNull();
	});
});
