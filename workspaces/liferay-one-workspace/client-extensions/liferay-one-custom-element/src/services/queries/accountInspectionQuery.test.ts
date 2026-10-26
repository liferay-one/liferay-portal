/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import {accountInspectionQuery} from './accountInspectionQuery';

const mocks = vi.hoisted(() => ({
	fetcher: vi.fn(),
	getAccount: vi.fn(),
}));

vi.mock('~/services/fetcher/fetcher', () => ({default: mocks.fetcher}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {getAccount: mocks.getAccount},
}));

const ACCOUNT = {externalReferenceCode: 'ACCNT-001', id: 100, name: 'Omni'};

function toPage(items: unknown[], totalCount = items.length) {
	return {items, totalCount};
}

function getRequestedURLs() {
	return mocks.fetcher.mock.calls.map(([url]) => new URL(url, 'http://x'));
}

function findRequest(pathname: string) {
	return getRequestedURLs().find((url) => url.pathname === pathname);
}

describe('[CLIENT-QUERIES-ACCOUNTINSPECTIONQUERY] accountInspectionQuery', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
		mocks.getAccount.mockReset();

		mocks.getAccount.mockResolvedValue(ACCOUNT);
		mocks.fetcher.mockResolvedValue(toPage([]));
	});

	it('has no key without a numeric account ID', () => {
		expect(accountInspectionQuery(undefined).key).toBeNull();
		expect(accountInspectionQuery('..%2F..%2Fx').key).toBeNull();
		expect(accountInspectionQuery('100').key).toBe(
			'/account-inspection/100'
		);
	});

	it('filters orders by account and related objects by relationship or ERC', async () => {
		await accountInspectionQuery('100').fetcher();

		const orders = findRequest(
			'/o/headless-commerce-admin-order/v1.0/orders'
		);

		expect(orders?.searchParams.get('filter')).toBe(
			'(accountId/any(x:(x eq 100)))'
		);
		expect(orders?.searchParams.get('nestedFields')).toBe('orderItems');

		expect(findRequest('/o/c/projects')?.searchParams.get('filter')).toBe(
			"r_accountEntryToProject_accountEntryId eq '100'"
		);
		expect(
			findRequest('/o/c/usagereports')?.searchParams.get('filter')
		).toBe("accountExternalReferenceCode eq 'ACCNT-001'");
		expect(
			findRequest(
				'/o/headless-admin-user/v1.0/accounts/100/user-accounts'
			)
		).toBeDefined();
	});

	it('reads the order items of an order again when the nested list reaches 20 rows', async () => {
		const nestedItems = Array.from({length: 20}, (_, index) => ({
			id: index,
		}));

		mocks.fetcher.mockImplementation(async (url: string) => {
			const {pathname} = new URL(url, 'http://x');

			if (pathname === '/o/headless-commerce-admin-order/v1.0/orders') {
				return toPage([
					{id: 50, orderItems: nestedItems},
					{id: 51, orderItems: [{id: 100}]},
				]);
			}

			if (
				pathname ===
				'/o/headless-commerce-admin-order/v1.0/orders/50/orderItems'
			) {
				return toPage(
					Array.from({length: 25}, (_, index) => ({id: index})),
					25
				);
			}

			return toPage([]);
		});

		const {orders} = await accountInspectionQuery('100').fetcher();

		expect(orders.items[0].orderItems).toHaveLength(25);
		expect(orders.items[0].incompleteOrderItems).toBe(false);
		expect(orders.items[1].orderItems).toEqual([{id: 100}]);
		expect(
			findRequest(
				'/o/headless-commerce-admin-order/v1.0/orders/51/orderItems'
			)
		).toBeUndefined();
	});

	it('keeps the nested order items and marks them incomplete when the second read fails', async () => {
		const nestedItems = Array.from({length: 20}, (_, index) => ({
			id: index,
		}));

		mocks.fetcher.mockImplementation(async (url: string) => {
			const {pathname} = new URL(url, 'http://x');

			if (pathname.endsWith('/orders/50/orderItems')) {
				throw new FetcherError('Failed');
			}

			return pathname === '/o/headless-commerce-admin-order/v1.0/orders'
				? toPage([{id: 50, orderItems: nestedItems}])
				: toPage([]);
		});

		const {orders} = await accountInspectionQuery('100').fetcher();

		expect(orders.items[0].orderItems).toHaveLength(20);
		expect(orders.items[0].incompleteOrderItems).toBe(true);
	});

	it('reads every page of a large collection', async () => {
		mocks.fetcher.mockImplementation(async (url: string) => {
			if (!url.startsWith('/o/c/entitlements')) {
				return toPage([]);
			}

			const page = Number(
				new URL(url, 'http://x').searchParams.get('page')
			);

			return toPage(
				Array.from({length: page === 3 ? 200 : 500}, (_, index) => ({
					id: page * 1000 + index,
				})),
				1200
			);
		});

		const {related} = await accountInspectionQuery('100').fetcher();

		expect(related.entitlements.items).toHaveLength(1200);
		expect(related.entitlements.totalCount).toBe(1200);
		expect(related.entitlements.truncated).toBe(false);
	});

	it('marks a collection truncated past the page limit', async () => {
		mocks.fetcher.mockImplementation(async (url: string) =>
			url.startsWith('/o/c/entitlements')
				? toPage([{id: 1}], 50000)
				: toPage([])
		);

		const {related} = await accountInspectionQuery('100').fetcher();

		expect(related.entitlements.items).toHaveLength(20);
		expect(related.entitlements.totalCount).toBe(50000);
		expect(related.entitlements.truncated).toBe(true);
	});

	it('keeps the loaded rows and marks the collection truncated when a later page fails', async () => {
		mocks.fetcher.mockImplementation(async (url: string) => {
			if (!url.startsWith('/o/c/entitlements')) {
				return toPage([]);
			}

			const page = Number(
				new URL(url, 'http://x').searchParams.get('page')
			);

			if (page === 2) {
				throw new FetcherError('Failed');
			}

			return toPage([{id: page}], 1200);
		});

		const {related} = await accountInspectionQuery('100').fetcher();

		expect(related.entitlements.error).toBeUndefined();
		expect(related.entitlements.items).toEqual([{id: 1}, {id: 3}]);
		expect(related.entitlements.truncated).toBe(true);
	});

	it('doubles a quote in the account ERC filter', async () => {
		mocks.getAccount.mockResolvedValue({
			...ACCOUNT,
			externalReferenceCode: "O'Brien",
		});

		await accountInspectionQuery('100').fetcher();

		expect(
			findRequest('/o/c/usagereports')?.searchParams.get('filter')
		).toBe("accountExternalReferenceCode eq 'O''Brien'");
	});

	it('stamps the load time', async () => {
		const before = Date.now();

		const {loadedAt} = await accountInspectionQuery('100').fetcher();

		expect(loadedAt).toBeGreaterThanOrEqual(before);
	});

	it('keeps a failed collection as an error and loads the rest', async () => {
		mocks.fetcher.mockImplementation(async (url: string) => {
			if (url.startsWith('/o/c/publisherdetails')) {
				const error = new FetcherError('Failed');

				error.info = {title: 'Not Found'};
				error.status = 404;

				throw error;
			}

			return toPage([{id: 1}]);
		});

		const inspection = await accountInspectionQuery('100').fetcher();

		expect(inspection.related.publisherDetails).toEqual({
			error: '404 Not Found',
			items: [],
			totalCount: 0,
		});
		expect(inspection.related.projects.truncated).toBe(false);
		expect(inspection.related.projects.items).toEqual([{id: 1}]);
		expect(inspection.account).toBe(ACCOUNT);
	});

	it('fails when the account cannot be read', async () => {
		mocks.getAccount.mockRejectedValue(new FetcherError('Failed'));

		await expect(accountInspectionQuery('100').fetcher()).rejects.toThrow(
			'Failed'
		);
	});
});
