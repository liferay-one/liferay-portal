/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, render, screen} from '@testing-library/react';
import {
	MemoryRouter,
	NavigateFunction,
	Route,
	Routes,
	useLocation,
	useNavigate,
	useNavigationType,
} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useAccount} from '~/context/AccountContext';
import {
	useProjectProducts,
	useUnassignedCommerce,
} from '~/hooks/useProjectCommerce';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import {useUserProjects} from '~/pages/MyAccount/Projects/hooks/useUserProjects';
import {
	LAST_PROJECT_STORAGE_KEY,
	ONE_TIME_PURCHASES,
} from '~/pages/MyAccount/Projects/projects';

import {ProjectProvider, useProject} from './ProjectContext';

vi.mock('~/context/AccountContext', () => ({
	useAccount: vi.fn(),
}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useProjectProducts: vi.fn(),
	useUnassignedCommerce: vi.fn(),
}));

vi.mock('~/hooks/useProjectOrders', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/hooks/useProjectOrders')>()),
	useProjectOrders: vi.fn(),
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useUserProjects', () => ({
	useUserProjects: vi.fn(),
}));

const alpha = {externalReferenceCode: 'PRJCT-ALPHA', id: 1, name: 'Alpha'};
const beta = {externalReferenceCode: 'PRJCT-BETA', id: 2, name: 'Beta'};

const alphaOrder = {customFields: {projectName: 'Alpha'}, placedOrderItems: []};
const betaOrder = {
	customFields: {salesforceProjectId: 'PRJCT-BETA'},
	placedOrderItems: [],
};

const applicationProduct = {
	externalReferenceCode: 'PRDCT-APP',
	id: 500,
	name: 'App',
	productId: 50,
	productSpecifications: [
		{specificationKey: 'project-item-type', value: 'application'},
	],
};

let navigateTo: NavigateFunction;
let navigationType: string;
let projectValue: ReturnType<typeof useProject>;

function ProjectConsumer() {
	const location = useLocation();

	navigateTo = useNavigate();
	navigationType = useNavigationType();
	projectValue = useProject();

	return <div data-testid="location">{location.pathname}</div>;
}

function mockState({
	accountLoading = false,
	hasUnassignedEntitlements = false,
	ordersError = undefined as unknown,
	placedOrders = [alphaOrder, betaOrder] as unknown[],
	projects = [alpha, beta] as unknown[],
	projectsLoading = false,
	unassignedLoading = false,
} = {}) {
	vi.mocked(useAccount).mockReturnValue({loading: accountLoading});
	vi.mocked(useProjectProducts).mockReturnValue({
		data: {items: [applicationProduct]},
		isLoading: false,
	} as unknown as ReturnType<typeof useProjectProducts>);
	vi.mocked(useProjectOrders).mockReturnValue({
		error: ordersError,
		loading: false,
		placedOrders,
	} as unknown as ReturnType<typeof useProjectOrders>);
	vi.mocked(useUnassignedCommerce).mockReturnValue({
		hasUnassignedEntitlements,
		loading: unassignedLoading,
	} as unknown as ReturnType<typeof useUnassignedCommerce>);
	vi.mocked(useUserProjects).mockReturnValue({
		accountProjects: projects,
		loading: projectsLoading,
		projects,
	} as unknown as ReturnType<typeof useUserProjects>);
}

