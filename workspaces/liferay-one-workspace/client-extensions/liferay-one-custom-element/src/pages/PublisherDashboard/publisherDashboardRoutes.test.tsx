/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {ReactNode, Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import i18n from '~/i18n';
import {buildNavItems, toRouteObjects} from '~/utils/routeUtils';

import {PublishMode} from './pages/NewAppFlow/constants';
import {
	PUBLISH_FLOW_PATHS,
	publisherDashboardRoutes,
} from './publisherDashboardRoutes';

import type {AppRoute} from '~/utils/routeUtils';

vi.mock('~/context/NewAppContextProvider', async () => {
	const {Fragment, createElement} = await import('react');

	return {
		default: ({children}: {children: ReactNode}) =>
			createElement(
				Fragment,
				null,
				createElement('span', null, 'NewAppContextProvider'),
				children
			),
	};
});
vi.mock('~/context/SolutionContextProvider', async () => {
	const {Fragment, createElement} = await import('react');

	return {
		default: ({children}: {children: ReactNode}) =>
			createElement(
				Fragment,
				null,
				createElement('span', null, 'SolutionContextProvider'),
				children
			),
	};
});
vi.mock('~/hooks/usePublisherCatalog', () => ({
	default: () => ({data: null}),
}));
vi.mock('./AppSummary/AppSummary', () => ({default: () => 'AppSummary page'}));
vi.mock('./PublishedApps/PublishedApps', () => ({
	default: () => 'PublishedApps page',
}));
vi.mock('./PublishedSolutions/PublishedSolutions', () => ({
	default: () => 'PublishedSolutions page',
}));
vi.mock('./PublisherProfile/PublisherProfile', () => ({
	default: () => 'PublisherProfile page',
}));
vi.mock('./PublisherProfileEdit/PublisherProfileEdit', () => ({
	default: () => 'PublisherProfileEdit page',
}));
vi.mock('./pages/NewAppFlow/PublishAppOutlet', async () => {
	const {Fragment, createElement} = await import('react');
	const {Outlet} = await import('react-router-dom');

	return {
		default: ({mode = 'default'}: {mode?: string}) =>
			createElement(
				Fragment,
				null,
				createElement('span', null, `PublishAppOutlet ${mode}`),
				createElement(Outlet)
			),
	};
});
vi.mock('./pages/NewAppFlow/pages/Build', () => ({
	default: () => 'App Build page',
}));
vi.mock('./pages/NewAppFlow/pages/Create', () => ({
	default: () => 'App Create page',
}));
vi.mock('./pages/NewAppFlow/pages/Licensing', () => ({
	default: () => 'App Licensing page',
}));
vi.mock('./pages/NewAppFlow/pages/Licensing/LicensePrices', () => ({
	default: () => 'App LicensePrices page',
}));
vi.mock('./pages/NewAppFlow/pages/Pricing', () => ({
	default: () => 'App Pricing page',
}));
vi.mock('./pages/NewAppFlow/pages/Profile', () => ({
	default: () => 'App Profile page',
}));
vi.mock('./pages/NewAppFlow/pages/Storefront', () => ({
	default: () => 'App Storefront page',
}));
vi.mock('./pages/NewAppFlow/pages/Submit', () => ({
	default: () => 'App SubmitApp page',
}));
vi.mock('./pages/NewAppFlow/pages/Support', () => ({
	default: () => 'App Support page',
}));
vi.mock('./pages/NewAppFlow/pages/Version', () => ({
	default: () => 'App Version page',
}));
vi.mock('./pages/NewSolutionFlow/PublishSolutionOutlet', async () => {
	const {Fragment, createElement} = await import('react');
	const {Outlet} = await import('react-router-dom');

	return {
		default: () =>
			createElement(
				Fragment,
				null,
				createElement('span', null, 'PublishSolutionOutlet'),
				createElement(Outlet)
			),
	};
});
vi.mock('./pages/NewSolutionFlow/pages/CompanyProfile', () => ({
	default: () => 'Solution CompanyProfile page',
}));
vi.mock('./pages/NewSolutionFlow/pages/ContactUs', () => ({
	default: () => 'Solution ContactUs page',
}));
vi.mock('./pages/NewSolutionFlow/pages/Create', () => ({
	default: () => 'Solution Create page',
}));
vi.mock('./pages/NewSolutionFlow/pages/Details', () => ({
	default: () => 'Solution Details page',
}));
vi.mock('./pages/NewSolutionFlow/pages/Header', () => ({
	default: () => 'Solution Header page',
}));
vi.mock('./pages/NewSolutionFlow/pages/Profile', () => ({
	default: () => 'Solution Profile page',
}));
vi.mock('./pages/NewSolutionFlow/pages/Submit', () => ({
	default: () => 'Solution SubmitSolution page',
}));

function PublisherDashboardRoutesUnderTest() {
	return useRoutes(toRouteObjects(publisherDashboardRoutes));
}

function childPaths(route: AppRoute | undefined) {
	return route?.children?.map((child) =>
		child.index ? 'index' : child.path
	);
}

function findChild(route: AppRoute | undefined, path: string) {
	return route?.children?.find((child) => child.path === path);
}

function findRoute(path: string) {
	return publisherDashboardRoutes.find((route) => route.path === path);
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<PublisherDashboardRoutesUnderTest />
			</Suspense>
		</MemoryRouter>
	);
}

