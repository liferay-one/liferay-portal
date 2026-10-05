/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import i18n from '~/i18n';
import {
	buildNavItems,
	filterAccessibleRoutes,
	toRouteObjects,
} from '~/utils/routeUtils';

import {adminRoutes} from './adminRoutes';

import type {UserAccountModel} from '~/services/models/UserAccountModel';
import type {AppRoute} from '~/utils/routeUtils';

vi.mock('./Apps/AppDetail/AppDetail', () => ({
	default: () => 'AppDetail page',
}));
vi.mock('./Apps/Apps', () => ({default: () => 'Apps page'}));
vi.mock('./Environments/Environments', () => ({
	default: () => 'Environments page',
}));
vi.mock('./LicenseKeyUploads/LicenseKeyUploads', () => ({
	default: () => 'LicenseKeyUploads page',
}));
vi.mock('./ManageSsaSaasUsers/ManageSsaSaasUsers', () => ({
	default: () => 'ManageSsaSaasUsers page',
}));
vi.mock('./MPFinanceOrders/MPFinanceOrders', () => ({
	default: () => 'MPFinanceOrders page',
}));
vi.mock('./MPFinanceOrders/OrderDetails', () => ({
	default: () => 'OrderDetails page',
}));
vi.mock('./MPSummary/MPSummary', () => ({default: () => 'MPSummary page'}));
vi.mock('./MySsaSaasDemo/MySsaSaasDemo', () => ({
	default: () => 'MySsaSaasDemo page',
}));
vi.mock('./Orders/Orders', () => ({default: () => 'Orders page'}));
vi.mock('./Payments/PaymentDetails', () => ({
	default: () => 'PaymentDetails page',
}));
vi.mock('./Payments/Payments', () => ({default: () => 'Payments page'}));
vi.mock('./PubSub/PubSub', () => ({default: () => 'PubSub page'}));
vi.mock('./PublisherRequests/PublisherRequests', () => ({
	default: () => 'PublisherRequests page',
}));
vi.mock('./Publishers/Publishers', () => ({default: () => 'Publishers page'}));
vi.mock('./SSADashboard/pages/TrialDetails/TrialDetails', () => ({
	default: () => 'TrialDetails page',
}));
vi.mock('./Solutions/SolutionDetail/SolutionDetail', () => ({
	default: () => 'SolutionDetail page',
}));
vi.mock('./Solutions/Solutions', () => ({default: () => 'Solutions page'}));
vi.mock('./Trials/Trials', () => ({default: () => 'Trials page'}));

const adminUser = {isAdmin: true} as UserAccountModel;
const financeUser = {isFinanceAdministrator: true} as UserAccountModel;
const ssaAdminUser = {isSSAAdmin: true} as UserAccountModel;
const ssaUser = {isSSAUser: true} as UserAccountModel;
const plainUser = {} as UserAccountModel;

function AdminRoutesUnderTest() {
	return useRoutes(toRouteObjects(adminRoutes));
}

function findRoute(path: string) {
	const route = adminRoutes.find((candidate) => candidate.path === path);

	if (!route) {
		throw new Error(`Missing route ${path}`);
	}

	return route as Extract<AppRoute, {path: string}>;
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<AdminRoutesUnderTest />
			</Suspense>
		</MemoryRouter>
	);
}

function usersAllowed(path: string) {
	const {canAccess} = findRoute(path);

	return Object.entries({
		adminUser,
		financeUser,
		plainUser,
		ssaAdminUser,
		ssaUser,
	})
		.filter(([, user]) => canAccess?.(user))
		.map(([name]) => name);
}

