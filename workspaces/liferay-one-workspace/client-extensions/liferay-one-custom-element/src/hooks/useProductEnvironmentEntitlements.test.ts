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
			useProductEnvironmentEntitlements([7, 8], true)
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
			useProductEnvironmentEntitlements([7], true)
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
			useProductEnvironmentEntitlements([7], true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({environment}) => environment
			)
		).toEqual(['production', '']);
	});

	it('keeps the plan entitlements without activation keys', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements([7], false)
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
			useProductEnvironmentEntitlements([7], true)
		);

		expect(result.current.environmentEntitlements).toEqual([
			{
				endDate: '2027-08-09T00:00:00.000Z',
				environment: 'production',
				provisionedCount: 1,
				quantity: 2,
				startDate: '2026-08-09T00:00:00.000Z',
				terminationStatus: '',
			},
			{
				endDate: '',
				environment: '',
				provisionedCount: 0,
				quantity: 0,
				startDate: '',
				terminationStatus: 'terminated',
			},
		]);
	});

	it('leaves the counts out when they did not load', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		const {result} = renderHook(() =>
			useProductEnvironmentEntitlements([7], true)
		);

		expect(
			result.current.environmentEntitlements.map(
				({provisionedCount}) => provisionedCount
			)
		).toEqual([undefined, undefined]);
	});
});
