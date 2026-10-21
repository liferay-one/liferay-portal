/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {useProjectContractItems} from '~/hooks/useProjectItems';

import Products from './Products';

vi.mock('~/hooks/useProjectItems', () => ({useProjectContractItems: vi.fn()}));

function product(name: string, type: string): ProjectProduct {
	return {
		externalReferenceCode: `ERC-${name}`,
		id: name,
		name,
		publisher: 'Liferay',
		saleType: '',
		specifications: [],
		startDate: '2026-01-01',
		status: 'active',
		type,
	};
}

function renderProducts(products: ProjectProduct[]) {
	vi.mocked(useProjectContractItems).mockReturnValue({
		error: undefined,
		loading: false,
		products,
	} as ReturnType<typeof useProjectContractItems>);

	return render(
		<MemoryRouter>
			<Products />
		</MemoryRouter>
	);
}

async function openTypeFilter(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', {name: 'Filter'}));
	await user.click(screen.getByRole('button', {name: 'Type'}));
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTS] Products', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders product rows without icons or colored icon placeholders', () => {
		const {container} = renderProducts([
			product('Subscription Portal EE - Gold', 'Platform'),
		]);

		const nameElement = screen.getByText('Subscription Portal EE - Gold');
		expect(nameElement).toBeInTheDocument();
		expect(screen.getByText('By Liferay')).toBeInTheDocument();

		const nameCell = nameElement.closest('td');
		expect(nameCell?.querySelector('.list-card-icon')).toBeNull();
		expect(nameCell?.querySelector('svg')).toBeNull();
		expect(container.querySelector('.list-card-icon')).toBeNull();
	});

	it('labels the option for products with no type as None', async () => {
		const user = userEvent.setup();

		renderProducts([product('Alpha', 'Cloud'), product('Beta', '')]);

		await openTypeFilter(user);

		expect(screen.getAllByRole('checkbox')).toHaveLength(2);
		expect(screen.getByRole('checkbox', {name: 'Cloud'})).toBeTruthy();

		await user.click(screen.getByRole('checkbox', {name: 'None'}));
		await user.click(screen.getByRole('button', {name: 'Add Filter'}));

		expect(screen.getByText('Beta')).toBeTruthy();
		expect(screen.queryByText('Alpha')).toBeNull();
		expect(screen.getByText('Type: None')).toBeTruthy();
	});

	it('does not list None when every product has a type', async () => {
		const user = userEvent.setup();

		renderProducts([
			product('Alpha', 'Cloud'),
			product('Gamma', 'Subscription'),
		]);

		await openTypeFilter(user);

		expect(screen.getAllByRole('checkbox')).toHaveLength(2);
		expect(screen.queryByRole('checkbox', {name: 'None'})).toBeNull();
	});
});
