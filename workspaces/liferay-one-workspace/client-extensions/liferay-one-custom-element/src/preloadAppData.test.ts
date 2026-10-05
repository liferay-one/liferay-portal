/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

const {liferay, preloadDataQuery} = vi.hoisted(() => ({
	liferay: {
		CommerceContext: {} as {
			account?: {accountId?: number};
			commerceChannelId?: number;
		},
		ThemeDisplay: {isSignedIn: (): boolean => true},
	},
	preloadDataQuery: vi.fn(),
}));

vi.mock('~/hooks/useAccounts', () => ({
	accountsQuery: (accountId: number) => ({key: `accounts:${accountId}`}),
	currentAccountQuery: (accountId: number) => ({
		key: `currentAccount:${accountId}`,
	}),
}));

vi.mock('~/hooks/useDataQuery', () => ({preloadDataQuery}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	accountLevelContractsQuery: (accountId: number) => ({
		key: `accountLevelContracts:${accountId}`,
	}),
	channelProductsQuery: (channelId: number) => ({
		key: `channelProducts:${channelId}`,
	}),
	projectContractsQuery: (projectERC: string) => ({
		key: `projectContracts:${projectERC}`,
	}),
	projectEntitlementsQuery: (projectERC: string) => ({
		key: `projectEntitlements:${projectERC}`,
	}),
}));

vi.mock('~/hooks/useProjectOrders', () => ({
	projectOrdersQuery: (accountId: number) => ({
		key: `projectOrders:${accountId}`,
	}),
}));

vi.mock('~/pages/MyAccount/Projects/hooks/useUserProjects', () => ({
	userProjectsQuery: (accountId: number) => ({
		key: `userProjects:${accountId}`,
	}),
}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	MY_USER_ACCOUNT_URL: '/my-user-account',
	default: {getMyUserAccount: vi.fn()},
}));

vi.mock('~/services/liferay/liferay', () => ({Liferay: liferay}));

async function loadPreloadAppData() {
	vi.resetModules();

	const module = await import('./preloadAppData');

	return module.default;
}

function getPreloadedKeys() {
	return preloadDataQuery.mock.calls.map(([query]) => query.key);
}

describe('[MOD-PRELOADAPPDATA] preloadAppData', () => {
	beforeEach(() => {
		liferay.CommerceContext = {
			account: {accountId: 101},
			commerceChannelId: 7,
		};
		liferay.ThemeDisplay.isSignedIn = () => true;
		preloadDataQuery.mockClear();
		window.location.hash = '';
	});

	it('does nothing when the visitor is signed out', async () => {
		liferay.ThemeDisplay.isSignedIn = () => false;

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(preloadDataQuery).not.toHaveBeenCalled();
	});

	it('does nothing without an account ID', async () => {
		liferay.CommerceContext = {};

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(preloadDataQuery).not.toHaveBeenCalled();
	});

	it('preloads only the user account and account queries for other routes', async () => {
		const preloadAppData = await loadPreloadAppData();

		preloadAppData('marketplace');

		expect(getPreloadedKeys()).toEqual([
			'/my-user-account',
			'currentAccount:101',
			'accounts:101',
		]);
	});

	it('does nothing when the route was already preloaded', async () => {
		const preloadAppData = await loadPreloadAppData();

		preloadAppData('marketplace');

		preloadDataQuery.mockClear();

		preloadAppData('marketplace');

		expect(preloadDataQuery).not.toHaveBeenCalled();
	});

	it('adds the project, contract, entitlement, product, and order queries for my account', async () => {
		window.location.hash = '#/ACCNT-001/project/PRJCT-001/products';

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toEqual([
			'/my-user-account',
			'currentAccount:101',
			'accounts:101',
			'userProjects:101',
			'accountLevelContracts:101',
			'projectContracts:PRJCT-001',
			'projectEntitlements:PRJCT-001',
			'channelProducts:7',
			'projectOrders:101',
		]);
	});

	it('scopes the entitlements to the project only on the products tab or the project root', async () => {
		window.location.hash = '#/ACCNT-001/project/PRJCT-001';

		let preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toContain('projectEntitlements:PRJCT-001');

		preloadDataQuery.mockClear();
		window.location.hash = '#/ACCNT-001/project/PRJCT-001/orders';

		preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toContain('projectContracts:PRJCT-001');
		expect(getPreloadedKeys()).toContain('projectEntitlements:');
	});

	it('uses an empty project ERC when the hash is not a project path', async () => {
		window.location.hash = '#/ACCNT-001/accounts/PRJCT-001';

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toContain('projectContracts:');
		expect(getPreloadedKeys()).toContain('projectEntitlements:');
	});
});
