/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useCurrentAccount} from '~/hooks/useAccounts';
import Accounts from '~/services/spring-boot/Accounts';

import {useOrderDates} from './useOrderDates';

import type {ReactNode} from 'react';

vi.mock('~/hooks/useAccounts', () => ({useCurrentAccount: vi.fn()}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {getCommerceOrdersOrderDates: vi.fn()},
}));

function mockCurrentAccount(externalReferenceCode?: string) {
	vi.mocked(useCurrentAccount).mockReturnValue({
		data: externalReferenceCode ? {externalReferenceCode} : undefined,
		isLoading: false,
	} as ReturnType<typeof useCurrentAccount>);
}

function wrapper({children}: {children: ReactNode}) {
	return createElement(
		SWRConfig,
		{value: {dedupingInterval: 0, provider: () => new Map()}},
		children
	);
}

describe('[HOOK-USEORDERDATES] useOrderDates', () => {
	beforeEach(() => {
		mockCurrentAccount('ACCNT-001');
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('reads the order dates of the current account from Spring Boot in one request', async () => {
		vi.mocked(Accounts.getCommerceOrdersOrderDates).mockResolvedValue({
			1: '2024-01-15T00:00:00Z',
			2: '2023-09-30T00:00:00Z',
		});

		const {result} = renderHook(() => useOrderDates(), {wrapper});

		await waitFor(() =>
			expect(result.current.orderDates).toEqual(
				new Map([
					[1, '2024-01-15T00:00:00Z'],
					[2, '2023-09-30T00:00:00Z'],
				])
			)
		);

		expect(Accounts.getCommerceOrdersOrderDates).toHaveBeenCalledOnce();
		expect(Accounts.getCommerceOrdersOrderDates).toHaveBeenCalledWith(
			'ACCNT-001'
		);
	});

	it('reads nothing without a current account', () => {
		mockCurrentAccount();

		const {result} = renderHook(() => useOrderDates(), {wrapper});

		expect(result.current).toEqual({loading: false, orderDates: new Map()});
		expect(Accounts.getCommerceOrdersOrderDates).not.toHaveBeenCalled();
	});

	it('is loading while the current account loads', () => {
		vi.mocked(useCurrentAccount).mockReturnValue({
			data: undefined,
			isLoading: true,
		} as ReturnType<typeof useCurrentAccount>);

		const {result} = renderHook(() => useOrderDates(), {wrapper});

		expect(result.current.loading).toBe(true);
	});

	it('reads no order dates when the order dates cannot be read', async () => {
		vi.mocked(Accounts.getCommerceOrdersOrderDates).mockRejectedValue(
			new Error('Forbidden')
		);

		const {result} = renderHook(() => useOrderDates(), {wrapper});

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.orderDates.size).toBe(0);
	});

	it('reads no order dates from an empty response', async () => {
		vi.mocked(Accounts.getCommerceOrdersOrderDates).mockResolvedValue(
			{} as Record<string, string>
		);

		const {result} = renderHook(() => useOrderDates(), {wrapper});

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.orderDates.size).toBe(0);
	});
});
