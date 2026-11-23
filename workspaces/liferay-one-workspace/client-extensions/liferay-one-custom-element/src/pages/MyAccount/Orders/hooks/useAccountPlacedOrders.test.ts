/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDataQuery} from '~/hooks/useDataQuery';
import {useFetch} from '~/hooks/useFetch';
import {useOrganizationAccess} from '~/hooks/useOrganizationAccess';
import {Liferay} from '~/services/liferay/liferay';

import {useAccountPlacedOrders} from './useAccountPlacedOrders';

vi.mock('~/hooks/useDataQuery', () => ({useDataQuery: vi.fn()}));
vi.mock('~/hooks/useFetch', () => ({useFetch: vi.fn()}));
vi.mock('~/hooks/useOrganizationAccess', () => ({
	useOrganizationAccess: vi.fn(),
}));

const organizationPlacedOrders = {items: [{id: 2}]};

const portalPlacedOrders = {items: [{id: 1}]};

function setUp({
	accountExternalReferenceCode = undefined as string | undefined,
	loading = false,
} = {}) {
	vi.mocked(useOrganizationAccess).mockReturnValue({
		accountExternalReferenceCode,
		loading,
		organizationAccess: Boolean(accountExternalReferenceCode),
	});
}

describe('[HOOK-MYACCOUNT-ORDERS-USEACCOUNTPLACEDORDERS] useAccountPlacedOrders', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {accountId: 7, accountName: 'Acme'};
		Liferay.CommerceContext.commerceChannelId = '3';

		vi.mocked(useDataQuery).mockImplementation(
			({key}) =>
				({
					data: key ? organizationPlacedOrders : undefined,
					error: undefined,
					isLoading: false,
				}) as ReturnType<typeof useDataQuery>
		);
		vi.mocked(useFetch).mockImplementation(
			(url) =>
				({
					data: url ? portalPlacedOrders : undefined,
					error: undefined,
					isLoading: false,
				}) as ReturnType<typeof useFetch>
		);
	});

	afterEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('reads the orders from the portal without organization access', () => {
		setUp();

		const {result} = renderHook(() => useAccountPlacedOrders());

		expect(useFetch).toHaveBeenLastCalledWith(
			'/o/headless-commerce-delivery-order/v1.0/channels/3/accounts/7/placed-orders',
			{params: {pageSize: 100, sort: 'createDate:desc'}}
		);
		expect(vi.mocked(useDataQuery).mock.lastCall?.[0].key).toBeNull();
		expect(result.current.data).toBe(portalPlacedOrders);
		expect(result.current.organizationAccess).toBe(false);
	});

	it('reads the orders through Spring Boot with organization access', () => {
		setUp({accountExternalReferenceCode: 'ACCNT-7'});

		const {result} = renderHook(() => useAccountPlacedOrders());

		expect(useFetch).toHaveBeenLastCalledWith(null, expect.anything());
		expect(vi.mocked(useDataQuery).mock.lastCall?.[0].key).toContain(
			'/placed-orders/ACCNT-7/'
		);
		expect(result.current.data).toBe(organizationPlacedOrders);
		expect(result.current.organizationAccess).toBe(true);
	});

	it('requests nothing and reports loading while the organization access loads', () => {
		setUp({loading: true});

		const {result} = renderHook(() => useAccountPlacedOrders());

		expect(useFetch).toHaveBeenLastCalledWith(null, expect.anything());
		expect(vi.mocked(useDataQuery).mock.lastCall?.[0].key).toBeNull();
		expect(result.current.isLoading).toBe(true);
	});
});
