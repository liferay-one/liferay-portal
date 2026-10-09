/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {useFetch} from '~/hooks/useFetch';
import {setCurrentAccount} from '~/utils/setCurrentAccount';

import {AccountProvider, useAccount} from './AccountContext';

const {commerceContext} = vi.hoisted(() => ({
	commerceContext: {} as {account?: {accountId: number}},
}));

vi.mock('~/components/EmptyState/EmptyState', () => ({
	default: ({title, type}: {title: string; type: string}) => (
		<div data-testid="empty-state">{`${type} ${title}`}</div>
	),
}));

vi.mock('~/components/Loading/Loading', () => ({
	default: {
		FullScreen: ({children}: {children: string}) => (
			<div data-testid="full-screen-loading">{children}</div>
		),
	},
}));

vi.mock('~/hooks/useAccounts', () => ({
	useCurrentAccount: vi.fn(),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

vi.mock('~/i18n', () => ({
	translate: (key: string) => key,
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {CommerceContext: commerceContext},
}));

vi.mock('~/utils/setCurrentAccount', () => ({
	setCurrentAccount: vi.fn(),
}));

const currentAccount = {externalReferenceCode: 'ACCNT-CURRENT', id: 1};
const requestedAccount = {externalReferenceCode: 'ACCNT-OTHER', id: 2};

let accountValue: ReturnType<typeof useAccount>;

function AccountConsumer() {
	accountValue = useAccount();

	return <div data-testid="consumer" />;
}

function mockCurrentAccount(data: unknown, isLoading = false) {
	vi.mocked(useCurrentAccount).mockReturnValue({
		data,
		isLoading,
	} as unknown as ReturnType<typeof useCurrentAccount>);
}

function mockRequestedAccount({
	data,
	error,
	isLoading = false,
}: {data?: unknown; error?: unknown; isLoading?: boolean} = {}) {
	vi.mocked(useFetch).mockReturnValue({
		data,
		error,
		isLoading,
	} as unknown as ReturnType<typeof useFetch>);
}

function renderProvider(accountERC: string) {
	return render(
		<MemoryRouter initialEntries={[`/${accountERC}`]}>
			<Routes>
				<Route element={<AccountProvider />} path="/:accountERC">
					<Route element={<AccountConsumer />} index />
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('[CTX-ACCOUNTCONTEXT] AccountProvider', () => {
	let reload: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		reload = vi.fn();

		vi.stubGlobal('location', {...window.location, reload});

		commerceContext.account = {accountId: 1};

		mockCurrentAccount(currentAccount);
		mockRequestedAccount();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses the current commerce account when the route ERC matches it', () => {
		renderProvider('ACCNT-CURRENT');

		expect(useFetch).toHaveBeenLastCalledWith(null);
		expect(accountValue).toEqual({account: currentAccount, loading: false});
		expect(setCurrentAccount).not.toHaveBeenCalled();
	});

	it('requests the route account when it differs from the current commerce account', () => {
		mockRequestedAccount({isLoading: true});

		renderProvider('ACCNT-OTHER');

		expect(useFetch).toHaveBeenLastCalledWith(
			'/o/headless-admin-user/v1.0/accounts/by-external-reference-code/ACCNT-OTHER'
		);
		expect(accountValue).toEqual({account: undefined, loading: true});
	});

	it('requests the route account when there is no current commerce account ID', () => {
		commerceContext.account = undefined;
		mockCurrentAccount(undefined);
		mockRequestedAccount({data: requestedAccount});

		renderProvider('ACCNT-OTHER');

		expect(useFetch).toHaveBeenLastCalledWith(
			'/o/headless-admin-user/v1.0/accounts/by-external-reference-code/ACCNT-OTHER'
		);
		expect(accountValue).toEqual({
			account: requestedAccount,
			loading: false,
		});
		expect(setCurrentAccount).not.toHaveBeenCalled();
	});

	it('does not request the route account while the current account loads', () => {
		mockCurrentAccount(undefined, true);

		renderProvider('ACCNT-OTHER');

		expect(useFetch).toHaveBeenLastCalledWith(null);
		expect(accountValue.loading).toBe(true);
	});

	it('switches to the requested account and reloads the page', async () => {
		vi.mocked(setCurrentAccount).mockResolvedValue();
		mockRequestedAccount({data: requestedAccount});

		renderProvider('ACCNT-OTHER');

		expect(setCurrentAccount).toHaveBeenCalledWith('2');
		expect(screen.getByTestId('full-screen-loading')).toHaveTextContent(
			'loading'
		);
		expect(accountValue).toEqual({
			account: requestedAccount,
			loading: true,
		});

		await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
	});

	it('clears the switching flag when the switch fails', async () => {
		vi.mocked(setCurrentAccount).mockRejectedValue(new Error('failed'));
		mockRequestedAccount({data: requestedAccount});

		renderProvider('ACCNT-OTHER');

		expect(screen.getByTestId('full-screen-loading')).toBeInTheDocument();

		await waitFor(() =>
			expect(
				screen.queryByTestId('full-screen-loading')
			).not.toBeInTheDocument()
		);

		expect(reload).not.toHaveBeenCalled();
		expect(accountValue.loading).toBe(true);
	});

	it('renders the no access empty state when the request fails', () => {
		mockRequestedAccount({error: new Error('Forbidden')});

		renderProvider('ACCNT-OTHER');

		expect(screen.getByTestId('empty-state')).toHaveTextContent(
			'NO_ACCESS you-do-not-have-access-to-this-account'
		);
		expect(screen.queryByTestId('consumer')).not.toBeInTheDocument();
	});
});