const navRoutes = [
	{
		icon: 'password-policies',
		id: 'ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS',
		label: 'activation-key-uploads',
		page: 'LicenseKeyUploads page',
		path: 'activation-key-uploads',
		users: ['adminUser'],
	},
	{
		icon: 'users',
		id: 'ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS',
		label: 'manage-ssa-saas-users',
		page: 'ManageSsaSaasUsers page',
		path: 'manage-ssa-saas-users',
		users: ['ssaAdminUser'],
	},
	{
		icon: 'grid',
		id: 'ROUTE-ADMIN-MP-APPS',
		label: 'marketplace-apps',
		page: 'Apps page',
		path: 'mp-apps',
		users: ['adminUser'],
	},
	{
		icon: 'order-form',
		id: 'ROUTE-ADMIN-MP-FINANCE-ORDERS',
		label: 'marketplace-finance-orders',
		page: 'MPFinanceOrders page',
		path: 'mp-finance-orders',
		users: ['adminUser', 'financeUser'],
	},
	{
		icon: 'order-form',
		id: 'ROUTE-ADMIN-MP-ORDERS',
		label: 'marketplace-orders',
		page: 'Orders page',
		path: 'mp-orders',
		users: ['adminUser'],
	},
	{
		icon: 'order-form',
		id: 'ROUTE-ADMIN-MP-PAYMENTS',
		label: 'marketplace-payments',
		page: 'Payments page',
		path: 'mp-payments',
		users: ['adminUser', 'financeUser'],
	},
	{
		icon: 'union',
		id: 'ROUTE-ADMIN-MP-SOLUTIONS',
		label: 'marketplace-solutions',
		page: 'Solutions page',
		path: 'mp-solutions',
		users: ['adminUser'],
	},
	{
		icon: 'polls',
		id: 'ROUTE-ADMIN-MP-SUMMARY',
		label: 'marketplace-summary',
		page: 'MPSummary page',
		path: 'mp-summary',
		users: ['adminUser'],
	},
	{
		icon: 'union',
		id: 'ROUTE-ADMIN-MY-SSA-SAAS-DEMO',
		label: 'my-ssa-saas-demo',
		page: 'MySsaSaasDemo page',
		path: 'my-ssa-saas-demo',
		users: ['ssaAdminUser', 'ssaUser'],
	},
	{
		icon: 'message-boards',
		id: 'ROUTE-ADMIN-PUB-SUB',
		label: 'pub-sub',
		page: 'PubSub page',
		path: 'pub-sub',
		users: ['adminUser'],
	},
	{
		icon: 'order-form',
		id: 'ROUTE-ADMIN-PUBLISHER-REQUESTS',
		label: 'publisher-requests',
		page: 'PublisherRequests page',
		path: 'publisher-requests',
		users: ['adminUser'],
	},
	{
		icon: 'squares-clock',
		id: 'ROUTE-ADMIN-PUBLISHERS',
		label: 'publishers',
		page: 'Publishers page',
		path: 'publishers',
		users: ['adminUser'],
	},
	{
		icon: 'squares-clock',
		id: 'ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS',
		label: 'ssa-saas-environments',
		page: 'Environments page',
		path: 'ssa-saas-environments',
		users: ['ssaAdminUser'],
	},
	{
		icon: 'grid',
		id: 'ROUTE-ADMIN-TRIALS',
		label: '7-days-trials',
		page: 'Trials page',
		path: 'trials',
		users: ['adminUser'],
	},
] as const;

const detailRoutes = [
	{
		id: 'ROUTE-ADMIN-DETAILS-ORDERID',
		page: 'TrialDetails page',
		path: 'details/:orderId',
		url: '/details/42',
		users: ['ssaAdminUser', 'ssaUser'],
	},
	{
		id: 'ROUTE-ADMIN-MP-APPS-PRODUCTID',
		page: 'AppDetail page',
		path: 'mp-apps/:productId',
		url: '/mp-apps/42',
		users: ['adminUser'],
	},
	{
		id: 'ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID',
		page: 'OrderDetails page',
		path: 'mp-finance-orders/:orderId',
		url: '/mp-finance-orders/42',
		users: ['adminUser', 'financeUser'],
	},
	{
		id: 'ROUTE-ADMIN-MP-PAYMENTS-ENTRYID',
		page: 'PaymentDetails page',
		path: 'mp-payments/:entryId',
		url: '/mp-payments/42',
		users: ['adminUser', 'financeUser'],
	},
	{
		id: 'ROUTE-ADMIN-MP-SOLUTIONS-PRODUCTID',
		page: 'SolutionDetail page',
		path: 'mp-solutions/:productId',
		url: '/mp-solutions/42',
		users: ['adminUser'],
	},
] as const;

describe('adminRoutes', () => {
	describe.each(navRoutes)(
		'[$id] $path',
		({icon, label, page, path, users}) => {
			it('renders its page', async () => {
				renderAt(`/${path}`);

				expect(await screen.findByText(page)).toBeInTheDocument();
			});

			it('declares its nav entry', () => {
				expect(findRoute(path).nav).toEqual({
					icon,
					label: i18n.translate(label),
				});
			});

			it('is reachable only by the expected users', () => {
				expect(usersAllowed(path)).toEqual(users);
			});
		}
	);

	describe.each(detailRoutes)('[$id] $path', ({page, path, url, users}) => {
		it('renders its detail page for a param URL', async () => {
			renderAt(url);

			expect(await screen.findByText(page)).toBeInTheDocument();
		});

		it('has no nav entry', () => {
			expect(findRoute(path).nav).toBeUndefined();
		});

		it('is reachable only by the expected users', () => {
			expect(usersAllowed(path)).toEqual(users);
		});
	});

	it('[ROUTE-ADMIN-MP-SUMMARY] makes mp-summary the default index redirect for an admin', () => {
		const navItems = buildNavItems(
			filterAccessibleRoutes(adminRoutes, adminUser)
		);

		expect(navItems[0].path).toBe('/mp-summary');
	});

	it('leaves the detail routes out of the nav items', () => {
		const navItems = buildNavItems(
			filterAccessibleRoutes(adminRoutes, adminUser)
		);

		expect(navItems.map(({path}) => path)).not.toContain(
			'/mp-apps/:productId'
		);
		expect(navItems).toHaveLength(
			navRoutes.filter(({users}) =>
				(users as readonly string[]).includes('adminUser')
			).length
		);
	});

	it('gives a user without roles no nav items', () => {
		expect(
			buildNavItems(filterAccessibleRoutes(adminRoutes, plainUser))
		).toEqual([]);
	});
});
