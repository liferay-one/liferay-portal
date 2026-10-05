/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {
	useChannelProducts,
	useProjectCommerce,
	useProjectEntitlements,
} from '~/hooks/useProjectCommerce';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';

import {
	useProjectContractItems,
	useProjectItems,
	useProjectsWithProjectItemType,
} from './useProjectItems';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useChannelProducts: vi.fn(),
	useProjectCommerce: vi.fn(),
	useProjectEntitlements: vi.fn(),
}));

vi.mock('~/hooks/useProjectOrders', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/hooks/useProjectOrders')>()),
	useProjectOrders: vi.fn(),
}));

const APPLICATION = toProduct(1, 'PRDCT-APP', 'application');

const PRODUCT_A = toProduct(2, 'PRDCT-A', 'product');

const PRODUCT_B = toProduct(3, 'PRDCT-B', 'product');

function toProduct(
	productId: number,
	externalReferenceCode: string,
	projectItemType: string
) {
	return {
		externalReferenceCode,
		name: externalReferenceCode,
		productId,
		productSpecifications: [
			{specificationKey: 'project-item-type', value: projectItemType},
		],
		skus: [{externalReferenceCode: `${externalReferenceCode}-SKU`}],
	};
}

function toOrder(id: number, productIds: number[], projectName = '') {
	return {
		customFields: projectName ? {projectName} : {},
		id,
		placedOrderItems: productIds.map((productId) => ({productId})),
	};
}

function mockChannelProducts(items: unknown[]) {
	vi.mocked(useChannelProducts).mockReturnValue({
		data: {items},
		error: undefined,
		isLoading: false,
	} as unknown as ReturnType<typeof useChannelProducts>);
}

function mockOrders(placedOrders: unknown[]) {
	vi.mocked(useProjectOrders).mockReturnValue({
		error: undefined,
		loading: false,
		placedOrders,
	} as unknown as ReturnType<typeof useProjectOrders>);
}

function mockProject(values: Record<string, unknown>) {
	vi.mocked(useProject).mockReturnValue({
		loading: false,
		...values,
	} as unknown as ReturnType<typeof useProject>);
}

function mockProjectCommerce(values: Record<string, unknown>) {
	vi.mocked(useProjectCommerce).mockReturnValue({
		loading: false,
		projectContractIds: new Set<number>(),
		usingAccountFallback: false,
		...values,
	} as unknown as ReturnType<typeof useProjectCommerce>);
}

function mockEntitlements(entitlements: unknown[]) {
	vi.mocked(useProjectEntitlements).mockReturnValue({
		entitlements,
		loading: false,
	} as unknown as ReturnType<typeof useProjectEntitlements>);
}

function toEntitlement(skuExternalReferenceCode: string, contractId?: number) {
	return {
		entitlementDefinitionToEntitlement: {skuExternalReferenceCode},
		r_contractToEntitlement_c_contractId: contractId,
	};
}

function getExternalReferenceCodes(items: {externalReferenceCode: string}[]) {
	return items.map(({externalReferenceCode}) => externalReferenceCode);
}

describe('[HOOK-USEPROJECTITEMS] useProjectItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockChannelProducts([APPLICATION, PRODUCT_A, PRODUCT_B]);
	});

	it('keeps only orders with no project name for the unassigned project', () => {
		mockProject({
			project: {name: 'One Time Purchases'},
			projectId: ONE_TIME_PURCHASES,
		});

		mockOrders([toOrder(1, [2], 'Project A'), toOrder(2, [3])]);

		const {result} = renderHook(() => useProjectItems());

		expect(useProjectOrders).toHaveBeenCalledWith(undefined);
		expect(getExternalReferenceCodes(result.current.products)).toEqual([
			'PRDCT-B',
		]);
	});

	it('keeps the first order for each product', () => {
		mockProject({project: {name: 'Project A'}, projectId: 'PRJCT-A'});

		const firstOrder = toOrder(1, [2], 'Project A');

		mockOrders([firstOrder, toOrder(2, [2, 3], 'Project A')]);

		const {result} = renderHook(() => useProjectItems());

		expect(
			result.current.orderByProductExternalReferenceCode.get('PRDCT-A')
		).toBe(firstOrder);
		expect(
			result.current.orderByProductExternalReferenceCode.get('PRDCT-B')
				?.id
		).toBe(2);
		expect(result.current.products).toHaveLength(2);
	});

	it('scopes orders to the project name', () => {
		mockProject({project: {name: 'Project A'}, projectId: 'PRJCT-A'});

		mockOrders([]);

		renderHook(() => useProjectItems());

		expect(useProjectOrders).toHaveBeenCalledWith('Project A');
	});

	it('splits products and applications by item type', () => {
		mockProject({project: {name: 'Project A'}, projectId: 'PRJCT-A'});

		mockOrders([toOrder(1, [1, 2, 99], 'Project A')]);

		const {result} = renderHook(() => useProjectItems());

		expect(getExternalReferenceCodes(result.current.applications)).toEqual([
			'PRDCT-APP',
		]);
		expect(getExternalReferenceCodes(result.current.products)).toEqual([
			'PRDCT-A',
		]);
	});
});

