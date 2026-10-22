/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useProjectContractERC} from '~/hooks/useProjectItems';

import ContractRedirect from './ContractRedirect';

vi.mock('~/components/Loading/Loading', () => ({
	default: {Page: () => 'Loading page'},
}));

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectItems', () => ({useProjectContractERC: vi.fn()}));

const rememberContractERC = vi.fn();

function Location() {
	const {pathname, search} = useLocation();

	return <div data-testid="location">{`${pathname}${search}`}</div>;
}

function mockContractERC(
	contractERC?: string,
	{error, loading = false}: {error?: Error; loading?: boolean} = {}
) {
	vi.mocked(useProjectContractERC).mockReturnValue({
		contractERC,
		error,
		loading,
	});
}

function renderAt(pathname: string) {
	const productRoutes = (
		<>
			<Route element={<Location />} index />
			<Route element={<Location />} path=":productERC" />
		</>
	);

	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route path="/:accountERC/project/:projectERC">
					<Route element={<ContractRedirect />} path="products">
						{productRoutes}
					</Route>
					<Route
						element={<ContractRedirect />}
						path="contract/:contractERC"
					>
						<Route element={<Location />} index />
						<Route path="products">{productRoutes}</Route>
					</Route>
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-CONTRACT-CONTRACTERC] ContractRedirect', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useProject).mockReturnValue({
			rememberContractERC,
		} as unknown as ReturnType<typeof useProject>);
	});

	it('shows the loading page while the contract resolves', () => {
		mockContractERC(undefined, {loading: true});

		renderAt('/ACCNT-1/project/PRJCT-A/products');

		expect(screen.getByText('Loading page')).toBeInTheDocument();
		expect(screen.queryByTestId('location')).not.toBeInTheDocument();
	});

	it('keeps the requested URL when the contracts fail to load', () => {
		mockContractERC(undefined, {error: new Error('Unable to load')});

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_20/products/PRDCT-9');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_20/products/PRDCT-9'
		);
		expect(rememberContractERC).not.toHaveBeenCalled();
	});

	it('remembers a requested contract that resolves to itself', () => {
		mockContractERC('C_20');

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_20/products');

		expect(rememberContractERC).toHaveBeenCalledWith('C_20');
	});

	it('does not remember an unknown requested contract', () => {
		mockContractERC(undefined);

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_99/products');

		expect(rememberContractERC).not.toHaveBeenCalled();
	});

	it('sends a bare unknown contract to the products of the resolved contract', () => {
		mockContractERC('C_10');

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_99');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_10/products'
		);
	});

	it('adds the resolved contract to the products list', () => {
		mockContractERC('C_10');

		renderAt('/ACCNT-1/project/PRJCT-A/products');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_10/products'
		);
	});

	it('adds the resolved contract to a product and keeps the query', () => {
		mockContractERC('C_10');

		renderAt('/ACCNT-1/project/PRJCT-A/products/PRDCT-9?tab=orders');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_10/products/PRDCT-9?tab=orders'
		);
	});

	it('renders the products list without a contract when the project has none', () => {
		mockContractERC(undefined);

		renderAt('/ACCNT-1/project/PRJCT-A/products/PRDCT-9');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/products/PRDCT-9'
		);
	});

	it('renders a requested contract that resolves to itself', () => {
		mockContractERC('C_20');

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_20/products/PRDCT-9');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_20/products/PRDCT-9'
		);
	});

	it('replaces an unknown contract with the resolved one', () => {
		mockContractERC('C_10');

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_99/products/PRDCT-9');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/contract/C_10/products/PRDCT-9'
		);
	});

	it('removes the contract when the project has none', () => {
		mockContractERC(undefined);

		renderAt('/ACCNT-1/project/PRJCT-A/contract/C_99/products/PRDCT-9');

		expect(screen.getByTestId('location').textContent).toBe(
			'/ACCNT-1/project/PRJCT-A/products/PRDCT-9'
		);
	});
});
