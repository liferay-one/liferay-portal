/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {toRouteObjects} from '~/utils/routeUtils';

import {businessEventsRoutes} from './businessEventsRoutes';

import type {AppRoute} from '~/utils/routeUtils';

vi.mock('./BusinessEvents', () => ({default: () => 'BusinessEvents page'}));
vi.mock(
	'./BusinessEventsActivityHistory/BusinessEventsActivityHistory',
	() => ({
		default: () => 'BusinessEventsActivityHistory page',
	})
);
vi.mock('./BusinessEventsAdd/BusinessEventsAdd', () => ({
	default: () => 'BusinessEventsAdd page',
}));
vi.mock('./BusinessEventsDetails/BusinessEventsDetails', () => ({
	default: () => 'BusinessEventsDetails page',
}));
vi.mock('./BusinessEventsEdit/BusinessEventsEdit', () => ({
	default: () => 'BusinessEventsEdit page',
}));
function outletMock(label: string) {
	return async () => {
		const {Fragment, createElement} = await import('react');
		const {Outlet} = await import('react-router');

		return {
			default: () =>
				createElement(
					Fragment,
					null,
					createElement('span', null, label),
					createElement(Outlet)
				),
		};
	};
}

vi.mock('~/components/ProjectRouteRedirect/ProjectRouteRedirect', () => ({
	default: () => 'ProjectRouteRedirect',
}));
vi.mock('~/components/ProjectLinkRedirect/ProjectLinkRedirect', () => ({
	default: () => 'ProjectLinkRedirect',
}));
vi.mock(
	'~/components/ProjectRouteLayout/ProjectRouteLayout',
	outletMock('ProjectRouteLayout')
);
vi.mock('~/context/AccountContext', async () => ({
	AccountProvider: (await outletMock('AccountProvider')()).default,
}));

function BusinessEventsRoutesUnderTest() {
	return useRoutes(toRouteObjects(businessEventsRoutes));
}

function childPaths(route: AppRoute | undefined) {
	return route?.children?.map((child) =>
		child.index ? 'index' : child.path
	);
}

function findChild(route: AppRoute | undefined, path: string) {
	return route?.children?.find((child) => child.path === path);
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<BusinessEventsRoutesUnderTest />
			</Suspense>
		</MemoryRouter>
	);
}

const accountRoute = businessEventsRoutes.find(
	(route) => route.path === ':accountERC'
);

const projectRoute = findChild(accountRoute, 'project');

const listRoute = findChild(projectRoute, ':projectERC/business-events');

const detailRoute = findChild(listRoute, ':id');

const LIST_PATH = '/ACCNT-ALPHA/project/PRJCT-ALPHA/business-events';

describe('businessEventsRoutes', () => {
	describe('[ROUTE-BUSINESS-EVENTS-ACCOUNTERC] :accountERC', () => {
		it('nests the project route under AccountProvider', () => {
			expect(childPaths(accountRoute)).toEqual(['index', 'project']);
		});

		it('opens the project route from the account', async () => {
			renderAt('/ACCNT-ALPHA');

			expect(
				await screen.findByText('ProjectRouteRedirect')
			).toBeInTheDocument();
			expect(screen.getByText('AccountProvider')).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-PROJECT] project', () => {
		it('nests the redirect index, the business events, and the project', () => {
			expect(childPaths(projectRoute)).toEqual([
				'index',
				':projectERC/business-events',
				':projectERC',
			]);
		});

		it('renders ProjectRouteRedirect at its index', async () => {
			renderAt('/ACCNT-ALPHA/project');

			expect(
				await screen.findByText('ProjectRouteRedirect')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-PROJECTERC] :projectERC', () => {
		it('opens the business events of the project', async () => {
			renderAt('/ACCNT-ALPHA/project/PRJCT-ALPHA');

			expect(
				await screen.findByText('BusinessEvents page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] :projectERC/business-events', () => {
		it('nests the list index and the add and :id children', () => {
			expect(childPaths(listRoute)).toEqual(['index', 'add', ':id', '*']);
		});

		it('renders the list under the account and the project layout', async () => {
			renderAt(LIST_PATH);

			expect(
				await screen.findByText('BusinessEvents page')
			).toBeInTheDocument();
			expect(screen.getByText('AccountProvider')).toBeInTheDocument();
			expect(screen.getByText('ProjectRouteLayout')).toBeInTheDocument();
		});

		it('renders ProjectRouteRedirect alone at the root index', async () => {
			renderAt('/');

			expect(
				await screen.findByText('ProjectRouteRedirect')
			).toBeInTheDocument();
			expect(
				screen.queryByText('AccountProvider')
			).not.toBeInTheDocument();
		});

		it('renders ProjectLinkRedirect for a link without an account', async () => {
			renderAt('/PRJCT-ALPHA/business-events/42/edit');

			expect(
				await screen.findByText('ProjectLinkRedirect')
			).toBeInTheDocument();
			expect(
				screen.queryByText('AccountProvider')
			).not.toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-ADD] add', () => {
		it('renders the BusinessEventsAdd page', async () => {
			renderAt(`${LIST_PATH}/add`);

			expect(
				await screen.findByText('BusinessEventsAdd page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-ID] :id', () => {
		it('nests the details index and the edit and activity history children', () => {
			expect(childPaths(detailRoute)).toEqual([
				'index',
				'edit',
				'activity-history',
				'*',
			]);
		});

		it('renders BusinessEventsDetails at its index', async () => {
			renderAt(`${LIST_PATH}/42`);

			expect(
				await screen.findByText('BusinessEventsDetails page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-EDIT] edit', () => {
		it('renders the BusinessEventsEdit page', async () => {
			renderAt(`${LIST_PATH}/42/edit`);

			expect(
				await screen.findByText('BusinessEventsEdit page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY] activity-history', () => {
		it('renders the BusinessEventsActivityHistory page', async () => {
			renderAt(`${LIST_PATH}/42/activity-history`);

			expect(
				await screen.findByText('BusinessEventsActivityHistory page')
			).toBeInTheDocument();
		});
	});
});
