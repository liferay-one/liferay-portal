/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {useOrderDates} from '~/hooks/useOrderDates';
import {Liferay} from '~/services/liferay/liferay';

import Orders from './Orders';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({}),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

vi.mock('~/hooks/useOrderDates', () => ({
	useOrderDates: vi.fn(),
}));

function renderOrders() {
	return render(
		<MemoryRouter>
			<Orders />
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-ORDERS] Orders', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {accountId: 7, accountName: 'Acme'};
		Liferay.CommerceContext.commerceChannelId = '3';

		vi.mocked(useFetch).mockReturnValue({
			data: {
				items: [
					{
						createDate: '2026-03-15T12:00:00Z',
						customFields: {projectName: 'Alpha'},
						id: 1001,
						summary: {totalFormatted: '$10.00'},
					},
				],
			},
			error: undefined,
			isLoading: false,
		} as ReturnType<typeof useFetch>);

		vi.mocked(useOrderDates).mockReturnValue({
			loading: false,
			orderDates: new Map(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('does not request the order items', () => {
		render(
			<MemoryRouter>
				<Orders />
			</MemoryRouter>
		);

		expect(useFetch).toHaveBeenCalledWith(
			'/o/headless-commerce-delivery-order/v1.0/channels/3/accounts/7/placed-orders',
			{params: {pageSize: 100, sort: 'createDate:desc'}}
		);
		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(screen.getByText('Alpha')).toBeInTheDocument();
	});

	it('lists the orders by order date, newest first', () => {
		vi.mocked(useFetch).mockReturnValue({
			data: {
				items: [
					{
						createDate: '2026-10-22T18:00:00Z',
						id: 1001,
						summary: {totalFormatted: '$10.00'},
					},
					{
						createDate: '2026-10-22T18:00:00Z',
						id: 1002,
						summary: {totalFormatted: '$20.00'},
					},
					{
						createDate: '2026-10-22T18:00:00Z',
						id: 1003,
						summary: {totalFormatted: '$30.00'},
					},
				],
			},
			error: undefined,
			isLoading: false,
		} as ReturnType<typeof useFetch>);

		vi.mocked(useOrderDates).mockReturnValue({
			loading: false,
			orderDates: new Map([
				[1001, '2022-03-02T00:00:00Z'],
				[1002, '2024-01-15T00:00:00Z'],
			]),
		});

		renderOrders();

		expect(useOrderDates).toHaveBeenCalledWith([1001, 1002, 1003]);

		const rows = screen.getAllByRole('row').slice(1);

		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringContaining('Oct 22, 2026'),
			expect.stringContaining('Jan 15, 2024'),
			expect.stringContaining('Mar 2, 2022'),
		]);
		expect(rows[1].textContent).toContain('1002');
	});

	it('shows no dates while the order dates load', () => {
		vi.mocked(useOrderDates).mockReturnValue({
			loading: true,
			orderDates: new Map(),
		});

		renderOrders();

		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(screen.queryByText('Mar 15, 2026')).toBeNull();
	});

	it('does not show the order total', () => {
		render(
			<MemoryRouter>
				<Orders />
			</MemoryRouter>
		);

		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(screen.queryByText('Total')).not.toBeInTheDocument();
		expect(screen.queryByText('$10.00')).not.toBeInTheDocument();
	});
});
