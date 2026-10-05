/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';
import fetcher from '~/services/fetcher/fetcher';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

import useAccounts from './useAccounts';

import type {Account} from '~/types/accounts';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

vi.mock('~/services/fetcher/fetcher', () => ({
	default: vi.fn(),
}));

const loadedAccounts: Record<string, Partial<Account>> = {
	'/o/headless-admin-user/v1.0/accounts/5?nestedFields=accountUserAccounts': {
		externalReferenceCode: 'ACCNT-5',
		id: 5,
		name: 'Context Account',
	},
	'/o/headless-admin-user/v1.0/accounts/6?nestedFields=accountUserAccounts': {
		externalReferenceCode: 'ACCNT-6',
		id: 6,
		name: 'Other Account',
	},
};

function mockAccountBriefs(accountBriefs: {id: number}[]) {
	vi.mocked(useOneContext).mockReturnValue({
		myUserAccount: {accountBriefs},
	} as unknown as ReturnType<typeof useOneContext>);
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-PRODUCTPURCHASE-USEACCOUNTS] useAccounts', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		vi.mocked(fetcher).mockImplementation(((url: string) =>
			Promise.resolve(loadedAccounts[url])) as typeof fetcher);

		Liferay.CommerceContext.account = {
			accountId: 5,
			accountName: 'Context Account',
		};
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('loads each account brief with its nested user accounts', async () => {
		mockAccountBriefs([{id: 5}, {id: 6}]);

		vi.spyOn(HeadlessAdminUser, 'getAccount').mockResolvedValue(
			{} as Account
		);

		const {result} = renderHook(() => useAccounts(), {wrapper});

		await waitFor(() =>
			expect(result.current.accounts).toEqual([
				loadedAccounts[
					'/o/headless-admin-user/v1.0/accounts/5?nestedFields=accountUserAccounts'
				],
				loadedAccounts[
					'/o/headless-admin-user/v1.0/accounts/6?nestedFields=accountUserAccounts'
				],
			])
		);

		expect(result.current.isLoading).toBe(false);
	});

	it('starts with the commerce context account', () => {
		mockAccountBriefs([]);

		vi.spyOn(HeadlessAdminUser, 'getAccount').mockReturnValue(
			new Promise(() => {})
		);

		const {result} = renderHook(() => useAccounts(), {wrapper});

		expect(result.current.selectedAccount).toEqual({
			id: 5,
			name: 'Context Account',
		});
	});

	it('resolves the selected account ERC from the loaded list', async () => {
		mockAccountBriefs([{id: 5}, {id: 6}]);

		vi.spyOn(HeadlessAdminUser, 'getAccount').mockResolvedValue({
			id: 5,
		} as Account);

		const {result} = renderHook(() => useAccounts(), {wrapper});

		await waitFor(() =>
			expect(result.current.selectedAccount).toEqual(
				loadedAccounts[
					'/o/headless-admin-user/v1.0/accounts/5?nestedFields=accountUserAccounts'
				]
			)
		);
	});

	it('falls back to a direct fetch when the account is not in the loaded list', async () => {
		mockAccountBriefs([{id: 6}]);

		const fetchedAccount = {
			externalReferenceCode: 'ACCNT-5',
			id: 5,
			name: 'Fetched Account',
		} as Account;

		const getAccount = vi
			.spyOn(HeadlessAdminUser, 'getAccount')
			.mockResolvedValue(fetchedAccount);

		const {result} = renderHook(() => useAccounts(), {wrapper});

		await waitFor(() =>
			expect(result.current.selectedAccount).toEqual(fetchedAccount)
		);

		expect(getAccount).toHaveBeenCalledWith(5);
	});

	it('uses an account set with an ERC without fetching it again', async () => {
		mockAccountBriefs([]);

		const getAccount = vi
			.spyOn(HeadlessAdminUser, 'getAccount')
			.mockReturnValue(new Promise(() => {}));

		const {result} = renderHook(() => useAccounts(), {wrapper});

		getAccount.mockClear();

		const account = {
			externalReferenceCode: 'ACCNT-9',
			id: 9,
			name: 'Chosen Account',
		} as Account;

		act(() => result.current.setSelectedAccount(account));

		expect(result.current.selectedAccount).toEqual(account);
		expect(getAccount).not.toHaveBeenCalled();
	});
});