describe('[HOOK-USEPROJECTITEMS] useProjectContractItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockChannelProducts([APPLICATION, PRODUCT_A, PRODUCT_B]);
		mockOrders([toOrder(1, [1, 2, 3], 'Project A')]);
	});

	it('excludes products entitled under any project contract for One Time Purchases', () => {
		mockProject({
			project: {name: 'Project A'},
			projectId: 'PRJCT-A',
			selectedContractERC: ONE_TIME_PURCHASES,
		});
		mockProjectCommerce({
			projectContractIds: new Set([10]),
			resolvedContractERC: ONE_TIME_PURCHASES,
			resolvedContractId: undefined,
		});
		mockEntitlements([
			toEntitlement('PRDCT-A-SKU', 10),
			toEntitlement('PRDCT-B-SKU', 20),
		]);

		const {result} = renderHook(() => useProjectContractItems());

		expect(getExternalReferenceCodes(result.current.products)).toEqual([
			'PRDCT-B',
		]);
		expect(getExternalReferenceCodes(result.current.applications)).toEqual([
			'PRDCT-APP',
		]);
	});

	it('filters items by entitlement under the resolved contract', () => {
		mockProject({
			project: {name: 'Project A'},
			projectId: 'PRJCT-A',
			selectedContractERC: 'CONTRACT-10',
		});
		mockProjectCommerce({
			projectContractIds: new Set([10, 20]),
			resolvedContractERC: 'CONTRACT-10',
			resolvedContractId: 10,
		});
		mockEntitlements([
			toEntitlement('PRDCT-A', 10),
			toEntitlement('PRDCT-B-SKU', 20),
			toEntitlement('UNKNOWN-SKU', 10),
		]);

		const {result} = renderHook(() => useProjectContractItems());

		expect(getExternalReferenceCodes(result.current.products)).toEqual([
			'PRDCT-A',
		]);
		expect(result.current.applications).toEqual([]);
	});

	it('returns the unscoped items when using the account fallback', () => {
		mockProject({project: {name: 'Project A'}, projectId: 'PRJCT-A'});
		mockProjectCommerce({
			resolvedContractERC: 'CONTRACT-10',
			resolvedContractId: 10,
			usingAccountFallback: true,
		});
		mockEntitlements([]);

		const {result} = renderHook(() => useProjectContractItems());

		expect(result.current.products).toHaveLength(2);
		expect(result.current.applications).toHaveLength(1);
	});

	it('scopes commerce lookups to no project for the unassigned project', () => {
		mockProject({
			project: {name: 'One Time Purchases'},
			projectId: ONE_TIME_PURCHASES,
			selectedContractERC: 'CONTRACT-10',
		});
		mockProjectCommerce({resolvedContractERC: undefined});
		mockEntitlements([]);

		renderHook(() => useProjectContractItems());

		expect(useProjectCommerce).toHaveBeenCalledWith('', 'CONTRACT-10');
		expect(useProjectEntitlements).toHaveBeenCalledWith('');
	});
});

describe('[HOOK-USEPROJECTITEMS] useProjectsWithProjectItemType', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockChannelProducts([APPLICATION, PRODUCT_A]);
	});

	it('returns the projects whose orders hold an item of the type', () => {
		mockProject({
			projects: [
				{externalReferenceCode: 'PRJCT-A', name: 'Project A'},
				{externalReferenceCode: 'PRJCT-B', name: 'Project B'},
				{
					externalReferenceCode: ONE_TIME_PURCHASES,
					name: 'One Time Purchases',
				},
			],
		});
		mockOrders([
			toOrder(1, [1], 'Project A'),
			toOrder(2, [2], 'Project B'),
			toOrder(3, [1]),
		]);

		const {result} = renderHook(() =>
			useProjectsWithProjectItemType('application')
		);

		expect(result.current.projectERCs).toEqual([
			'PRJCT-A',
			ONE_TIME_PURCHASES,
		]);
	});
});
