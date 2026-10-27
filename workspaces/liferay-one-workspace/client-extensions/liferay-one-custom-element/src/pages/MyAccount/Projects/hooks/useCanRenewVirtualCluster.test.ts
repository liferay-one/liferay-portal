/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useOneContext} from '~/context/OneContextProvider';

import {useCanRenewVirtualCluster} from './useCanRenewVirtualCluster';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: vi.fn(),
}));

const mockedUseOneContext = vi.mocked(useOneContext);

function mockUserAccountModel(userAccountModel: unknown) {
	mockedUseOneContext.mockReturnValue({
		userAccountModel,
	} as unknown as ReturnType<typeof useOneContext>);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USECANRENEWVIRTUALCLUSTER] useCanRenewVirtualCluster', () => {
	beforeEach(() => {
		mockedUseOneContext.mockReset();
	});

	it('allows a user who manages all accounts', () => {
		mockUserAccountModel({canManageAllAccounts: true});

		const {result} = renderHook(() => useCanRenewVirtualCluster());

		expect(result.current).toBe(true);
	});

	it('allows a provisioning worker', () => {
		mockUserAccountModel({isProvisioningWorker: true});

		const {result} = renderHook(() => useCanRenewVirtualCluster());

		expect(result.current).toBe(true);
	});

	it('denies other roles', () => {
		mockUserAccountModel({
			canManageAllAccounts: false,
			isAccountAdministrator: true,
			isLiferayStaff: true,
			isProvisioningWorker: false,
		});

		const {result} = renderHook(() => useCanRenewVirtualCluster());

		expect(result.current).toBe(false);
	});

	it('denies a user without a user account model', () => {
		mockUserAccountModel(undefined);

		const {result} = renderHook(() => useCanRenewVirtualCluster());

		expect(result.current).toBe(false);
	});
});
