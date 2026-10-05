/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

import useAccountDetails from './useAccountDetails';

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

describe('[HOOK-USEACCOUNTDETAILS] useAccountDetails', () => {
	afterEach(() => {
		Liferay.CommerceContext.account = undefined;

		vi.restoreAllMocks();
	});

	it('sends no request without a current account ID', async () => {
		Liferay.CommerceContext.account = undefined;

		const getAccount = vi.spyOn(HeadlessAdminUser, 'getAccount');
		const getAccountPostalAddresses = vi.spyOn(
			HeadlessAdminUser,
			'getAccountPostalAddresses'
		);

		const {result} = renderHook(() => useAccountDetails(), {wrapper});

		await act(async () => {});

		expect(result.current.data).toBeUndefined();
		expect(getAccount).not.toHaveBeenCalled();
		expect(getAccountPostalAddresses).not.toHaveBeenCalled();
	});

	it('returns the account and its postal addresses as one object', async () => {
		Liferay.CommerceContext.account = {
			accountId: 5,
			accountName: 'Acme',
		};

		const account = {id: 5, name: 'Acme'};
		const postalAddresses = {items: [{id: 9}]};

		const getAccount = vi
			.spyOn(HeadlessAdminUser, 'getAccount')
			.mockResolvedValue(
				account as Awaited<
					ReturnType<typeof HeadlessAdminUser.getAccount>
				>
			);
		const getAccountPostalAddresses = vi
			.spyOn(HeadlessAdminUser, 'getAccountPostalAddresses')
			.mockResolvedValue(
				postalAddresses as Awaited<
					ReturnType<
						typeof HeadlessAdminUser.getAccountPostalAddresses
					>
				>
			);

		const {result} = renderHook(() => useAccountDetails(), {wrapper});

		await waitFor(() =>
			expect(result.current.data).toEqual({account, postalAddresses})
		);

		expect(getAccount).toHaveBeenCalledWith(5);
		expect(getAccountPostalAddresses).toHaveBeenCalledWith(5);
	});
});
