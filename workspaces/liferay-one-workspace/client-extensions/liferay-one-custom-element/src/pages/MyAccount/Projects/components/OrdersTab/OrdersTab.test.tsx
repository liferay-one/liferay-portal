/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import FetcherError from '~/services/fetcher/FetcherError';

import OrdersTab from './OrdersTab';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectOrders', () => ({useProjectOrders: vi.fn()}));

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
			orders: [
				{
					date: 'Mar 15, 2026',
					id: '1001',
					orderId: '1001',
					status: 'completed',
					total: '$10.00',
				},
			],
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
			orders: [
				{
					date: 'Mar 15, 2026',
					id: '1001',
					orderId: '1001',
					status: 'completed',
					total: '$10.00',
				},
			],
			placedOrders: [],
		});

		renderOrdersTab();

		expect(screen.getByText('1001')).toBeInTheDocument();
		expect(
			screen.queryByText('An error occurred while fetching the data.')
		).not.toBeInTheDocument();
	});
});
