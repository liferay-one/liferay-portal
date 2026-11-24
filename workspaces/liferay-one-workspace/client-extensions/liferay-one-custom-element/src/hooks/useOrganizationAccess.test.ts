/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';
import {useCurrentAccount} from '~/hooks/useAccounts';

import {useOrganizationAccess} from './useOrganizationAccess';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

vi.mock('~/hooks/useAccounts', () => ({
	useCurrentAccount: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {ThemeDisplay: {isSignedIn: () => true}},
}));

function setUp({
	currentAccountLoading = false,
	isAccountMember = false,
	myUserAccountLoading = false,
	organizationIds = [9],
} = {}) {
	vi.mocked(useCurrentAccount).mockReturnValue({
		data: currentAccountLoading
			? undefined
			: {externalReferenceCode: 'ACCNT-7', id: 7, organizationIds},
		isLoading: currentAccountLoading,
	} as ReturnType<typeof useCurrentAccount>);

	vi.mocked(useOneContext).mockReturnValue({
		myUserAccount: myUserAccountLoading ? undefined : {id: 1},
		userAccountModel: {
			isAccountMember,
			isOrganizationMember: (ids: number[] = []) => ids.includes(9),
		},
	} as unknown as ReturnType<typeof useOneContext>);
}

describe('[HOOK-USEORGANIZATIONACCESS] useOrganizationAccess', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('gives organization access to a member of an organization linked to the current account who is not an account member', () => {
		setUp();

		const {result} = renderHook(() => useOrganizationAccess());

		expect(result.current).toEqual({
			accountExternalReferenceCode: 'ACCNT-7',
			loading: false,
			organizationAccess: true,
		});
	});

	it('gives no organization access to an account member', () => {
		setUp({isAccountMember: true});

		const {result} = renderHook(() => useOrganizationAccess());

		expect(result.current.organizationAccess).toBe(false);
		expect(result.current.accountExternalReferenceCode).toBeUndefined();
	});

	it('gives no organization access when the current account is not linked to an organization of the user', () => {
		setUp({organizationIds: [8]});

		const {result} = renderHook(() => useOrganizationAccess());

		expect(result.current.organizationAccess).toBe(false);
	});

	it('gives no organization access while the signed in user account loads', () => {
		setUp({myUserAccountLoading: true});

		const {result} = renderHook(() => useOrganizationAccess());

		expect(result.current).toEqual({
			accountExternalReferenceCode: undefined,
			loading: true,
			organizationAccess: false,
		});
	});

	it('gives no organization access while the current account loads', () => {
		setUp({currentAccountLoading: true});

		const {result} = renderHook(() => useOrganizationAccess());

		expect(result.current).toEqual({
			accountExternalReferenceCode: undefined,
			loading: true,
			organizationAccess: false,
		});
	});
});
