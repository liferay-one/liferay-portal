/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';
import {useFetch} from '~/hooks/useFetch';
import {PARTNER_MANAGER} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {PROJECT_ADMIN_ERC} from '~/pages/MyAccount/ProjectMembers/projectRoles';

import {
	useHasActivationPermission,
	useHasLicenseKeyPermission,
} from './useHasActivationPermission';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: {
			getUserId: () => '42',
		},
	},
}));

const mockedUseFetch = vi.mocked(useFetch);
const mockedUseOneContext = vi.mocked(useOneContext);

function mockContext({
	accountRoleNames = [],
	myUserAccount = {id: 42},
	userAccountModel = {},
}: {
	accountRoleNames?: string[];
	myUserAccount?: unknown;
	userAccountModel?: Record<string, unknown>;
}) {
	mockedUseOneContext.mockReturnValue({
		myUserAccount,
		userAccountModel: {
			hasAccountRoleName: (roleName: string) =>
				accountRoleNames.includes(roleName),
			...userAccountModel,
		},
	} as unknown as ReturnType<typeof useOneContext>);
}

function mockMembership({
	isLoading = false,
	roleExternalReferenceCode,
}: {
	isLoading?: boolean;
	roleExternalReferenceCode?: string;
}) {
	mockedUseFetch.mockReturnValue({
		data: roleExternalReferenceCode
			? {items: [{roleExternalReferenceCode}]}
			: {items: []},
		isLoading,
	} as unknown as ReturnType<typeof useFetch>);
}

function getRequestedURL() {
	return mockedUseFetch.mock.calls[0][0];
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEHASACTIVATIONPERMISSION] useHasActivationPermission', () => {
	beforeEach(() => {
		mockedUseFetch.mockReset();
		mockedUseOneContext.mockReset();
		mockMembership({});
	});

	it.each([
		'canManageAllAccounts',
		'isAccountAdministrator',
		'isLiferayStaff',
	])('grants access to %s without a membership request', (roleFlag) => {
		mockContext({userAccountModel: {[roleFlag]: true}});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(getRequestedURL()).toBeNull();
		expect(result.current).toEqual({
			hasActivationPermission: true,
			loading: false,
		});
	});

	it('grants access to a project admin membership', () => {
		mockContext({});
		mockMembership({roleExternalReferenceCode: PROJECT_ADMIN_ERC});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(getRequestedURL()).toBe('/o/c/projectmemberships');
		expect(mockedUseFetch.mock.calls[0][1]).toMatchObject({
			params: {
				filter: [
					"r_projectToProjectMembership_c_projectERC eq 'PRJCT-1'",
					"r_userToProjectMembership_userId eq '42'",
					`roleExternalReferenceCode eq '${PROJECT_ADMIN_ERC}'`,
				].join(' and '),
				pageSize: 1,
			},
		});
		expect(result.current).toEqual({
			hasActivationPermission: true,
			loading: false,
		});
	});

	it('denies access to a member without a project admin membership', () => {
		mockContext({});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(result.current.hasActivationPermission).toBe(false);
	});

	it('denies access to a member with another project role', () => {
		mockContext({});
		mockMembership({roleExternalReferenceCode: 'C_PROJECT_MEMBER'});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(result.current.hasActivationPermission).toBe(false);
	});

	it('denies the partner manager account role', () => {
		mockContext({accountRoleNames: [PARTNER_MANAGER]});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(getRequestedURL()).toBe('/o/c/projectmemberships');
		expect(result.current.hasActivationPermission).toBe(false);
	});

	it('reports the membership loading state', () => {
		mockContext({});
		mockMembership({isLoading: true});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(result.current).toEqual({
			hasActivationPermission: false,
			loading: true,
		});
	});

	it('holds loading until the user account loads', () => {
		mockContext({
			myUserAccount: null,
			userAccountModel: {canManageAllAccounts: true},
		});

		const {result} = renderHook(() =>
			useHasActivationPermission('PRJCT-1')
		);

		expect(result.current).toEqual({
			hasActivationPermission: false,
			loading: true,
		});
	});

	it('skips the membership request without a project external reference code', () => {
		mockContext({});

		renderHook(() => useHasActivationPermission(''));

		expect(getRequestedURL()).toBeNull();
	});
});

describe('[HOOK-MYACCOUNT-PROJECTS-USEHASACTIVATIONPERMISSION] useHasLicenseKeyPermission', () => {
	beforeEach(() => {
		mockedUseFetch.mockReset();
		mockedUseOneContext.mockReset();
		mockMembership({});
	});

	it('grants access to the partner manager account role without a membership request', () => {
		mockContext({accountRoleNames: [PARTNER_MANAGER]});

		const {result} = renderHook(() =>
			useHasLicenseKeyPermission('PRJCT-1')
		);

		expect(getRequestedURL()).toBeNull();
		expect(result.current).toEqual({
			hasActivationPermission: true,
			loading: false,
		});
	});

	it('grants access to a project admin membership', () => {
		mockContext({});
		mockMembership({roleExternalReferenceCode: PROJECT_ADMIN_ERC});

		const {result} = renderHook(() =>
			useHasLicenseKeyPermission('PRJCT-1')
		);

		expect(result.current.hasActivationPermission).toBe(true);
	});

	it('denies access to other users', () => {
		mockContext({accountRoleNames: ['Account Member']});

		const {result} = renderHook(() =>
			useHasLicenseKeyPermission('PRJCT-1')
		);

		expect(result.current.hasActivationPermission).toBe(false);
	});
});
