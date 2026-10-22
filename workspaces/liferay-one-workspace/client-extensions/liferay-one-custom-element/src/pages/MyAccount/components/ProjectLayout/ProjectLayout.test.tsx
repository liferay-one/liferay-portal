/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NavItem} from '~/components/SideNav/SideNav';
import {useProject} from '~/context/ProjectContext';

import ProjectLayout from './ProjectLayout';

vi.mock('~/components/AppLayout/AppLayout', () => ({
	default: ({
		contentHeader,
		navItems,
	}: {
		contentHeader?: ReactNode;
		navItems: NavItem[];
	}) => (
		<>
			{contentHeader}

			<ul>
				{navItems.map((item) => (
					<li key={item.path}>{item.path}</li>
				))}
			</ul>
		</>
	),
}));

vi.mock('~/components/Breadcrumb/Breadcrumb', () => ({default: () => null}));

vi.mock('~/components/ProjectSelector/ProjectSelector', () => ({
	default: () => null,
}));

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('../../Projects/components/ProjectHeader/ProjectHeader', () => ({
	default: () => 'ProjectHeader',
}));

function mockProject(selectedContractERC?: string, projectId = 'PRJCT-1') {
	vi.mocked(useProject).mockReturnValue({
		projectId,
		projects: [{externalReferenceCode: projectId}],
		resolvingProjects: false,
		selectedContractERC,
	} as unknown as ReturnType<typeof useProject>);
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route
					element={<ProjectLayout />}
					path="/:accountERC/project/:projectERC/*"
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-MY-ACCOUNT-CONTRACT-CONTRACTERC] ProjectLayout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('points the Products nav item at the selected contract', () => {
		mockProject('C_10');

		renderAt('/ACCNT-1/project/PRJCT-1/applications');

		expect(
			screen.getByText('/ACCNT-1/project/PRJCT-1/contract/C_10/products')
		).toBeInTheDocument();
		expect(
			screen.getByText('/ACCNT-1/project/PRJCT-1/applications')
		).toBeInTheDocument();
	});

	it('points the Products nav item at the plain products path without a contract', () => {
		mockProject();

		renderAt('/ACCNT-1/project/PRJCT-1/applications');

		expect(
			screen.getByText('/ACCNT-1/project/PRJCT-1/products')
		).toBeInTheDocument();
	});

	it.each([
		'/ACCNT-1/project/PRJCT-1/contract/C_10/products',
		'/ACCNT-1/project/PRJCT-1/contract/C_10/products/PRDCT-1',
		'/ACCNT-1/project/PRJCT-1/products',
	])('shows the contract header at %s', (pathname) => {
		mockProject('C_10');

		renderAt(pathname);

		expect(screen.getByText('ProjectHeader')).toBeInTheDocument();
	});

	it('hides the contract header outside the products pages', () => {
		mockProject('C_10');

		renderAt('/ACCNT-1/project/PRJCT-1/applications');

		expect(screen.queryByText('ProjectHeader')).not.toBeInTheDocument();
	});

	it('hides the contract header for the unassigned project', () => {
		mockProject(undefined, 'one-time-purchases');

		renderAt('/ACCNT-1/project/one-time-purchases/products');

		expect(screen.queryByText('ProjectHeader')).not.toBeInTheDocument();
	});
});