function renderProvider(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					element={
						<ProjectProvider>
							<ProjectConsumer />
						</ProjectProvider>
					}
					path="/:accountERC/project"
				>
					<Route path=":projectERC/*" />
					<Route path=":projectERC/contract/:contractERC/*" />
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('[CTX-PROJECTCONTEXT] ProjectProvider', () => {
	beforeEach(() => {
		localStorage.clear();

		mockState();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('resolves the project from the route ERC and saves it as the last project', () => {
		renderProvider('/ACCNT-1/project/PRJCT-BETA');

		expect(projectValue.project).toEqual(beta);
		expect(projectValue.projectId).toBe('PRJCT-BETA');
		expect(projectValue.projects).toEqual([alpha, beta]);
		expect(localStorage.getItem(LAST_PROJECT_STORAGE_KEY)).toBe(
			'PRJCT-BETA'
		);
		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-BETA'
		);
	});

	it('does not append One Time Purchases without unassigned orders or entitlements', () => {
		mockState({
			placedOrders: [
				{
					customFields: {projectName: 'Alpha'},
					placedOrderItems: [{productId: 50}],
				},
				betaOrder,
			],
		});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(
			projectValue.projects.map(
				({externalReferenceCode}) => externalReferenceCode
			)
		).toEqual(['PRJCT-ALPHA', 'PRJCT-BETA']);
	});

	it('does not append One Time Purchases for an order that carries only a project external reference code', () => {
		mockState({
			placedOrders: [
				{
					customFields: {salesforceProjectId: 'PRJCT-ALPHA'},
					placedOrderItems: [{productId: 50}],
				},
				betaOrder,
			],
		});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.projects).toHaveLength(2);
	});

	it('appends One Time Purchases when an order with no project holds a project item', () => {
		mockState({
			placedOrders: [
				alphaOrder,
				betaOrder,
				{customFields: {}, placedOrderItems: [{productId: 50}]},
			],
		});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.projects).toHaveLength(3);
		expect(projectValue.projects[2]).toMatchObject({
			externalReferenceCode: ONE_TIME_PURCHASES,
			id: -1,
			unassigned: true,
		});
	});

	it('hides a project that has no orders', () => {
		mockState({placedOrders: [alphaOrder]});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.projects).toEqual([alpha]);
	});

	it('keeps every project when the orders cannot be read', () => {
		mockState({
			ordersError: new Error('Unable to read orders'),
			placedOrders: [],
		});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.projects).toEqual([alpha, beta]);
	});

	it('matches an order to a project by its Salesforce project ID before its name', () => {
		mockState({
			placedOrders: [
				{
					customFields: {
						projectName: 'Alpha',
						salesforceProjectId: 'PRJCT-BETA',
					},
					placedOrderItems: [],
				},
			],
		});

		renderProvider('/ACCNT-1/project/PRJCT-BETA');

		expect(projectValue.projects).toEqual([beta]);
	});

	it('redirects a project that has no orders to a project that has orders', () => {
		mockState({placedOrders: [betaOrder]});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-BETA'
		);
	});

	it('appends One Time Purchases when unassigned entitlements exist', () => {
		mockState({hasUnassignedEntitlements: true});

		renderProvider(`/ACCNT-1/project/${ONE_TIME_PURCHASES}`);

		expect(projectValue.project).toMatchObject({
			externalReferenceCode: ONE_TIME_PURCHASES,
			id: -1,
			unassigned: true,
		});
	});

	it('redirects an inaccessible route project to the default project with replace', () => {
		localStorage.setItem(LAST_PROJECT_STORAGE_KEY, 'PRJCT-BETA');

		renderProvider('/ACCNT-1/project/PRJCT-UNKNOWN');

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-BETA'
		);
		expect(navigationType).toBe('REPLACE');
		expect(projectValue.project).toEqual(beta);
	});

	it('does not save an inaccessible project as the last project', () => {
		mockState({projects: []});

		renderProvider('/ACCNT-1/project/PRJCT-UNKNOWN');

		expect(localStorage.getItem(LAST_PROJECT_STORAGE_KEY)).toBeNull();
		expect(projectValue.project).toBeUndefined();
		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-UNKNOWN'
		);
	});

	it.each([
		['account', {accountLoading: true}],
		['projects', {projectsLoading: true}],
		['unassigned commerce', {unassignedLoading: true}],
	])('does not redirect while the %s data resolves', (_label, state) => {
		mockState(state);

		renderProvider('/ACCNT-1/project/PRJCT-UNKNOWN');

		expect(projectValue.resolvingProjects).toBe(true);
		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-UNKNOWN'
		);
	});

	it('reports loading from account, products, orders, and projects but not from unassigned commerce', () => {
		mockState({unassignedLoading: true});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.loading).toBe(false);
		expect(projectValue.resolvingProjects).toBe(true);

		mockState({accountLoading: true});

		renderProvider('/ACCNT-1/project/PRJCT-ALPHA');

		expect(projectValue.loading).toBe(true);
	});

	it('reads the selected contract from the route', () => {
		renderProvider(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-1/products'
		);

		expect(projectValue.selectedContractERC).toBe('CONTRACT-1');
	});

	it('keeps the remembered contract of the project on a section without a contract', () => {
		renderProvider(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-1/products'
		);

		act(() => {
			projectValue.rememberContractERC('CONTRACT-1');
		});

		act(() => {
			navigateTo('/ACCNT-1/project/PRJCT-ALPHA/applications');
		});

		expect(projectValue.selectedContractERC).toBe('CONTRACT-1');
	});

	it('does not remember a contract that only the route names', () => {
		renderProvider(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-99/products'
		);

		act(() => {
			navigateTo('/ACCNT-1/project/PRJCT-ALPHA/applications');
		});

		expect(projectValue.selectedContractERC).toBeUndefined();
	});

	it('forgets the remembered contract when the project changes', () => {
		renderProvider('/ACCNT-1/project/PRJCT-ALPHA/applications');

		act(() => {
			projectValue.rememberContractERC('CONTRACT-1');
		});

		act(() => {
			navigateTo('/ACCNT-1/project/PRJCT-BETA/applications');
		});

		expect(projectValue.selectedContractERC).toBeUndefined();
	});

	it('navigates to the products of the selected contract', () => {
		renderProvider(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-1/products/PRDCT-1'
		);

		act(() => {
			projectValue.setSelectedContractERC('CONTRACT-2');
		});

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-2/products'
		);
		expect(projectValue.selectedContractERC).toBe('CONTRACT-2');
	});

	it('clears the selected contract when the project changes', () => {
		renderProvider(
			'/ACCNT-1/project/PRJCT-ALPHA/contract/CONTRACT-1/products'
		);

		act(() => {
			navigateTo('/ACCNT-1/project/PRJCT-BETA');
		});

		expect(projectValue.project).toEqual(beta);
		expect(projectValue.selectedContractERC).toBeUndefined();
	});
});
