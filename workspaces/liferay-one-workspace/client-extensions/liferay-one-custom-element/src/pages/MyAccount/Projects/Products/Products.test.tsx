/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProjectContractItems} from '~/hooks/useProjectItems';

import Products from './Products';

vi.mock('~/hooks/useProjectItems', () => ({
	useProjectContractItems: vi.fn(),
}));

describe('[ROUTE-MY-ACCOUNT-PRODUCTS] Products', () => {
	beforeEach(() => {
		vi.mocked(useProjectContractItems).mockReturnValue({
			applications: [],
			error: undefined,
			loading: false,
			orderByProductExternalReferenceCode: new Map(),
			products: [
				{
					externalReferenceCode: 'PRDCT-1',
					id: '1',
					name: 'Subscription Portal EE - Gold',
					publisher: 'Liferay',
					saleType: 'recurring',
					specifications: [],
					startDate: 'Sep 5, 2026',
					status: 'active',
					type: 'Platform',
				},
			],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders product rows without icons or colored icon placeholders', () => {
		const {container} = render(
			<MemoryRouter>
				<Products />
			</MemoryRouter>
		);

		const nameElement = screen.getByText('Subscription Portal EE - Gold');
		expect(nameElement).toBeInTheDocument();
		expect(screen.getByText('By Liferay')).toBeInTheDocument();

		const nameCell = nameElement.closest('td');
		expect(nameCell?.querySelector('.list-card-icon')).toBeNull();
		expect(nameCell?.querySelector('svg')).toBeNull();
		expect(container.querySelector('.list-card-icon')).toBeNull();
	});
});
