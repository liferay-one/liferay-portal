/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
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
		expect(screen.queryByText('By Liferay')).toBeNull();

		const nameCell = nameElement.closest('td');
		expect(nameCell?.querySelector('.list-card-icon')).toBeNull();
		expect(nameCell?.querySelector('svg')).toBeNull();
		expect(container.querySelector('.list-card-icon')).toBeNull();
	});
});
