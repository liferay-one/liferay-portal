/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ProductSpecificationKey, SolutionTypes} from '~/enums/Product';
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

	it('shows the filter and columns buttons as icons only', () => {
		renderProducts([product('Liferay DXP', 'Platform')]);

		expect(
			screen.getByRole('button', {name: 'Filter'})
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'Columns'})
		).toBeInTheDocument();
		expect(screen.queryByText('Filter')).toBeNull();
	});

	it('sorts products when a column header is clicked', () => {
		const {container} = renderProducts([
			product('Beta', 'Platform'),
			product('Alpha', 'Platform'),
			product('Gamma', 'Platform'),
		]);

		const getNames = () =>
			Array.from(container.querySelectorAll('.list-card-name-label')).map(
				(element) => element.textContent
			);

		expect(getNames()).toEqual(['Beta', 'Alpha', 'Gamma']);

		fireEvent.click(screen.getByRole('button', {name: 'Name'}));

		expect(getNames()).toEqual(['Alpha', 'Beta', 'Gamma']);

		fireEvent.click(screen.getByRole('button', {name: 'Name'}));

		expect(getNames()).toEqual(['Gamma', 'Beta', 'Alpha']);
	});

	it('hides a column that is cleared in the columns menu', async () => {
		renderProducts([product('Liferay DXP', 'Platform')]);

		expect(
			screen.getByRole('button', {name: 'Start Date'})
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Columns'}));

		fireEvent.click(
			await screen.findByRole('checkbox', {name: 'Start Date'})
		);

		expect(screen.queryByRole('button', {name: 'Start Date'})).toBeNull();
	});

	it('opens the project Activation page from a contract scoped list', async () => {
		vi.mocked(useProjectContractItems).mockReturnValue({
			error: undefined,
			loading: false,
			products: [
				{
					...product('Liferay DXP - Free Tier', 'Platform'),
					specifications: [
						{
							specificationKey:
								ProductSpecificationKey.SOLUTION_TYPE,
							value: SolutionTypes.DXP,
						},
					],
				} as ProjectProduct,
			],
		} as ReturnType<typeof useProjectContractItems>);

		render(
			<MemoryRouter
				initialEntries={[
					'/ACCNT-1/project/PRJCT-1/contract/C_1/products',
				]}
			>
				<Routes>
					<Route path="/:accountERC/project/:projectERC">
						<Route element="Activation page" path="activation" />
						<Route path="contract/:contractERC">
							<Route path="products">
								<Route element={<Products />} index />
							</Route>
						</Route>
					</Route>
				</Routes>
			</MemoryRouter>
		);

		fireEvent.click(screen.getByRole('button', {name: 'Actions'}));

		fireEvent.click(await screen.findByText('View Activation Key'));

		expect(await screen.findByText('Activation page')).toBeInTheDocument();
	});
});
