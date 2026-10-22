/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useUserProjects} from '~/pages/MyAccount/Projects/hooks/useUserProjects';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/projects';
import Accounts from '~/services/spring-boot/Accounts';

import {
	projectProductsQuery,
	resolveDefaultContractERC,
	useProjectCommerce,
	useProjectProducts,
} from './useProjectCommerce';

import type {APIResponse} from '~/types/api';
import type {DeliveryProduct} from '~/types/product';

vi.mock('~/hooks/useAccounts', () => ({
	useCurrentAccount: vi.fn(),
}));

vi.mock('~/hooks/useDataQuery', () => ({
	preloadDataQuery: vi.fn(),
	useDataQuery: vi.fn(),
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useUserProjects', () => ({
	useUserProjects: vi.fn(),
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {getProducts: vi.fn()},
}));

const DAY = 24 * 60 * 60 * 1000;

const FUTURE = new Date(Date.now() + 30 * DAY).toISOString();

const PAST = new Date(Date.now() - 30 * DAY).toISOString();

const LONG_AGO = new Date(Date.now() - 400 * DAY).toISOString();

type QueryData = {
	accountContracts?: unknown[];
	entitlements?: unknown[];
	projectContracts?: unknown[];
};

function mockQueries({
	accountContracts = [],
	entitlements = [],
	projectContracts = [],
}: QueryData) {
	vi.mocked(useDataQuery).mockImplementation((({
		key,
	}: {
		key: string | null;
	}) => {
		if (!key) {
			return {data: undefined, error: undefined, isLoading: false};
		}

		let items: unknown[] = [];

		if (key.startsWith('/graphql/account-level-contracts')) {
			items = accountContracts;
		}
		else if (key.startsWith('/graphql/project-contracts')) {
			items = projectContracts;
		}
		else if (key.startsWith('/project-entitlements')) {
			items = entitlements;
		}

		return {
			data: {items, totalCount: items.length},
			error: undefined,
			isLoading: false,
		};
	}) as unknown as typeof useDataQuery);
}

function renderProjectCommerce(contractExternalReferenceCode?: string) {
	return renderHook(() =>
		useProjectCommerce('PRJCT-1', contractExternalReferenceCode)
	).result.current;
}

