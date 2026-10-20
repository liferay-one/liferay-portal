/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {Liferay} from '~/services/liferay/liferay';

import Orders from './Orders';

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({}),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

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
});
