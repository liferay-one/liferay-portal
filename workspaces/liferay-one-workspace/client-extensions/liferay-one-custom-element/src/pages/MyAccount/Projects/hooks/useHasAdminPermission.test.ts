/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';

import {useHasAdminPermission} from './useHasAdminPermission';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

const mockedUseOneContext = vi.mocked(useOneContext);

function mockUserAccountModel(userAccountModel: unknown) {
	mockedUseOneContext.mockReturnValue({
		userAccountModel,
	} as unknown as ReturnType<typeof useOneContext>);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEHASADMINPERMISSION] useHasAdminPermission', () => {
	beforeEach(() => {
		mockedUseOneContext.mockReset();
	});

	it('grants access to a user who manages all accounts', () => {
		mockUserAccountModel({canManageAllAccounts: true});

		const {result} = renderHook(() => useHasAdminPermission());

		expect(result.current).toBe(true);
	});

	it('denies access to other roles', () => {
		mockUserAccountModel({
			canManageAllAccounts: false,
			isAccountAdministrator: true,
			isLiferayStaff: true,
		});

		const {result} = renderHook(() => useHasAdminPermission());

		expect(result.current).toBe(false);
	});

	it('denies access without a user account model', () => {
		mockUserAccountModel(undefined);

		const {result} = renderHook(() => useHasAdminPermission());

		expect(result.current).toBe(false);
	});
});
