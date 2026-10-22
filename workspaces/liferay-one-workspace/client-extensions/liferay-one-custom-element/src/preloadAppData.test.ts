/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

const {liferay, preloadDataQuery} = vi.hoisted(() => ({
	liferay: {
		CommerceContext: {} as {
			account?: {accountId?: number};
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
	projectContractsQuery: (projectERC: string) => ({
		key: `projectContracts:${projectERC}`,
	}),
	projectEntitlementsQuery: (projectERC: string) => ({
		key: `projectEntitlements:${projectERC}`,
	}),
	projectProductsQuery: (accountERC: string) => ({
		key: `projectProducts:${accountERC}`,
	}),
}));

vi.mock('~/hooks/useProjectOrders', () => ({
	projectOrdersQuery: (accountId: number) => ({
		key: `projectOrders:${accountId}`,
	}),
}));

vi.mock(
	'~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeySummary',
	() => ({
		activationKeySummaryQuery: (scope?: {
			accountExternalReferenceCode?: string;
			projectExternalReferenceCode?: string;
		}) => ({
			key:
				scope?.projectExternalReferenceCode ||
				scope?.accountExternalReferenceCode
					? `activationKeySummary:${
							scope?.projectExternalReferenceCode ??
							scope?.accountExternalReferenceCode
						}`
					: null,
		}),
	})
);

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
		};
		liferay.ThemeDisplay.isSignedIn = () => true;
		preloadDataQuery.mockReset();
		preloadDataQuery.mockImplementation(({key}: {key: string}) =>
			key === 'currentAccount:101'
				? Promise.resolve({externalReferenceCode: 'ACCNT-001'})
				: undefined
		);
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

		await vi.waitFor(() =>
			expect(getPreloadedKeys()).toEqual([
				'/my-user-account',
				'currentAccount:101',
				'accounts:101',
				'userProjects:101',
				'accountLevelContracts:101',
				'projectContracts:PRJCT-001',
				'projectEntitlements:PRJCT-001',
				'activationKeySummary:PRJCT-001',
				'projectOrders:101',
				'projectProducts:ACCNT-001',
			])
		);
	});

	it('preloads the activation key summary on a project activation route', async () => {
		window.location.hash = '#/ACCNT-001/project/PRJCT-001/activation';

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toContain('activationKeySummary:PRJCT-001');
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

	it('skips the product query when the current account preload fails', async () => {
		preloadDataQuery.mockImplementation(({key}: {key: string}) =>
			key === 'currentAccount:101'
				? Promise.reject(new Error('Unable to get account'))
				: undefined
		);

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getPreloadedKeys()).not.toContain('projectProducts:ACCNT-001');
	});

	it('skips the product query when the current account has no ERC', async () => {
		preloadDataQuery.mockImplementation(({key}: {key: string}) =>
			key === 'currentAccount:101' ? Promise.resolve({}) : undefined
		);

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(
			getPreloadedKeys().filter((key) =>
				key.startsWith('projectProducts')
			)
		).toEqual([]);
	});

	it('uses an empty project ERC when the hash is not a project path', async () => {
		window.location.hash = '#/ACCNT-001/accounts/PRJCT-001';

		const preloadAppData = await loadPreloadAppData();

		preloadAppData('my-account');

		expect(getPreloadedKeys()).toContain('projectContracts:');
		expect(getPreloadedKeys()).toContain('projectEntitlements:');
		expect(getPreloadedKeys()).not.toContain(
			'activationKeySummary:PRJCT-001'
		);
	});
});
