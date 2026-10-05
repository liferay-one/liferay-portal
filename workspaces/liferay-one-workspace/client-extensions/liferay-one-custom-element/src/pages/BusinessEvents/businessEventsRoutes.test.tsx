/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router-dom';
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
vi.mock('./BusinessEventsRedirect', async () => {
	const {Fragment, createElement} = await import('react');
	const {Outlet} = await import('react-router-dom');

	return {
		default: () =>
			createElement(
				Fragment,
				null,
				createElement('span', null, 'BusinessEventsRedirect'),
				createElement(Outlet)
			),
	};
});

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

const listRoute = businessEventsRoutes.find(
	(route) => route.path === ':projectERC/business-events'
);

const detailRoute = findChild(listRoute, ':id');

describe('businessEventsRoutes', () => {
	describe('[ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] :projectERC/business-events', () => {
		it('nests the list index and the add and :id children', () => {
			expect(childPaths(listRoute)).toEqual(['index', 'add', ':id', '*']);
		});

		it('renders the list under the BusinessEventsRedirect element', async () => {
			renderAt('/PRJCT-ALPHA/business-events');

			expect(
				await screen.findByText('BusinessEvents page')
			).toBeInTheDocument();
			expect(
				screen.getByText('BusinessEventsRedirect')
			).toBeInTheDocument();
		});

		it('renders BusinessEventsRedirect alone at the root index', async () => {
			renderAt('/');

			expect(
				await screen.findByText('BusinessEventsRedirect')
			).toBeInTheDocument();
			expect(
				screen.queryByText('BusinessEvents page')
			).not.toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-ADD] add', () => {
		it('renders the BusinessEventsAdd page', async () => {
			renderAt('/PRJCT-ALPHA/business-events/add');

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
			renderAt('/PRJCT-ALPHA/business-events/42');

			expect(
				await screen.findByText('BusinessEventsDetails page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-EDIT] edit', () => {
		it('renders the BusinessEventsEdit page', async () => {
			renderAt('/PRJCT-ALPHA/business-events/42/edit');

			expect(
				await screen.findByText('BusinessEventsEdit page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY] activity-history', () => {
		it('renders the BusinessEventsActivityHistory page', async () => {
			renderAt('/PRJCT-ALPHA/business-events/42/activity-history');

			expect(
				await screen.findByText('BusinessEventsActivityHistory page')
			).toBeInTheDocument();
		});
	});
});
