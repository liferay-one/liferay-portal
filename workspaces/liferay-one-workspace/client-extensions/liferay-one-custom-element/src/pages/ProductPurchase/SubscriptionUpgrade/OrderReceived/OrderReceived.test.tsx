/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

import OrderReceived from './OrderReceived';

import type {DeliveryProduct} from '~/types/product';

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {getAccount: vi.fn()},
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

const product = {
	name: 'Content Marketing Platform',
} as unknown as DeliveryProduct;

function renderOrderReceived(search: string) {
	return render(
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			<MemoryRouter initialEntries={[`/order-received${search}`]}>
				<OrderReceived product={product} />
			</MemoryRouter>
		</SWRConfig>
	);
}

describe('OrderReceived', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {
			accountId: 7,
			accountName: 'El Torero Spa',
		};
		Liferay.Util.navigate = vi.fn();

		vi.mocked(HeadlessAdminUser.getAccount).mockResolvedValue({
			id: 7,
			name: 'El Torero Spa',
		} as Awaited<ReturnType<typeof HeadlessAdminUser.getAccount>>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the awaiting signature status, the order ID, and the order form message', async () => {
		renderOrderReceived('?orderId=1458182');

		expect(
			await screen.findByText('Order Received: Awaiting Signature')
		).toBeInTheDocument();
		expect(screen.getByText('1458182')).toBeInTheDocument();
		expect(
			screen.getByText(
				/Thank you for your purchase of Content Marketing Platform\. An order form will be sent to your email via DocuSign/
			)
		).toBeInTheDocument();
		expect(screen.getByText('El Torero Spa')).toBeInTheDocument();
	});

	it('renders no confirmation without an order ID', () => {
		renderOrderReceived('');

		expect(screen.getByText('No Results Found')).toBeInTheDocument();
		expect(
			screen.queryByText('Order Received: Awaiting Signature')
		).not.toBeInTheDocument();
	});

	it('opens the Marketplace products when the user browses products', async () => {
		renderOrderReceived('?orderId=1458182');

		await userEvent.click(
			await screen.findByRole('button', {name: 'Browse Products'})
		);

		expect(Liferay.Util.navigate).toHaveBeenCalledWith(
			'/web/one/marketplace/products'
		);
	});
});
