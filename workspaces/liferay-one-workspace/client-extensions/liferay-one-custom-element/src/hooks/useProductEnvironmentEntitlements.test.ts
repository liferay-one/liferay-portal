/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProductEnvironmentEntitlements} from './useProductEnvironmentEntitlements';

const {
	getLicenseKeyCountsMock,
	useActivationKeyScopeMock,
	useDataQueryMock,
	useFetchMock,
} = vi.hoisted(() => ({
	getLicenseKeyCountsMock: vi.fn(),
	useActivationKeyScopeMock: vi.fn(),
	useDataQueryMock: vi.fn(),
	useFetchMock: vi.fn(),
}));

vi.mock('~/hooks/useDataQuery', () => ({useDataQuery: useDataQueryMock}));
vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));
vi.mock(
	'~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeyScope',
	() => ({useActivationKeyScope: useActivationKeyScopeMock})
);
vi.mock('~/services/spring-boot/ActivationKeys', () => ({
	default: {getLicenseKeyCounts: getLicenseKeyCountsMock},
}));

const orderItems = [{id: 7, optionValueNames: [], skuProductName: ''}];

const entitlementNodes = [
	{
		endDate: '2027-08-09T00:00:00.000Z',
		entitlementDefinitionToEntitlement: {unit: 'boolean'},
		generatesActivationKey: true,
		id: 11,
		licenseKeyType: 'production',
		maxQuantity: 3,
		quantity: 2,
		startDate: '2026-08-09T00:00:00.000Z',
	},
	{
		entitlementDefinitionToEntitlement: {unit: 'boolean'},
		generatesActivationKey: true,
		id: 12,
		terminationStatus: 'terminated',
	},
	{
		entitlementDefinitionToEntitlement: {unit: 'boolean'},
		generatesActivationKey: true,
		id: 13,
		licenseKeyType: 'developer',
	},
	{
		entitlementDefinitionToEntitlement: {unit: 'count'},
		id: 14,
	},
	{
		entitlementDefinitionToEntitlement: {unit: 'boolean'},
		id: 15,
	},
];