describe('[HOOK-USEPROJECTCOMMERCE] useProjectCommerce', () => {
	beforeEach(() => {
		(
			window.Liferay as unknown as {
				CommerceContext: {account?: {accountId: number}};
			}
		).CommerceContext.account = {accountId: 7};

		vi.mocked(useUserProjects).mockReturnValue({
			loading: false,
			projects: [{externalReferenceCode: 'PRJCT-1', name: 'Project One'}],
		} as unknown as ReturnType<typeof useUserProjects>);
	});

	it('falls back to account contracts when the project has none', () => {
		mockQueries({
			accountContracts: [
				{externalReferenceCode: 'C_ACCOUNT', id: 10, spendLimit: 5},
			],
		});

		const result = renderProjectCommerce();

		expect(result.usingAccountFallback).toBe(true);
		expect(
			result.contracts.map((contract) => contract.externalReferenceCode)
		).toEqual(['C_ACCOUNT']);
		expect(result.resolvedContractERC).toBe('C_ACCOUNT');
		expect(result.resolvedContractId).toBe(10);
		expect(result.projectName).toBe('Project One');
	});

	it('prefers project contracts over account contracts', () => {
		mockQueries({
			accountContracts: [{externalReferenceCode: 'C_ACCOUNT', id: 10}],
			projectContracts: [{externalReferenceCode: 'C_PROJECT', id: 20}],
		});

		const result = renderProjectCommerce();

		expect(result.usingAccountFallback).toBe(false);
		expect(
			result.contracts.map((contract) => contract.externalReferenceCode)
		).toEqual(['C_PROJECT']);
		expect([...result.projectContractIds]).toEqual([20]);
	});

	it('adds a one time purchases contract when entitlements sit outside project contracts', () => {
		mockQueries({
			entitlements: [
				{
					externalReferenceCode: 'E_1',
					name: 'Entitlement',
					r_contractToEntitlement_c_contractId: 99,
				},
			],
			projectContracts: [{externalReferenceCode: 'C_PROJECT', id: 20}],
		});

		const result = renderProjectCommerce();

		expect(result.contracts).toEqual([
			expect.objectContaining({externalReferenceCode: 'C_PROJECT'}),
			{
				externalReferenceCode: ONE_TIME_PURCHASES,
				name: 'One-Time Purchases',
			},
		]);
	});

	it('omits the one time purchases contract when every entitlement sits under a project contract', () => {
		mockQueries({
			entitlements: [
				{
					externalReferenceCode: 'E_1',
					name: 'Entitlement',
					r_contractToEntitlement_c_contractId: 20,
				},
			],
			projectContracts: [{externalReferenceCode: 'C_PROJECT', id: 20}],
		});

		const result = renderProjectCommerce();

		expect(
			result.contracts.map((contract) => contract.externalReferenceCode)
		).toEqual(['C_PROJECT']);
	});

	it('omits the one time purchases contract when account contracts are the fallback', () => {
		mockQueries({
			accountContracts: [{externalReferenceCode: 'C_ACCOUNT', id: 10}],
			entitlements: [
				{
					externalReferenceCode: 'E_1',
					name: 'Entitlement',
					r_contractToEntitlement_c_contractId: 10,
				},
			],
		});

		const result = renderProjectCommerce();

		expect(
			result.contracts.map((contract) => contract.externalReferenceCode)
		).toEqual(['C_ACCOUNT']);
	});

	it('offers only the one time purchases contract when no contracts exist but entitlements do', () => {
		mockQueries({
			entitlements: [{externalReferenceCode: 'E_1', name: 'Entitlement'}],
		});

		const result = renderProjectCommerce();

		expect(result.resolvedContractERC).toBe(ONE_TIME_PURCHASES);
		expect(result.contract).toBeUndefined();
		expect(result.resolvedContractId).toBeUndefined();
	});

	it('resolves the requested contract when it exists', () => {
		mockQueries({
			projectContracts: [
				{externalReferenceCode: 'C_BIG', id: 1, spendLimit: 100},
				{externalReferenceCode: 'C_SMALL', id: 2, spendLimit: 1},
			],
		});

		const result = renderProjectCommerce('C_SMALL');

		expect(result.resolvedContractERC).toBe('C_SMALL');
		expect(result.contract?.externalReferenceCode).toBe('C_SMALL');
		expect(result.resolvedContractId).toBe(2);
	});

	it('defaults to the active contract with the highest spend limit when the requested contract is unknown', () => {
		mockQueries({
			projectContracts: [
				{
					endDate: PAST,
					externalReferenceCode: 'C_EXPIRED',
					id: 1,
					spendLimit: 1000,
				},
				{
					externalReferenceCode: 'C_ACTIVE_SMALL',
					id: 2,
					spendLimit: 10,
				},
				{externalReferenceCode: 'C_ACTIVE_BIG', id: 3, spendLimit: 50},
			],
		});

		const result = renderProjectCommerce('C_MISSING');

		expect(result.resolvedContractERC).toBe('C_ACTIVE_BIG');
		expect(result.contract?.spendLimit).toBe(50);
	});

	it('resolves contract status as future, expired, or active', () => {
		mockQueries({
			projectContracts: [
				{
					contractTerm: 12,
					externalReferenceCode: 'C_FUTURE',
					id: 1,
					startDate: FUTURE,
				},
				{
					endDate: PAST,
					externalReferenceCode: 'C_EXPIRED',
					id: 2,
					startDate: LONG_AGO,
				},
				{
					endDate: FUTURE,
					externalReferenceCode: 'C_ACTIVE',
					id: 3,
					startDate: PAST,
				},
			],
		});

		const result = renderProjectCommerce();

		expect(
			result.contracts.map((contract) => [
				contract.externalReferenceCode,
				contract.status,
			])
		).toEqual([
			['C_FUTURE', 'future'],
			['C_EXPIRED', 'expired'],
			['C_ACTIVE', 'active'],
		]);
		expect(result.contracts[0]).toMatchObject({
			name: 'C_FUTURE',
			termMonths: 12,
		});
	});
});