const appFlowSteps = [
	'profile',
	'build',
	'storefront',
	'version',
	'pricing',
	'licensing',
	'licensing-prices',
	'support',
	'submit',
];

const solutionFlowSteps = [
	'profile',
	'header',
	'details',
	'company',
	'contact',
	'submit',
];

describe('publisherDashboardRoutes', () => {
	it('declares the top level branches in order', () => {
		expect(childPaths({children: publisherDashboardRoutes})).toEqual([
			'index',
			'published-apps',
			'published-solutions',
			'publisher-profile',
			'newapp',
			'newsolution',
			'newversion',
			'*',
		]);
	});

	it('marks newapp, newsolution, and newversion as the publish flows', () => {
		expect(PUBLISH_FLOW_PATHS).toEqual([
			'newapp',
			'newsolution',
			'newversion',
		]);
	});

	it('declares nav entries for published apps, published solutions, and the publisher profile', () => {
		expect(buildNavItems(publisherDashboardRoutes)).toEqual([
			{
				children: undefined,
				end: false,
				icon: 'catalog',
				label: i18n.translate('published-apps'),
				path: '/published-apps',
			},
			{
				children: undefined,
				end: undefined,
				icon: 'list',
				label: i18n.translate('published-solutions'),
				path: '/published-solutions',
			},
			{
				children: undefined,
				end: false,
				icon: 'user',
				label: i18n.translate('publisher-profile'),
				path: '/publisher-profile',
			},
		]);
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] published-apps', () => {
		it('is the default index redirect', async () => {
			renderAt('/');

			expect(
				await screen.findByText('PublishedApps page')
			).toBeInTheDocument();
		});

		it('is the redirect for an unknown path', async () => {
			renderAt('/unknown');

			expect(
				await screen.findByText('PublishedApps page')
			).toBeInTheDocument();
		});

		it('renders the PublishedApps page', async () => {
			renderAt('/published-apps');

			expect(
				await screen.findByText('PublishedApps page')
			).toBeInTheDocument();
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID] renders the AppSummary index for :productId inside the new app context', async () => {
			expect(
				childPaths(findChild(findRoute('published-apps'), ':productId'))
			).toEqual(['index']);

			renderAt('/published-apps/42');

			expect(
				await screen.findByText('AppSummary page')
			).toBeInTheDocument();
			expect(
				screen.getByText('NewAppContextProvider')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS] published-solutions', () => {
		it('renders the PublishedSolutions page', async () => {
			renderAt('/published-solutions');

			expect(
				await screen.findByText('PublishedSolutions page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE] publisher-profile', () => {
		it('nests the profile index and the edit child', () => {
			expect(childPaths(findRoute('publisher-profile'))).toEqual([
				'index',
				'edit',
				'*',
			]);
		});

		it('renders PublisherProfile at its index', async () => {
			renderAt('/publisher-profile');

			expect(
				await screen.findByText('PublisherProfile page')
			).toBeInTheDocument();
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-EDIT] renders PublisherProfileEdit for edit', async () => {
			renderAt('/publisher-profile/edit');

			expect(
				await screen.findByText('PublisherProfileEdit page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-NEWAPP] newapp', () => {
		const productRoute = findChild(findRoute('newapp'), ':productId?');
		const publisherRoute = findChild(productRoute, 'publisher');

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHER] nests the optional :productId? branch and the publisher outlet', () => {
			expect(childPaths(findRoute('newapp'))).toEqual([':productId?']);
			expect(childPaths(productRoute)).toEqual(['publisher']);
			expect(childPaths(publisherRoute)).toEqual([
				'index',
				...appFlowSteps,
			]);
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-PUBLISHER] starts on Create without a product under the new app context', async () => {
			renderAt('/newapp/publisher');

			expect(
				await screen.findByText('App Create page')
			).toBeInTheDocument();
			expect(
				screen.getByText('NewAppContextProvider')
			).toBeInTheDocument();
			expect(
				screen.getByText('PublishAppOutlet default')
			).toBeInTheDocument();
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL] resumes on Create with a product', async () => {
			renderAt('/newapp/42/publisher');

			expect(
				await screen.findByText('App Create page')
			).toBeInTheDocument();
		});

		it.each([
			[
				'ROUTE-PUBLISHER-DASHBOARD-PROFILE',
				'profile',
				'App Profile page',
			],
			['ROUTE-PUBLISHER-DASHBOARD-BUILD', 'build', 'App Build page'],
			[
				'ROUTE-PUBLISHER-DASHBOARD-STOREFRONT',
				'storefront',
				'App Storefront page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-VERSION',
				'version',
				'App Version page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-PRICING',
				'pricing',
				'App Pricing page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-LICENSING',
				'licensing',
				'App Licensing page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-LICENSING-PRICES',
				'licensing-prices',
				'App LicensePrices page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-SUPPORT',
				'support',
				'App Support page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-SUBMIT',
				'submit',
				'App SubmitApp page',
			],
		])('[%s] renders the %s step', async (_id, step, page) => {
			renderAt(`/newapp/42/publisher/${step}`);

			expect(await screen.findByText(page)).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-NEWSOLUTION] newsolution', () => {
		const productRoute = findChild(findRoute('newsolution'), ':productId?');
		const publisherRoute = findChild(productRoute, 'publisher');

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHER] nests the optional :productId? branch and the publisher outlet', () => {
			expect(childPaths(findRoute('newsolution'))).toEqual([
				':productId?',
			]);
			expect(childPaths(productRoute)).toEqual(['publisher']);
			expect(childPaths(publisherRoute)).toEqual([
				'index',
				...solutionFlowSteps,
			]);
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-PUBLISHER] starts on Create without a product under the solution context', async () => {
			renderAt('/newsolution/publisher');

			expect(
				await screen.findByText('Solution Create page')
			).toBeInTheDocument();
			expect(
				screen.getByText('SolutionContextProvider')
			).toBeInTheDocument();
			expect(
				screen.getByText('PublishSolutionOutlet')
			).toBeInTheDocument();
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL] resumes on Create with a product', async () => {
			renderAt('/newsolution/42/publisher');

			expect(
				await screen.findByText('Solution Create page')
			).toBeInTheDocument();
		});

		it.each([
			[
				'ROUTE-PUBLISHER-DASHBOARD-PROFILE',
				'profile',
				'Solution Profile page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-HEADER',
				'header',
				'Solution Header page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-DETAILS',
				'details',
				'Solution Details page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-COMPANY',
				'company',
				'Solution CompanyProfile page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-CONTACT',
				'contact',
				'Solution ContactUs page',
			],
			[
				'ROUTE-PUBLISHER-DASHBOARD-SUBMIT',
				'submit',
				'Solution SubmitSolution page',
			],
		])('[%s] renders the %s step', async (_id, step, page) => {
			renderAt(`/newsolution/42/publisher/${step}`);

			expect(await screen.findByText(page)).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PUBLISHER-DASHBOARD-NEWVERSION] newversion', () => {
		const productRoute = findChild(findRoute('newversion'), ':productId');
		const publisherRoute = findChild(productRoute, 'publisher');

		it('[ROUTE-PUBLISHER-DASHBOARD-PRODUCTID] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHER] nests the required :productId branch and the publisher outlet', () => {
			expect(childPaths(findRoute('newversion'))).toEqual([':productId']);
			expect(childPaths(productRoute)).toEqual(['publisher']);
			expect(childPaths(publisherRoute)).toEqual([
				'index',
				...appFlowSteps,
			]);
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-BUILD] redirects its index to the build step in NEW_VERSION mode', async () => {
			renderAt('/newversion/42/publisher');

			expect(
				await screen.findByText('App Build page')
			).toBeInTheDocument();
			expect(
				screen.getByText(`PublishAppOutlet ${PublishMode.NEW_VERSION}`)
			).toBeInTheDocument();
			expect(
				screen.getByText('NewAppContextProvider')
			).toBeInTheDocument();
		});

		it('[ROUTE-PUBLISHER-DASHBOARD-VERSION] renders the version step in NEW_VERSION mode', async () => {
			renderAt('/newversion/42/publisher/version');

			expect(
				await screen.findByText('App Version page')
			).toBeInTheDocument();
			expect(
				screen.getByText(`PublishAppOutlet ${PublishMode.NEW_VERSION}`)
			).toBeInTheDocument();
		});
	});
});
