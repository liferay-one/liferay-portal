/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
	MANAGEABLE_ACCOUNT_ROLES,
	PARTNER_ACCOUNT_ROLES,
	STANDARD_ACCOUNT_ROLES,
} from '~/pages/MyAccount/AccountMembers/accountRoles';

import {useAccountType} from './useAccountType';

const mocks = vi.hoisted(() => ({
	useAccountProducts: vi.fn(),
	useHasProject: vi.fn(),
}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useAccountProducts: mocks.useAccountProducts,
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useHasProject', () => ({
	useHasProject: mocks.useHasProject,
}));

function partnerProduct(value: string) {
	return {
		productSpecifications: [{specificationKey: 'partner-product', value}],
	};
}

function setUp({
	hasProject = false,
	products = [] as object[],
	productsLoading = false,
	projectsLoading = false,
}) {
	mocks.useHasProject.mockReturnValue({
		hasProject,
		loading: projectsLoading,
	});
	mocks.useAccountProducts.mockReturnValue({
		loading: productsLoading,
		products,
	});
}

describe('[HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTTYPE] useAccountType', () => {
	beforeEach(() => {
		mocks.useAccountProducts.mockReset();
		mocks.useHasProject.mockReset();
	});

	it('is a standard account with the standard roles when no product is a partner product', () => {
		setUp({hasProject: true, products: [partnerProduct('false'), {}]});

		const {result} = renderHook(() => useAccountType());

		expect(result.current).toEqual({
			isHybrid: false,
			isPartner: false,
			loading: false,
			roleNames: STANDARD_ACCOUNT_ROLES,
		});
	});

	it('is a partner account with the partner roles when a product carries the partner specification and no project exists', () => {
		setUp({products: [{}, partnerProduct('true')]});

		const {result} = renderHook(() => useAccountType());

		expect(result.current).toEqual({
			isHybrid: false,
			isPartner: true,
			loading: false,
			roleNames: PARTNER_ACCOUNT_ROLES,
		});
	});

	it('is a hybrid account with the manageable roles when a partner account also has a project', () => {
		setUp({hasProject: true, products: [partnerProduct('true')]});

		const {result} = renderHook(() => useAccountType());

		expect(result.current).toEqual({
			isHybrid: true,
			isPartner: true,
			loading: false,
			roleNames: MANAGEABLE_ACCOUNT_ROLES,
		});
	});

	it.each([
		[true, false],
		[false, true],
	])(
		'combines the loading state when products loading is %s and projects loading is %s',
		(productsLoading, projectsLoading) => {
			setUp({productsLoading, projectsLoading});

			const {result} = renderHook(() => useAccountType());

			expect(result.current.loading).toBe(true);
		}
	);
});
