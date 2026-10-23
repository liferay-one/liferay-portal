/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminOrder from '~/services/headless/HeadlessCommerceAdminOrder';

import {useOrderDate} from './useOrderDate';

import type {ReactNode} from 'react';
import type {Order} from '~/types/orders';

vi.mock('~/services/headless/HeadlessCommerceAdminOrder', () => ({
	default: {getOrder: vi.fn()},
}));

function wrapper({children}: {children: ReactNode}) {
	return createElement(
		SWRConfig,
		{value: {dedupingInterval: 0, provider: () => new Map()}},
		children
	);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEORDERDATE] useOrderDate', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('reads the order date of the order', async () => {
		vi.mocked(HeadlessCommerceAdminOrder.getOrder).mockResolvedValue({
			orderDate: '2023-09-30T00:00:00Z',
		} as Order);

		const {result} = renderHook(() => useOrderDate('39196090'), {wrapper});

		await waitFor(() =>
			expect(result.current.orderDate).toBe('2023-09-30T00:00:00Z')
		);

		expect(HeadlessCommerceAdminOrder.getOrder).toHaveBeenCalledWith(
			'39196090',
			new URLSearchParams({fields: 'orderDate'})
		);
	});

	it('reads nothing without an order', () => {
		const {result} = renderHook(() => useOrderDate(''), {wrapper});

		expect(result.current).toEqual({loading: false, orderDate: undefined});
		expect(HeadlessCommerceAdminOrder.getOrder).not.toHaveBeenCalled();
	});

	it('leaves the order date empty when the order cannot be read', async () => {
		vi.mocked(HeadlessCommerceAdminOrder.getOrder).mockRejectedValue(
			new Error('Not Found')
		);

		const {result} = renderHook(() => useOrderDate('39196090'), {wrapper});

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.orderDate).toBeUndefined();
	});
});
