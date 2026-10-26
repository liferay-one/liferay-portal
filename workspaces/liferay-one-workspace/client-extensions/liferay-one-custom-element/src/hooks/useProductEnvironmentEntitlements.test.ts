/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProductEnvironmentEntitlements} from './useProductEnvironmentEntitlements';

const {queryGraphQLMock, useDataQueryMock, useFetchMock} = vi.hoisted(() => ({
	queryGraphQLMock: vi.fn(),
	useDataQueryMock: vi.fn(),
	useFetchMock: vi.fn(),
}));

vi.mock('~/hooks/useDataQuery', () => ({useDataQuery: useDataQueryMock}));
vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));
vi.mock('~/services/graphql/GraphQL', () => ({
	queryGraphQL: queryGraphQLMock,
	toGraphQLString: JSON.stringify,
}));

const orderItems = [{id: 7, optionValueNames: [], tierName: ''}];

const entitlementNodes = [
	{
		endDate: '2027-08-09T00:00:00.000Z',
		entitlementDefinitionToEntitlement: {
			generatesActivationKey: true,
			licenseKeyType: 'production',
			unit: 'boolean',
		},
		id: 11,
		quantity: 2,
		startDate: '2026-08-09T00:00:00.000Z',
	},
	{
		entitlementDefinitionToEntitlement: {
			generatesActivationKey: true,
			unit: 'boolean',
		},
		id: 12,
		terminationStatus: 'terminated',
	},
	{
		entitlementDefinitionToEntitlement: {
			generatesActivationKey: true,
			licenseKeyType: 'developer',
			unit: 'boolean',
		},
		id: 13,
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
		queryGraphQLMock.mockReset();
		useDataQueryMock.mockReset();
		useFetchMock.mockReset();
	});

	it('requests the entitlements of the order items with their definitions', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({data: undefined, isLoading: true});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(
				[
					{id: 7, optionValueNames: [], tierName: ''},
					{id: 8, optionValueNames: [], tierName: ''},
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

	it('counts the active license keys that each entitlement granted', async () => {
		queryGraphQLMock.mockResolvedValue({licenseKeys: {totalCount: 3}});
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: true});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements(orderItems, true)
		);

		const [[{fetcher, key}]] = useDataQueryMock.mock.calls;

		expect(key).toBe('/license-key-counts/11,12');
		await expect(fetcher()).resolves.toEqual([3, 3]);
		expect(queryGraphQLMock.mock.calls[0][0]).toContain(
			"active eq true and entitlementId eq '11'"
		);
		expect(result.current.loading).toBe(true);
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
					entitlementDefinitionToEntitlement: {
						generatesActivationKey: true,
						licenseKeyType,
						unit: 'boolean',
					},
					id: 21 + index,
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
		useDataQueryMock.mockReturnValue({data: [1, 0], isLoading: false});
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
				instanceSize: '',
				provisionedCount: 1,
				quantity: 2,
				startDate: '2026-08-09T00:00:00.000Z',
				terminationStatus: '',
				tierName: '',
			},
			{
				endDate: '',
				environment: '',
				instanceSize: '',
				provisionedCount: 0,
				quantity: 0,
				startDate: '',
				terminationStatus: 'terminated',
				tierName: '',
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
						tierName:
							'Liferay Commerce Subscription - Prod Sizing 1',
					},
					{
						id: 8,
						optionValueNames: [
							'Liferay Commerce Subscription - Non-Prod Sizing 2',
						],
						tierName:
							'Liferay Commerce Subscription - Non-Prod Sizing 2',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment, instanceSize}) => [environment, instanceSize]
			)
		).toEqual([
			['production', '1'],
			['non-production', '2'],
		]);
	});

	it('takes the tier name of each entitlement from its order item', () => {
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
						tierName:
							'Subscription Portal EE - Platinum (Production)',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(({tierName}) => tierName)
		).toEqual(['Subscription Portal EE - Platinum (Production)', '']);
	});

	it('prefers the license key type of the definition to the order item options', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {
				items: [
					{
						entitlementDefinitionToEntitlement: {
							licenseKeyType: 'non-production',
							unit: 'boolean',
						},
						id: 21,
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
						tierName:
							'Liferay Self-Hosted Subscription - Gold Prod Sizing 3',
					},
				],
				false
			)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment, instanceSize}) => [environment, instanceSize]
			)
		).toEqual([['non-production', '3']]);
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
