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
		entitlementDefinitionToEntitlement: {licenseKeyType: 'production'},
		id: 11,
		quantity: 2,
		startDate: '2026-08-09T00:00:00.000Z',
	},
	{
		id: 12,
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

		renderHook(() => useProductEnvironmentEntitlements([7, 8], true));

		const [[url, {params}]] = useFetchMock.mock.calls;

		expect(url).toBe('/o/c/entitlements');
		expect(params.filter).toBe(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId in ('7','8')"
		);
		expect(params.nestedFields).toBe('entitlementDefinitionToEntitlement');
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

	it('counts the active license keys of each entitlement', async () => {
		queryGraphQLMock.mockResolvedValue({licenseKeys: {totalCount: 3}});
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: true});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		renderHook(() => useProductEnvironmentEntitlements([7], true));

		const [[{fetcher, key}]] = useDataQueryMock.mock.calls;

		expect(key).toBe('/license-key-counts/11,12');
		await expect(fetcher()).resolves.toEqual([3, 3]);
		expect(queryGraphQLMock.mock.calls[0][0]).toContain(
			"active eq true and r_entitlementToLicenseKey_c_entitlementId eq '11'"
		);
	});

	it('skips the license key counts when they are not needed', () => {
		useDataQueryMock.mockReturnValue({data: undefined, isLoading: false});
		useFetchMock.mockReturnValue({
			data: {items: entitlementNodes},
			isLoading: false,
		});

		renderHook(() => useProductEnvironmentEntitlements([7], false));

		expect(useDataQueryMock.mock.calls[0][0].key).toBeNull();
	});

	it('returns the environment, the dates, and the counts of each entitlement', () => {
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
			},
			{
				endDate: '',
				environment: '',
				provisionedCount: 0,
				quantity: 0,
				startDate: '',
			},
		]);
	});
});
