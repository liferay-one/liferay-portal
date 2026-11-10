/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useOrderDates} from '~/hooks/useOrderDates';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import FetcherError from '~/services/fetcher/FetcherError';

import OrdersTab from './OrdersTab';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useOrderDates', () => ({useOrderDates: vi.fn()}));

vi.mock('~/hooks/useProjectOrders', () => ({useProjectOrders: vi.fn()}));

function toProjectOrder(id: string, createDate: string) {
	return {
		createDate,
		id,
		orderId: id,
		status: 'completed',
		total: '$10.00',
	};
}

function getOrderRows() {
	return screen
		.getAllByRole('row')
		.filter((row) => within(row).queryByText(/^100\d$/))
		.map((row) => row.textContent);
}

function renderOrdersTab() {
	render(
		<MemoryRouter>
			<OrdersTab productId={5} />
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] OrdersTab', () => {
	beforeEach(() => {
		vi.mocked(useProject).mockReturnValue({
			project: {externalReferenceCode: 'PRJCT-ALPHA', name: 'Alpha'},
		} as ReturnType<typeof useProject>);

		vi.mocked(useOrderDates).mockReturnValue({
			loading: false,
			orderDates: new Map(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('shows an error instead of an empty list when the orders fail to load', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: new FetcherError(
				'An error occurred while fetching the data.'
			),
			loading: false,
			orders: [],
			placedOrders: [],
		});

		renderOrdersTab();

		expect(
			screen.getByText('An error occurred while fetching the data.')
		).toBeInTheDocument();
		expect(screen.queryByText('No orders yet.')).not.toBeInTheDocument();
	});

	it('lists the orders when they load', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: undefined,
			loading: false,
			orders: [toProjectOrder('1001', '2026-03-15T12:00:00Z')],
			placedOrders: [],
		});

		renderOrdersTab();

		expect(screen.getByText('1001')).toBeInTheDocument();
	});

	it('keeps the loaded orders when a refresh fails', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: new FetcherError(
				'An error occurred while fetching the data.'
			),
			loading: false,
			orders: [toProjectOrder('1001', '2026-03-15T12:00:00Z')],
			placedOrders: [],
		});

		renderOrdersTab();

		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(
			screen.queryByText('An error occurred while fetching the data.')
		).not.toBeInTheDocument();
	});

	it('shows the order date of each order, not its create date', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: undefined,
			loading: false,
			orders: [
				toProjectOrder('1001', '2026-10-22T23:37:27Z'),
				toProjectOrder('1002', '2026-10-22T23:37:28Z'),
			],
			placedOrders: [],
		});

		vi.mocked(useOrderDates).mockReturnValue({
			loading: false,
			orderDates: new Map([[1001, '2023-09-30T00:00:00Z']]),
		});

		renderOrdersTab();

		expect(screen.getByText('Sep 30, 2023')).toBeInTheDocument();
		expect(screen.getAllByText('Oct 22, 2026')).toHaveLength(1);
	});

	it('sorts the orders by order date, newest first', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: undefined,
			loading: false,
			orders: [
				toProjectOrder('1001', '2026-10-22T23:37:29Z'),
				toProjectOrder('1002', '2026-10-22T23:37:28Z'),
				toProjectOrder('1003', '2026-10-22T23:37:27Z'),
			],
			placedOrders: [],
		});

		vi.mocked(useOrderDates).mockReturnValue({
			loading: false,
			orderDates: new Map([
				[1001, '2021-01-15T00:00:00Z'],
				[1002, '2024-06-01T00:00:00Z'],
				[1003, '2022-03-10T00:00:00Z'],
			]),
		});

		renderOrdersTab();

		const rows = getOrderRows();

		expect(rows[0]).toContain('1002');
		expect(rows[1]).toContain('1003');
		expect(rows[2]).toContain('1001');
	});

	it('shows no date while the order dates load', () => {
		vi.mocked(useProjectOrders).mockReturnValue({
			error: undefined,
			loading: false,
			orders: [toProjectOrder('1001', '2026-10-22T23:37:27Z')],
			placedOrders: [],
		});

		vi.mocked(useOrderDates).mockReturnValue({
			loading: true,
			orderDates: new Map(),
		});

		renderOrdersTab();

		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(screen.queryByText('Oct 22, 2026')).not.toBeInTheDocument();
	});
});
