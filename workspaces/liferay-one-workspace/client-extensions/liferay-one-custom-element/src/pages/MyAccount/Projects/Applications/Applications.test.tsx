/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ProjectProduct} from '~/hooks/useProjectCommerce';
import {useProjectItems} from '~/hooks/useProjectItems';

import Applications from './Applications';

vi.mock('~/hooks/useProjectItems', () => ({useProjectItems: vi.fn()}));

function application(name: string, saleType: string): ProjectProduct {
	return {
		externalReferenceCode: `ERC-${name}`,
		id: name,
		name,
		publisher: 'Liferay',
		saleType,
		specifications: [],
		startDate: '2026-01-01',
		status: 'active',
		type: '',
	};
}

function renderApplications(applications: ProjectProduct[]) {
	vi.mocked(useProjectItems).mockReturnValue({
		applications,
		error: undefined,
		loading: false,
		orderByProductExternalReferenceCode: new Map(),
	} as unknown as ReturnType<typeof useProjectItems>);

	return render(
		<MemoryRouter>
			<Applications />
		</MemoryRouter>
	);
}

async function openSaleTypeFilter(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', {name: 'Filter'}));
	await user.click(screen.getByRole('button', {name: 'Sale Type'}));
}

describe('[ROUTE-MY-ACCOUNT-APPLICATIONS] Applications', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders application rows without icons or colored icon placeholders', () => {
		const {container} = renderApplications([
			application('Sample App', 'free'),
		]);

		const nameElement = screen.getByText('Sample App');
		expect(nameElement).toBeInTheDocument();
		expect(screen.getByText('Liferay')).toBeInTheDocument();

		const nameCell = nameElement.closest('td');
		expect(nameCell?.querySelector('.list-card-icon')).toBeNull();
		expect(nameCell?.querySelector('svg')).toBeNull();
		expect(container.querySelector('.list-card-icon')).toBeNull();
	});

	it('labels the option for applications with no sale type as None', async () => {
		const user = userEvent.setup();

		renderApplications([
			application('Alpha', 'Paid'),
			application('Beta', ''),
		]);

		await openSaleTypeFilter(user);

		expect(screen.getAllByRole('checkbox')).toHaveLength(2);
		expect(screen.getByRole('checkbox', {name: 'Paid'})).toBeTruthy();

		await user.click(screen.getByRole('checkbox', {name: 'None'}));
		await user.click(screen.getByRole('button', {name: 'Add Filter'}));

		expect(screen.getByText('Beta')).toBeTruthy();
		expect(screen.queryByText('Alpha')).toBeNull();
		expect(screen.getByText('Sale Type: None')).toBeTruthy();
	});

	it('does not list None when every application has a sale type', async () => {
		const user = userEvent.setup();

		renderApplications([
			application('Alpha', 'Paid'),
			application('Gamma', 'Free'),
		]);

		await openSaleTypeFilter(user);

		expect(screen.getAllByRole('checkbox')).toHaveLength(2);
		expect(screen.queryByRole('checkbox', {name: 'None'})).toBeNull();
	});
});
