/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';

import useHasAdminPermissions from './useHasAdminPermissions';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

function mockUserAccount(myUserAccount: unknown) {
	vi.mocked(useOneContext).mockReturnValue({
		myUserAccount,
	} as ReturnType<typeof useOneContext>);
}

describe('[HOOK-USEHASADMINPERMISSIONS] useHasAdminPermissions', () => {
	beforeEach(() => {
		vi.mocked(useOneContext).mockReset();
	});

	it('reports loading with no access until the user account loads', () => {
		mockUserAccount(undefined);

		const {result} = renderHook(() => useHasAdminPermissions());

		expect(result.current).toEqual({
			hasAdminPermissions: false,
			loading: true,
		});
	});

	it('grants access to an Administrator', () => {
		mockUserAccount({
			roleBriefs: [{name: 'User'}, {name: 'Administrator'}],
		});

		const {result} = renderHook(() => useHasAdminPermissions());

		expect(result.current).toEqual({
			hasAdminPermissions: true,
			loading: false,
		});
	});

	it('grants access to a Provisioning Administrator', () => {
		mockUserAccount({roleBriefs: [{name: 'Provisioning Administrator'}]});

		const {result} = renderHook(() => useHasAdminPermissions());

		expect(result.current.hasAdminPermissions).toBe(true);
	});

	it('denies access to a user without an admin role', () => {
		mockUserAccount({
			roleBriefs: [{name: 'Account Administrator'}, {name: 'User'}],
		});

		const {result} = renderHook(() => useHasAdminPermissions());

		expect(result.current).toEqual({
			hasAdminPermissions: false,
			loading: false,
		});
	});

	it('denies access when roleBriefs is absent', () => {
		mockUserAccount({});

		const {result} = renderHook(() => useHasAdminPermissions());

		expect(result.current).toEqual({
			hasAdminPermissions: false,
			loading: false,
		});
	});
});
