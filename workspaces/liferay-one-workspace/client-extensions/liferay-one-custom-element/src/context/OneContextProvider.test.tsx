/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {UserAccountModel} from '~/services/models/UserAccountModel';
import {Properties} from '~/utils/attributeUtils';

import OneContextProvider, {useOneContext} from './OneContextProvider';

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

function renderOneContextProvider() {
	return renderHook(() => useOneContext(), {
		wrapper: ({children}: {children: ReactNode}) => (
			<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
				<OneContextProvider properties={properties}>
					{children}
				</OneContextProvider>
			</SWRConfig>
		),
	});
}

describe('[CTX-ONECONTEXTPROVIDER] OneContextProvider', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('exposes the fixed MARKETPLACE channel built from the commerce context', () => {
		mockSignedIn(false);

		const {result} = renderOneContextProvider();

		expect(result.current.channel).toEqual({
			channelId: 42,
			currencyCode: 'USD',
			externalReferenceCode: 'MARKETPLACE',
			id: 42,
		});
	});

	it('passes the properties through', () => {
		mockSignedIn(false);

		const {result} = renderOneContextProvider();

		expect(result.current.properties).toBe(properties);
	});

	it('skips the user account fetch when the visitor is signed out', async () => {
		mockSignedIn(false);

		const getMyUserAccount = vi.spyOn(
			HeadlessAdminUser,
			'getMyUserAccount'
		);

		const {result} = renderOneContextProvider();

		await act(async () => {});

		expect(getMyUserAccount).not.toHaveBeenCalled();
		expect(result.current.myUserAccount).toBeUndefined();
	});

	it('builds the UserAccountModel with the SSA account ERC property', async () => {
		mockSignedIn(true);

		const getMyUserAccount = vi
			.spyOn(HeadlessAdminUser, 'getMyUserAccount')
			.mockResolvedValue(userAccount);

		const {result} = renderOneContextProvider();

		await waitFor(() =>
			expect(result.current.myUserAccount).toBe(userAccount)
		);

		expect(getMyUserAccount).toHaveBeenCalledTimes(1);
		expect(result.current.userAccountModel).toBeInstanceOf(
			UserAccountModel
		);
		expect(result.current.userAccountModel.accountName).toBe('Jane Doe');
		expect(result.current.userAccountModel.isSSAUser).toBe(true);
	});
});
