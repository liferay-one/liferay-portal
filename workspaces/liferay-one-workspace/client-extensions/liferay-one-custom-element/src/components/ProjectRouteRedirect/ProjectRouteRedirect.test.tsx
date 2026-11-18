/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useAccount} from '~/context/AccountContext';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {useProjectsWithOrders} from '~/pages/MyAccount/Projects/projects';

import ProjectRouteRedirect from './ProjectRouteRedirect';

vi.mock('~/components/EmptyState/EmptyState', () => ({
	default: ({title, type}: {title: string; type: string}) => (
		<div data-testid="empty-state">{`${type} ${title}`}</div>
	),
}));

vi.mock('~/components/Loading/Loading', () => ({
	default: {Page: () => <div data-testid="page-loading" />},
}));

vi.mock(
	'~/components/RestrictedFeatureMessage/RestrictedFeatureMessage',
	() => ({
		default: () => <div data-testid="restricted-feature-message" />,
	})
);

vi.mock('~/context/AccountContext', () => ({useAccount: vi.fn()}));

vi.mock('~/hooks/useAccounts', () => ({useCurrentAccount: vi.fn()}));

vi.mock('~/i18n', () => ({translate: (key: string) => key}));

vi.mock('~/pages/MyAccount/Projects/projects', async () => {
	const {resolveProjectERC} = await import(
		'~/pages/MyAccount/Projects/utils/resolveProjectERC'
	);

	return {
		getCurrentUserId: () => '7',
		getLastViewedProjectCookie: () => 'PRJCT-LAST',
		getSelectedAccountId: () => '1',
		resolveProjectERC,
		useProjectsWithOrders: vi.fn(),
	};
});

const projects = [
	{externalReferenceCode: 'PRJCT-FIRST', id: 1, member: true, name: 'First'},
	{externalReferenceCode: 'PRJCT-LAST', id: 2, member: true, name: 'Last'},
];

function getPath(
	accountERC: string,
	projectERC: string,
	...segments: string[]
) {
	return ['', accountERC, 'project', projectERC, 'items', ...segments].join(
		'/'
	);
}

function mockProjects(userProjects = projects, loading = false) {
	vi.mocked(useProjectsWithOrders).mockReturnValue({
		hasAccountProjects: Boolean(userProjects.length),
		loading,
		projects: userProjects,
	});
}

function CurrentPath() {
	return <div data-testid="items">{useLocation().pathname}</div>;
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route
					element={
						<ProjectRouteRedirect getPath={getPath} title="Items" />
					}
					index
				/>

				<Route
					element={
						<ProjectRouteRedirect getPath={getPath} title="Items" />
					}
					path="/:accountERC/project"
				/>

				<Route
					element={<CurrentPath />}
					path="/:accountERC/project/:projectERC/items"
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-BUSINESS-EVENTS-PROJECT] ProjectRouteRedirect', () => {
	beforeEach(() => {
		vi.mocked(useAccount).mockReturnValue({loading: false});

		vi.mocked(useCurrentAccount).mockReturnValue({
			data: {externalReferenceCode: 'ACCNT-CURRENT'},
			isLoading: false,
		} as ReturnType<typeof useCurrentAccount>);

		mockProjects();
	});

	it('opens the last viewed project of the current account from the root', () => {
		renderAt('/');

		expect(screen.getByTestId('items')).toHaveTextContent(
			'/ACCNT-CURRENT/project/PRJCT-LAST/items'
		);
	});

	it('keeps the account of the URL', () => {
		renderAt('/ACCNT-URL/project');

		expect(screen.getByTestId('items')).toHaveTextContent(
			'/ACCNT-URL/project/PRJCT-LAST/items'
		);
	});

	it('waits while the account loads', () => {
		vi.mocked(useAccount).mockReturnValue({loading: true});

		renderAt('/ACCNT-URL/project');

		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
	});

	it('waits while the projects load', () => {
		mockProjects([], true);

		renderAt('/');

		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
	});

	it('shows the no access state when the current account does not load', () => {
		vi.mocked(useCurrentAccount).mockReturnValue({
			data: undefined,
			isLoading: false,
		} as ReturnType<typeof useCurrentAccount>);

		renderAt('/');

		expect(screen.getByTestId('empty-state')).toHaveTextContent(
			'NO_ACCESS you-do-not-have-access-to-this-page'
		);
	});

	it('shows the restricted message when the account has no project', () => {
		mockProjects([]);

		renderAt('/');

		expect(
			screen.getByTestId('restricted-feature-message')
		).toBeInTheDocument();
	});
});
