/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {MarketplaceUserAccount} from '~/services/models/MarketplaceUserAccount';
import {Properties} from '~/utils/attributeUtils';

import MarketplaceContextProvider, {
	useMarketplaceContext,
} from './MarketplaceContextProvider';

import type {UserAccount} from '~/types/accounts';

const {signedIn} = vi.hoisted(() => {
	const signedIn = {value: false};

	const liferay = (
		window as unknown as {
			Liferay: {CommerceContext: unknown; ThemeDisplay: object};
		}
	).Liferay;

	const themeDisplay = liferay.ThemeDisplay;

	liferay.CommerceContext = {
		commerceChannelId: '42',
		currency: {currencyCode: 'USD'},
	};

	liferay.ThemeDisplay = new Proxy(themeDisplay, {
		get: (target, property, receiver) =>
			property === 'isSignedIn'
				? () => signedIn.value
				: Reflect.get(target, property, receiver),
	});

	return {signedIn};
});

const properties = {
	ssaAccountExternalReferenceCode: 'ACCNT-SSA',
} as unknown as Properties;

const userAccount = {
	accountBriefs: [
		{
			externalReferenceCode: 'ACCNT-SSA',
			id: 1,
			roleBriefs: [{name: 'SSA User'}],
		},
	],
	name: 'Jane Doe',
	roleBriefs: [],
} as unknown as UserAccount;

function mockSignedIn(value: boolean) {
	signedIn.value = value;
}

function renderMarketplaceContextProvider() {
	return renderHook(() => useMarketplaceContext(), {
		wrapper: ({children}: {children: ReactNode}) => (
			<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
				<MarketplaceContextProvider properties={properties}>
					{children}
				</MarketplaceContextProvider>
			</SWRConfig>
		),
	});
}

describe('[CTX-MARKETPLACECONTEXTPROVIDER] MarketplaceContextProvider', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('exposes the fixed MARKETPLACE channel built from the commerce context', () => {
		mockSignedIn(false);

		const {result} = renderMarketplaceContextProvider();

		expect(result.current.channel).toEqual({
			channelId: 42,
			currencyCode: 'USD',
			externalReferenceCode: 'MARKETPLACE',
			id: 42,
		});
	});

	it('passes the properties through', () => {
		mockSignedIn(false);

		const {result} = renderMarketplaceContextProvider();

		expect(result.current.properties).toBe(properties);
	});

	it('skips the user account fetch when the visitor is signed out', async () => {
		mockSignedIn(false);

		const getMyUserAccount = vi.spyOn(
			HeadlessAdminUser,
			'getMyUserAccount'
		);

		const {result} = renderMarketplaceContextProvider();

		await act(async () => {});

		expect(getMyUserAccount).not.toHaveBeenCalled();
		expect(result.current.myUserAccount).toBeUndefined();
	});

	it('wraps the fetched user account in a MarketplaceUserAccount', async () => {
		mockSignedIn(true);

		const getMyUserAccount = vi
			.spyOn(HeadlessAdminUser, 'getMyUserAccount')
			.mockResolvedValue(userAccount);

		const {result} = renderMarketplaceContextProvider();

		await waitFor(() =>
			expect(result.current.myUserAccount).toBe(userAccount)
		);

		expect(getMyUserAccount).toHaveBeenCalledTimes(1);
		expect(result.current.marketplaceUserAccount).toBeInstanceOf(
			MarketplaceUserAccount
		);
		expect(result.current.marketplaceUserAccount.accountName).toBe(
			'Jane Doe'
		);
		expect(result.current.marketplaceUserAccount.accountBriefs).toBe(
			userAccount.accountBriefs
		);
	});
});
