/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useAccount} from '~/context/AccountContext';
import {
	setLastViewedProjectCookie,
	useProjectsWithOrders,
} from '~/pages/MyAccount/Projects/projects';

import ProjectRouteLayout from './ProjectRouteLayout';

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
		default: ({message}: {message?: string}) => (
			<div data-testid="restricted-feature-message">{message}</div>
		),
	})
);

vi.mock('~/context/AccountContext', () => ({useAccount: vi.fn()}));

vi.mock('~/i18n', () => ({translate: (key: string) => key}));

vi.mock('~/pages/MyAccount/Projects/projects', () => ({
	getCurrentUserId: () => '7',
	getSelectedAccountId: () => '1',
	setLastViewedProjectCookie: vi.fn(),
	useProjectsWithOrders: vi.fn(),
}));

const projects = [
	{
		externalReferenceCode: 'PRJCT-1',
		id: 1,
		member: true,
		name: 'Project',
	},
];

function mockProjects(loading = false, userProjects = projects) {
	vi.mocked(useProjectsWithOrders).mockReturnValue({
		hasAccountProjects: true,
		loading,
		projects: userProjects,
	});
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route
					element={<ProjectRouteLayout title="Items" />}
					path="/:accountERC/project/:projectERC/items"
				>
					<Route element={<div data-testid="items" />} index />
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('[ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] ProjectRouteLayout', () => {
	beforeEach(() => {
		vi.mocked(setLastViewedProjectCookie).mockClear();
		vi.mocked(useAccount).mockReturnValue({loading: false});

		mockProjects();
	});

	it('renders a project of the account and remembers it', () => {
		renderAt('/ACCNT-1/project/PRJCT-1/items');

		expect(screen.getByTestId('items')).toBeInTheDocument();
		expect(setLastViewedProjectCookie).toHaveBeenCalledWith(
			'1',
			'PRJCT-1',
			'7'
		);
	});

	it('waits while the account switches', () => {
		vi.mocked(useAccount).mockReturnValue({loading: true});

		renderAt('/ACCNT-1/project/PRJCT-1/items');

		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
	});

	it('waits while the projects load', () => {
		mockProjects(true);

		renderAt('/ACCNT-1/project/PRJCT-1/items');

		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
	});

	it('shows no access and not another project for a project outside the account', () => {
		renderAt('/ACCNT-1/project/PRJCT-OTHER/items');

		expect(screen.getByTestId('empty-state')).toHaveTextContent(
			'NO_ACCESS you-do-not-have-access-to-this-page'
		);
		expect(screen.queryByTestId('items')).not.toBeInTheDocument();
		expect(setLastViewedProjectCookie).not.toHaveBeenCalled();
	});

	it('shows the restricted message when the user has no project in the account', () => {
		mockProjects(false, []);

		renderAt('/ACCNT-1/project/PRJCT-1/items');

		expect(
			screen.getByTestId('restricted-feature-message')
		).toHaveTextContent(
			'login-as-a-user-that-has-access-to-a-project-or-contact-your-project-administrator-to-add-you-to-a-project.'
		);
		expect(screen.queryByTestId('items')).not.toBeInTheDocument();
		expect(setLastViewedProjectCookie).not.toHaveBeenCalled();
	});
});
