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
	useActiveSkuExternalReferenceCodes: vi.fn(),
	useHasProject: vi.fn(),
}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useAccountProducts: mocks.useAccountProducts,
	useActiveSkuExternalReferenceCodes:
		mocks.useActiveSkuExternalReferenceCodes,
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useHasProject', () => ({
	useHasProject: mocks.useHasProject,
}));

const PARTNER_PRODUCT_EXTERNAL_REFERENCE_CODE = 'PRDCT-PARTNER';

function partnerProduct(value: string) {
	return {
		externalReferenceCode: PARTNER_PRODUCT_EXTERNAL_REFERENCE_CODE,
		productSpecifications: [{specificationKey: 'partner-product', value}],
	};
}

function setUp({
	activeProductExternalReferenceCodes = [] as string[],
	activeSkusLoading = false,
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
	mocks.useActiveSkuExternalReferenceCodes.mockReturnValue({
		activeSkuExternalReferenceCodesByProduct: new Map(
			activeProductExternalReferenceCodes.map((externalReferenceCode) => [
				externalReferenceCode,
				['SKU-1'],
			])
		),
		loading: activeSkusLoading,
	});
}

describe('[HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTTYPE] useAccountType', () => {
	beforeEach(() => {
		mocks.useAccountProducts.mockReset();
		mocks.useActiveSkuExternalReferenceCodes.mockReset();
		mocks.useHasProject.mockReset();
	});

	it('is a standard account with the standard roles when no product is a partner product', () => {
		setUp({hasProject: true, products: [partnerProduct('false'), {}]});

		const {result} = renderHook(() => useAccountType());

		expect(result.current).toEqual({
			hasActivePartnerSubscription: false,
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
			hasActivePartnerSubscription: false,
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
			hasActivePartnerSubscription: false,
			isHybrid: true,
			isPartner: true,
			loading: false,
			roleNames: MANAGEABLE_ACCOUNT_ROLES,
		});
	});

	it('has an active partner subscription when the partner product has an active SKU', () => {
		setUp({
			activeProductExternalReferenceCodes: [
				PARTNER_PRODUCT_EXTERNAL_REFERENCE_CODE,
			],
			products: [partnerProduct('true')],
		});

		const {result} = renderHook(() => useAccountType());

		expect(result.current.hasActivePartnerSubscription).toBe(true);
		expect(result.current.isPartner).toBe(true);
	});

	it('has no active partner subscription when the partner product has no active SKU', () => {
		setUp({products: [partnerProduct('true')]});

		const {result} = renderHook(() => useAccountType());

		expect(result.current.hasActivePartnerSubscription).toBe(false);
		expect(result.current.isPartner).toBe(true);
	});

	it('has no active partner subscription when only a product that is not a partner product is active', () => {
		setUp({
			activeProductExternalReferenceCodes: [
				PARTNER_PRODUCT_EXTERNAL_REFERENCE_CODE,
			],
			products: [partnerProduct('false')],
		});

		const {result} = renderHook(() => useAccountType());

		expect(result.current.hasActivePartnerSubscription).toBe(false);
	});

	it.each([
		[true, false, false],
		[false, true, false],
		[false, false, true],
	])(
		'combines the loading state when products loading is %s, projects loading is %s, and active SKUs loading is %s',
		(productsLoading, projectsLoading, activeSkusLoading) => {
			setUp({activeSkusLoading, productsLoading, projectsLoading});

			const {result} = renderHook(() => useAccountType());

			expect(result.current.loading).toBe(true);
		}
	);
});
