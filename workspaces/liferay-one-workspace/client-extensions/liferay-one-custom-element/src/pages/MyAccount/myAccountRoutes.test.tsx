/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import i18n from '~/i18n';
import {buildNavItems, toRouteObjects} from '~/utils/routeUtils';

import {accountRoutes, projectDetailRoutes} from './myAccountRoutes';

import type {AppRoute} from '~/utils/routeUtils';

vi.mock('./AccountDetails/AccountDetails', () => ({
	default: () => 'AccountDetails page',
}));
vi.mock('./AccountMembers/AccountMembers', () => ({
	default: () => 'AccountMembers page',
}));
vi.mock('./Orders/OrderDetails/OrderDetails', () => ({
	default: () => 'OrderDetails page',
}));
vi.mock('./Orders/OrderHistory/OrderHistory', () => ({
	default: () => 'OrderHistory page',
}));
vi.mock('./Orders/Orders', () => ({default: () => 'Orders page'}));
vi.mock('./ProjectMembers/ProjectMembers', () => ({
	default: () => 'ProjectMembers page',
}));
vi.mock('./Projects/Applications/Applications', () => ({
	default: () => 'Applications page',
}));
vi.mock('./Projects/CloudAppInstall/CloudAppInstall', () => ({
	default: () => 'CloudAppInstall page',
}));
vi.mock(
	'./Projects/LicenseKeys/GenerateActivationKey/GenerateActivationKey',
	() => ({default: () => 'GenerateActivationKey page'})
);
vi.mock('./Projects/LicenseKeys/LicenseKeyDetails/LicenseKeyDetails', () => ({
	default: () => 'LicenseKeyDetails page',
}));
vi.mock('./Projects/LicenseKeys/LicenseKeys', () => ({
	default: () => 'LicenseKeys page',
}));
vi.mock('./Projects/Products/Products', () => ({
	default: () => 'Products page',
}));
vi.mock('./Projects/ProjectItemDetails/ProjectItemDetails', () => ({
	default: ({itemType}: {itemType: string}) =>
		`ProjectItemDetails ${itemType}`,
}));
vi.mock(
	'./Projects/components/ProjectSectionRedirect/ProjectSectionRedirect',
	() => ({default: () => 'ProjectSectionRedirect'})
);
vi.mock('./components/AccountTabsLayout/AccountTabsLayout', async () => {
	const {Fragment, createElement} = await import('react');
	const {Outlet} = await import('react-router');

	return {
		default: () =>
			createElement(
				Fragment,
				null,
				createElement('span', null, 'AccountTabsLayout'),
				createElement(Outlet)
			),
	};
});

function RoutesUnderTest({routes}: {routes: AppRoute[]}) {
	return useRoutes(toRouteObjects(routes));
}

function childPaths(route: AppRoute | undefined) {
	return route?.children?.map((child) =>
		child.index ? 'index' : child.path
	);
}

function findRoute(routes: AppRoute[], path: string) {
	return routes.find((route) => route.path === path);
}

function renderAt(pathname: string, routes: AppRoute[]) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<RoutesUnderTest routes={routes} />
			</Suspense>
		</MemoryRouter>
	);
}

const accountTabsRoute = accountRoutes.find(
	(route) => !route.path && !route.index
);

