/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {usePlacedOrder} from '~/hooks/usePlacedOrder';

import OrderDetails from './OrderDetails';

vi.mock('~/hooks/usePlacedOrder', () => ({usePlacedOrder: vi.fn()}));

function mockPlacedOrder(options: object[]) {
	vi.mocked(usePlacedOrder).mockReturnValue({
		data: {
			id: 57942,
			placedOrderItems: [
				{
					id: 1,
					name: 'Liferay SaaS',
					options: JSON.stringify(options),
					productId: 101,
					quantity: 1,
					sku: '01t4u00000f7jP1AAI',
				},
			],
		},
		error: undefined,
		isLoading: false,
	} as unknown as ReturnType<typeof usePlacedOrder>);
}

function renderOrderDetails() {
	return render(
		<MemoryRouter initialEntries={['/orders/57942']}>
			<Routes>
				<Route element={<OrderDetails />} path="/orders/:orderId" />
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-ORDERID] OrderDetails', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows the Salesforce product name of an order item', () => {
		mockPlacedOrder([
			{
				key: 'liferay-saas',
				skuOptionValueNames: ['Liferay SaaS - Business Plan'],
			},
		]);

		renderOrderDetails();

		expect(screen.getByText('Liferay SaaS - Business Plan')).toBeTruthy();
		expect(screen.queryByText('Liferay SaaS')).toBeNull();
	});

	it('shows no version column for the order items', () => {
		mockPlacedOrder([]);

		renderOrderDetails();

		expect(screen.getByText('SKU')).toBeTruthy();
		expect(screen.queryByText('Version')).toBeNull();
	});

	it('shows the Salesforce product option before any other option', () => {
		mockPlacedOrder([
			{
				key: 'base-license-usage-type',
				skuOptionValueNames: ['Plan Enterprise'],
			},
			{
				key: 'salesforce-product',
				skuOptionValueNames: ['Liferay SaaS - Enterprise Plan'],
			},
		]);

		renderOrderDetails();

		expect(screen.getByText('Liferay SaaS - Enterprise Plan')).toBeTruthy();
		expect(screen.queryByText('Plan Enterprise')).toBeNull();
	});

	it('shows the order item name for an app with a license tier', () => {
		mockPlacedOrder([
			{
				key: 'base-license-usage-type',
				skuOptionValueNames: ['Developer'],
			},
		]);

		renderOrderDetails();

		expect(screen.getByText('Liferay SaaS')).toBeTruthy();
		expect(screen.queryByText('Developer')).toBeNull();
	});

	it('shows the order item name when the SKU has no options', () => {
		mockPlacedOrder([]);

		renderOrderDetails();

		expect(screen.getByText('Liferay SaaS')).toBeTruthy();
	});
});