describe('[HOOK-USEPRODUCTENVIRONMENTENTITLEMENTS] useProductEnvironmentEntitlements', () => {
	beforeEach(() => {
		getLicenseKeyCountsMock.mockReset();
		useActivationKeyScopeMock.mockReset();
		useActivationKeyScopeMock.mockReturnValue({
			projectExternalReferenceCode: 'PRJCT-1',
		});
		useDataQueryMock.mockReset();
		useFetchMock.mockReset();
	});

	it('requests the entitlements of the order items with their definitions', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({data: undefined, isLoading: true});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(
				[
					{id: 7, optionValueNames: [], skuProductName: ''},
					{id: 8, optionValueNames: [], skuProductName: ''},
				],
				true
			)
		);

		const [[url, {params}]] = useFetchMock.mock.calls;

		expect(url).toBe('/o/c/entitlements');
		expect(params.filter).toBe(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId in ('7','8')"
		);
		expect(params.nestedFields).toBe('entitlementDefinitionToEntitlement');
		expect(params.fields).toContain('terminationStatus');
		expect(result.current.loading).toBe(true);
	});

	it('skips the requests without order items', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({data: undefined, isLoading: false});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements([], true)
		);

		expect(useFetchMock.mock.calls[0][0]).toBeNull();
		expect(useDataQueryMock.mock.calls[0][0].key).toBeNull();
		expect(result.current.environmentEntitlements).toEqual([]);
	});

	it('reads the license key counts of the project in one request', async () => {
		const licenseKeyCounts = {11: {totalCount: 3, usedCount: 2}};

		getLicenseKeyCountsMock.mockResolvedValue(licenseKeyCounts);
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: true});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		const [[{fetcher, key}]] = useDataQueryMock.mock.calls;

		expect(key).toBe(
			'/activation-keys/license-key-counts?projectExternalReferenceCode=PRJCT-1'
		);
		await expect(fetcher()).resolves.toEqual(licenseKeyCounts);
		expect(getLicenseKeyCountsMock.mock.calls).toEqual([
			[{projectExternalReferenceCode: 'PRJCT-1'}],
		]);
		expect(result.current.loading).toBe(true);
	});

	it('reads the license key counts of the account under One Time Purchases', async () => {
		getLicenseKeyCountsMock.mockResolvedValue({});
		useActivationKeyScopeMock.mockReturnValue({
			accountExternalReferenceCode: 'ACCNT-1',
		});
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: true});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		renderHook(() => useProductEnvironmentEntitlements(orderItems, true));

		const [[{fetcher, key}]] = useDataQueryMock.mock.calls;

		expect(key).toBe(
			'/activation-keys/license-key-counts?accountExternalReferenceCode=ACCNT-1'
		);
		await fetcher();
		expect(getLicenseKeyCountsMock.mock.calls).toEqual([
			[{accountExternalReferenceCode: 'ACCNT-1'}],
		]);
	});

	it('skips the license key counts without an activation key scope', () => {
		useActivationKeyScopeMock.mockReturnValue(undefined);
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(useDataQueryMock.mock.calls[0][0].key).toBeNull();
		expect(
			result.current.environmentEntitlements.map(
				({provisionedCount}) => provisionedCount
			)
		).toEqual([undefined, undefined]);
	});

	it('keeps the activation key entitlements of the shown environments', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['production', '']);
	});

	it('keeps the backup and complimentary entitlements and hides the developer entitlements', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {
				items: [
					'backup',
					'complimentary',
					'developer',
					'developer-cluster',
				].map((licenseKeyType, index) => ({
					entitlementDefinitionToEntitlement: {unit: 'boolean'},
					generatesActivationKey: true,
					id: 21 + index,
					licenseKeyType,
				})),
			},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['backup', 'complimentary']);
	});

	it('keeps the plan entitlements without activation keys', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, false)
		);

		expect(useDataQueryMock.mock.calls[0][0].key).toBeNull();
		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['production', '', '']);
	});

	it('returns the environment, the dates, the status, and the counts of each entitlement', () => {
		useDataQueryMock.mockReturnValue({
			data: {11: {totalCount: 4, usedCount: 1}},
			isLoading: false,
		});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(result.current.environmentEntitlements).toEqual([
			{
				endDate: '2027-08-09T00:00:00.000Z',
				environment: 'production',
				provisionableCount: 4,
				provisionedCount: 1,
				quantity: 2,
				skuProductName: '',
				startDate: '2026-08-09T00:00:00.000Z',
				terminationStatus: '',
			},
			{
				endDate: '',
				environment: '',
				provisionableCount: 0,
				provisionedCount: 0,
				quantity: 0,
				skuProductName: '',
				startDate: '',
				terminationStatus: 'terminated',
			},
		]);
	});

	it('reads the environment and the instance size from the order item options', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {
				items: [
					{
						entitlementDefinitionToEntitlement: {unit: 'boolean'},
						id: 21,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 7,
					},
					{
						entitlementDefinitionToEntitlement: {unit: 'boolean'},
						id: 22,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 8,
					},
				],
			},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(
				[
					{
						id: 7,
						optionValueNames: [
							'Liferay Commerce Subscription - Prod Sizing 1',
						],
						skuProductName:
							'Liferay Commerce Subscription - Prod Sizing 1',
					},
					{
						id: 8,
						optionValueNames: [
							'Liferay Commerce Subscription - Non-Prod Sizing 2',
						],
						skuProductName:
							'Liferay Commerce Subscription - Non-Prod Sizing 2',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['production', 'non-production']);
	});

	it('takes the SKU product name of each entitlement from its order item', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {
				items: [
					{
						entitlementDefinitionToEntitlement: {unit: 'boolean'},
						id: 21,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 7,
					},
					{
						entitlementDefinitionToEntitlement: {unit: 'boolean'},
						id: 22,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 9,
					},
				],
			},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(
				[
					{
						id: 7,
						optionValueNames: [],
						skuProductName:
							'Subscription Portal EE - Platinum (Production)',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(
				({skuProductName}) => skuProductName
			)
		).toEqual(['Subscription Portal EE - Platinum (Production)', '']);
	});

	it('prefers the license key type of the entitlement to the order item options', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {
				items: [
					{
						entitlementDefinitionToEntitlement: {unit: 'boolean'},
						id: 21,
						licenseKeyType: 'non-production',
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 7,
					},
				],
			},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(
				[
					{
						id: 7,
						optionValueNames: [
							'Liferay Self-Hosted Subscription - Gold Prod Sizing 3',
						],
						skuProductName:
							'Liferay Self-Hosted Subscription - Gold Prod Sizing 3',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['non-production']);
	});

	it('falls back to the maximum quantity without a total count', () => {
		useDataQueryMock.mockReturnValue({
			data: {12: {usedCount: 5}},
			isLoading: false,
		});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({provisionableCount, provisionedCount}) => [
					provisionedCount,
					provisionableCount,
				]
			)
		).toEqual([
			[0, 3],
			[5, 0],
		]);
	});

	it('leaves the counts out when they did not load', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({provisionedCount}) => provisionedCount
			)
		).toEqual([undefined, undefined]);
	});
});