describe('[HOOK-USEPROJECTCOMMERCE] resolveDefaultContractERC', () => {
	it('picks the costliest contract when none are active', () => {
		expect(
			resolveDefaultContractERC([
				{
					externalReferenceCode: 'A',
					name: 'A',
					spendLimit: 1,
					status: 'expired',
				},
				{
					externalReferenceCode: 'B',
					name: 'B',
					spendLimit: 9,
					status: 'future',
				},
			])
		).toBe('B');
	});

	it('returns undefined without contracts', () => {
		expect(resolveDefaultContractERC([])).toBeUndefined();
	});
});

describe('[HOOK-USEPROJECTCOMMERCE] projectProductsQuery', () => {
	it('has no key without an account ERC', () => {
		expect(projectProductsQuery(undefined).key).toBeNull();
	});

	it('fetches the products of the account from Spring Boot', async () => {
		const products: APIResponse<DeliveryProduct> = {
			actions: {},
			facets: [],
			items: [],
			lastPage: 1,
			page: 1,
			pageSize: 0,
			results: [],
			totalCount: 0,
		};

		vi.mocked(Accounts.getProducts).mockResolvedValue(products);

		const query = projectProductsQuery('ACCNT-001');

		expect(query.key).toBe('/project-products/ACCNT-001');
		await expect(query.fetcher()).resolves.toBe(products);
		expect(Accounts.getProducts).toHaveBeenCalledWith('ACCNT-001');
	});
});

describe('[HOOK-USEPROJECTCOMMERCE] useProjectProducts', () => {
	function mockCurrentAccount(
		currentAccount: Partial<ReturnType<typeof useCurrentAccount>>
	) {
		vi.mocked(useCurrentAccount).mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
			...currentAccount,
		} as ReturnType<typeof useCurrentAccount>);
	}

	function mockProjectProducts(
		projectProducts: Partial<ReturnType<typeof useDataQuery>>
	) {
		vi.mocked(useDataQuery).mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
			mutate: vi.fn(),
			...projectProducts,
		} as ReturnType<typeof useDataQuery>);
	}

	it('reports loading while the current account loads', () => {
		mockCurrentAccount({isLoading: true});
		mockProjectProducts({});

		const {result} = renderHook(() => useProjectProducts());

		expect(result.current.isLoading).toBe(true);
	});

	it('reports the current account error as the products error', () => {
		const error = new Error('Unable to get account');

		mockCurrentAccount({error});
		mockProjectProducts({});

		const {result} = renderHook(() => useProjectProducts());

		expect(result.current.error).toBe(error);
		expect(result.current.isLoading).toBe(false);
	});

	it('prefers the products error over the account error', () => {
		const productsError = new Error('Unable to get products');

		mockCurrentAccount({error: new Error('Unable to get account')});
		mockProjectProducts({error: productsError});

		const {result} = renderHook(() => useProjectProducts());

		expect(result.current.error).toBe(productsError);
	});

	it('returns the products once the account and products load', () => {
		const products: APIResponse<DeliveryProduct> = {
			actions: {},
			facets: [],
			items: [],
			lastPage: 1,
			page: 1,
			pageSize: 0,
			results: [],
			totalCount: 0,
		};

		mockCurrentAccount({
			data: {externalReferenceCode: 'ACCNT-001'},
		} as Partial<ReturnType<typeof useCurrentAccount>>);
		mockProjectProducts({data: products});

		const {result} = renderHook(() => useProjectProducts());

		expect(result.current.data).toBe(products);
		expect(result.current.isLoading).toBe(false);
		expect(vi.mocked(useDataQuery).mock.calls.at(-1)?.[0].key).toBe(
			'/project-products/ACCNT-001'
		);
	});
});
