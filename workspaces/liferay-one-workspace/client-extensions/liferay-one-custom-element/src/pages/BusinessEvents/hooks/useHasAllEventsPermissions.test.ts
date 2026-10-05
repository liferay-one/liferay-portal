/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useHasAllEventsPermissions from './useHasAllEventsPermissions';

const mocks = vi.hoisted(() => ({
	useFetch: vi.fn(),
	useOneContext: vi.fn(),
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: mocks.useOneContext,
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: mocks.useFetch,
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {
			getUserId: () => '42',
		},
	},
}));

function setContext(userAccountModel?: object, myUserAccount: unknown = {}) {
	mocks.useOneContext.mockReturnValue({myUserAccount, userAccountModel});
}

function setMembership(roleExternalReferenceCode?: string, isLoading = false) {
	mocks.useFetch.mockReturnValue({
		data: roleExternalReferenceCode
			? {items: [{roleExternalReferenceCode}]}
			: {items: []},
		isLoading,
	});
}

describe('[HOOK-BUSINESSEVENTS-USEHASALLEVENTSPERMISSIONS] useHasAllEventsPermissions', () => {
	beforeEach(() => {
		mocks.useFetch.mockReset();
		mocks.useOneContext.mockReset();
	});

	it('holds loading true with no access until the user account loads', () => {
		setContext({isAdmin: true}, null);
		setMembership();

		const {result} = renderHook(() => useHasAllEventsPermissions('PRJ'));

		expect(result.current).toEqual({
			hasAllEventsPermissions: false,
			loading: true,
		});
	});

	it.each([['isAdmin'], ['isLiferayStaff'], ['isAccountAdministrator']])(
		'grants access to %s without a membership request',
		(property) => {
			setContext({[property]: true});
			setMembership();

			const {result} = renderHook(() =>
				useHasAllEventsPermissions('PRJ')
			);

			expect(result.current).toEqual({
				hasAllEventsPermissions: true,
				loading: false,
			});
			expect(mocks.useFetch).toHaveBeenCalledWith(
				null,
				expect.anything()
			);
		}
	);

	it.each([['C_PROJECT_ADMIN'], ['C_PROJECT_REQUESTER']])(
		'grants access for the %s membership role',
		(role) => {
			setContext({});
			setMembership(role);

			const {result} = renderHook(() =>
				useHasAllEventsPermissions('PRJ')
			);

			expect(result.current.hasAllEventsPermissions).toBe(true);
			expect(mocks.useFetch).toHaveBeenCalledWith(
				'/o/c/projectmemberships',
				{
					params: {
						fields: 'roleExternalReferenceCode',
						filter: "r_projectToProjectMembership_c_projectERC eq 'PRJ' and r_userToProjectMembership_userId eq '42'",
						pageSize: 1,
					},
				}
			);
		}
	);

	it('denies access for another membership role', () => {
		setContext({});
		setMembership('C_PROJECT_MEMBER');

		const {result} = renderHook(() => useHasAllEventsPermissions('PRJ'));

		expect(result.current.hasAllEventsPermissions).toBe(false);
	});

	it('denies access when the membership is missing and reports the membership loading state', () => {
		setContext({});
		setMembership(undefined, true);

		const {result} = renderHook(() => useHasAllEventsPermissions('PRJ'));

		expect(result.current).toEqual({
			hasAllEventsPermissions: false,
			loading: true,
		});
	});

	it('skips the membership request without a project ERC', () => {
		setContext({});
		setMembership();

		renderHook(() => useHasAllEventsPermissions());

		expect(mocks.useFetch).toHaveBeenCalledWith(null, expect.anything());
	});
});