describe('myAccountRoutes', () => {
	describe('projectDetailRoutes', () => {
		it('renders ProjectSectionRedirect at the project index', async () => {
			renderAt('/', projectDetailRoutes);

			expect(
				await screen.findByText('ProjectSectionRedirect')
			).toBeInTheDocument();
		});

		it('declares a nav entry for products, applications, and activation in that order', () => {
			expect(buildNavItems(projectDetailRoutes)).toEqual([
				{
					children: undefined,
					end: false,
					icon: 'products',
					label: i18n.translate('products'),
					path: '/products',
				},
				{
					children: undefined,
					end: false,
					icon: 'applications',
					label: i18n.translate('applications'),
					path: '/applications',
				},
				{
					children: undefined,
					end: false,
					icon: 'key-horizontal',
					label: i18n.translate('activation'),
					path: '/activation',
				},
			]);
		});

		describe('[ROUTE-MY-ACCOUNT-PRODUCTS] products', () => {
			it('nests the list index and the :productERC detail', () => {
				expect(
					childPaths(findRoute(projectDetailRoutes, 'products'))
				).toEqual(['index', ':productERC', '*']);
			});

			it('renders the Products list at its index', async () => {
				renderAt('/products', projectDetailRoutes);

				expect(
					await screen.findByText('Products page')
				).toBeInTheDocument();
			});

			it('is the default redirect for an unknown project section', async () => {
				renderAt('/unknown-section', projectDetailRoutes);

				expect(
					await screen.findByText('Products page')
				).toBeInTheDocument();
			});

			it('is the default redirect for an unknown nested project path', async () => {
				renderAt('/unknown-section/unknown', projectDetailRoutes);

				expect(
					await screen.findByText('Products page')
				).toBeInTheDocument();
			});

			it('redirects an unknown path under products to the Products list', async () => {
				renderAt('/products/PRDCT-001/unknown', projectDetailRoutes);

				expect(
					await screen.findByText('Products page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-PRODUCTERC] renders ProjectItemDetails with kind product for :productERC', async () => {
				renderAt('/products/PRDCT-001', projectDetailRoutes);

				expect(
					await screen.findByText('ProjectItemDetails product')
				).toBeInTheDocument();
			});
		});

		describe('[ROUTE-MY-ACCOUNT-APPLICATIONS] applications', () => {
			it('nests the list index, the :applicationERC detail, and the install page', () => {
				expect(
					childPaths(findRoute(projectDetailRoutes, 'applications'))
				).toEqual([
					'index',
					':applicationERC',
					':applicationERC/install/:orderId',
					'*',
				]);
			});

			it('renders the Applications list at its index', async () => {
				renderAt('/applications', projectDetailRoutes);

				expect(
					await screen.findByText('Applications page')
				).toBeInTheDocument();
			});

			it('redirects an unknown path under applications to the Applications list', async () => {
				renderAt(
					'/applications/PRDCT-APP/unknown',
					projectDetailRoutes
				);

				expect(
					await screen.findByText('Applications page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-APPLICATIONERC] renders ProjectItemDetails with kind application for :applicationERC', async () => {
				renderAt('/applications/PRDCT-APP', projectDetailRoutes);

				expect(
					await screen.findByText('ProjectItemDetails application')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-APPLICATIONERC-INSTALL-ORDERID] renders CloudAppInstall for :applicationERC/install/:orderId', async () => {
				renderAt(
					'/applications/PRDCT-APP/install/42',
					projectDetailRoutes
				);

				expect(
					await screen.findByText('CloudAppInstall page')
				).toBeInTheDocument();
			});
		});

		describe('[ROUTE-MY-ACCOUNT-ACTIVATION] activation', () => {
			it('nests the list index, generate, and the :licenseKeyERC detail', () => {
				expect(
					childPaths(findRoute(projectDetailRoutes, 'activation'))
				).toEqual(['index', 'generate', ':licenseKeyERC', '*']);
			});

			it('renders the LicenseKeys list at its index', async () => {
				renderAt('/activation', projectDetailRoutes);

				expect(
					await screen.findByText('LicenseKeys page')
				).toBeInTheDocument();
			});

			it('redirects an unknown path under activation to the LicenseKeys list', async () => {
				renderAt('/activation/KEY-001/unknown', projectDetailRoutes);

				expect(
					await screen.findByText('LicenseKeys page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-GENERATE] renders GenerateActivationKey for generate', async () => {
				renderAt('/activation/generate', projectDetailRoutes);

				expect(
					await screen.findByText('GenerateActivationKey page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-LICENSEKEYERC] renders LicenseKeyDetails for :licenseKeyERC', async () => {
				renderAt('/activation/KEY-001', projectDetailRoutes);

				expect(
					await screen.findByText('LicenseKeyDetails page')
				).toBeInTheDocument();
			});
		});
	});

	describe('accountRoutes', () => {
		describe('[ROUTE-MY-ACCOUNT-ORDERS] orders', () => {
			it('nests the list index, history, and the :orderId detail', () => {
				expect(childPaths(findRoute(accountRoutes, 'orders'))).toEqual([
					'index',
					'history',
					':orderId',
					'*',
				]);
			});

			it('renders the Orders list at its index', async () => {
				renderAt('/orders', accountRoutes);

				expect(
					await screen.findByText('Orders page')
				).toBeInTheDocument();
			});

			it('redirects an unknown path under orders to the Orders list', async () => {
				renderAt('/orders/42/unknown', accountRoutes);

				expect(
					await screen.findByText('Orders page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-HISTORY] renders OrderHistory for history', async () => {
				renderAt('/orders/history', accountRoutes);

				expect(
					await screen.findByText('OrderHistory page')
				).toBeInTheDocument();
			});

			it('[ROUTE-MY-ACCOUNT-ORDERID] renders OrderDetails for :orderId', async () => {
				renderAt('/orders/42', accountRoutes);

				expect(
					await screen.findByText('OrderDetails page')
				).toBeInTheDocument();
			});

			it('does not render the AccountTabsLayout', async () => {
				renderAt('/orders', accountRoutes);

				await screen.findByText('Orders page');

				expect(
					screen.queryByText('AccountTabsLayout')
				).not.toBeInTheDocument();
			});
		});

		describe('AccountTabsLayout', () => {
			it('groups account-details, account-members, and project-members', () => {
				expect(childPaths(accountTabsRoute)).toEqual([
					'account-details',
					'account-members',
					'project-members',
				]);
			});

			it.each([
				[
					'ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS',
					'/account-details',
					'AccountDetails page',
				],
				[
					'ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS',
					'/account-members',
					'AccountMembers page',
				],
				[
					'ROUTE-MY-ACCOUNT-PROJECT-MEMBERS',
					'/project-members',
					'ProjectMembers page',
				],
			])(
				'[%s] renders %s under the layout',
				async (_id, pathname, page) => {
					renderAt(pathname, accountRoutes);

					expect(await screen.findByText(page)).toBeInTheDocument();
					expect(
						screen.getByText('AccountTabsLayout')
					).toBeInTheDocument();
				}
			);
		});
	});
});
