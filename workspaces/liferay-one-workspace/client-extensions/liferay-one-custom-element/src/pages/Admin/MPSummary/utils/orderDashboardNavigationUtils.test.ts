/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import {
	getOrderProductId,
	openCustomerDashboard,
	openPublisherDashboard,
	resolveProjectPath,
} from './orderDashboardNavigationUtils';

import type {Order} from '~/types/orders';

const mocks = vi.hoisted(() => ({
	fetcher: vi.fn(),
	getProduct: vi.fn(),
	setCurrentAccount: vi.fn(),
}));

vi.mock('~/services/fetcher/fetcher', () => ({
	default: mocks.fetcher,
}));

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {getProduct: mocks.getProduct},
}));

vi.mock('~/utils/setCurrentAccount', () => ({
	setCurrentAccount: mocks.setCurrentAccount,
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

function buildOrder(overrides: Partial<Order> = {}) {
	return {
		accountId: 43720,
		customFields: {},
		id: 69329,
		orderItems: [{productId: 67356}],
		orderTypeExternalReferenceCode: 'CLIENT_EXTENSION',
		...overrides,
	} as unknown as Order;
}

function getRequestedSearchParams() {
	const [url] = mocks.fetcher.mock.calls[0];

	return new URL(url, 'http://localhost').searchParams;
}

describe('[MOD-ADMIN-MPSUMMARY-ORDERDASHBOARDNAVIGATIONUTILS] orderDashboardNavigationUtils', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
		mocks.getProduct.mockReset();
		mocks.setCurrentAccount.mockReset();
		mocks.setCurrentAccount.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getOrderProductId', () => {
		it('returns the product of the first order item', () => {
			expect(getOrderProductId(buildOrder())).toBe(67356);
		});

		it('returns undefined when the order has no items', () => {
			expect(
				getOrderProductId(buildOrder({orderItems: []}))
			).toBeUndefined();
		});
	});

	describe('resolveProjectPath', () => {
		it('lands on the one-time purchases applications for an app order without a project', async () => {
			await expect(resolveProjectPath(buildOrder())).resolves.toBe(
				'one-time-purchases/applications'
			);

			expect(mocks.fetcher).not.toHaveBeenCalled();
		});

		it('lands on the one-time purchases products for a non app order without a project', async () => {
			await expect(
				resolveProjectPath(
					buildOrder({orderTypeExternalReferenceCode: 'AI_HUB'})
				)
			).resolves.toBe('one-time-purchases/products');
		});

		it('resolves the project by account and exact name with a single row', async () => {
			mocks.fetcher.mockResolvedValue({
				items: [{externalReferenceCode: 'PRJCT-001'}],
			});

			await expect(
				resolveProjectPath(
					buildOrder({customFields: {projectName: "O'Neil Project"}})
				)
			).resolves.toBe('PRJCT-001/applications');

			expect(mocks.fetcher).toHaveBeenCalledTimes(1);

			const searchParams = getRequestedSearchParams();

			expect(searchParams.get('filter')).toBe(
				"r_accountEntryToProject_accountEntryId eq '43720' and name eq 'O''Neil Project'"
			);
			expect(searchParams.get('pageSize')).toBe('1');
		});

		it('falls back to the section alone when the project name matches nothing', async () => {
			mocks.fetcher.mockResolvedValue({items: []});

			await expect(
				resolveProjectPath(
					buildOrder({customFields: {projectName: 'Missing'}})
				)
			).resolves.toBe('applications');
		});
	});

	describe('openCustomerDashboard', () => {
		it('switches to the customer account before navigating to the project section', async () => {
			const navigate = vi.spyOn(Liferay.Util, 'navigate');

			await openCustomerDashboard(buildOrder());

			expect(mocks.setCurrentAccount).toHaveBeenCalledWith('43720');
			expect(navigate).toHaveBeenCalledWith(
				'/web/one/my-account#/project/one-time-purchases/applications'
			);
			expect(
				mocks.setCurrentAccount.mock.invocationCallOrder[0]
			).toBeLessThan(navigate.mock.invocationCallOrder[0]);
		});
	});

	describe('openPublisherDashboard', () => {
		it('does nothing when the order has no product', async () => {
			const navigate = vi.spyOn(Liferay.Util, 'navigate');

			await openPublisherDashboard(buildOrder({orderItems: []}));

			expect(mocks.getProduct).not.toHaveBeenCalled();
			expect(navigate).not.toHaveBeenCalled();
		});

		it('warns instead of navigating when the catalog has no account', async () => {
			const navigate = vi.spyOn(Liferay.Util, 'navigate');
			const openToast = vi.spyOn(Liferay.Util, 'openToast');

			mocks.getProduct.mockResolvedValue({catalog: {}});

			await openPublisherDashboard(buildOrder());

			expect(openToast).toHaveBeenCalledWith(
				expect.objectContaining({type: 'warning'})
			);
			expect(mocks.setCurrentAccount).not.toHaveBeenCalled();
			expect(navigate).not.toHaveBeenCalled();
		});

		it('switches to the catalog account before opening the publisher dashboard', async () => {
			const navigate = vi.spyOn(Liferay.Util, 'navigate');

			mocks.getProduct.mockResolvedValue({catalog: {accountId: 65905}});

			await openPublisherDashboard(buildOrder());

			expect(mocks.getProduct).toHaveBeenCalledWith(
				67356,
				expect.any(URLSearchParams)
			);
			expect(mocks.setCurrentAccount).toHaveBeenCalledWith('65905');
			expect(navigate).toHaveBeenCalledWith(
				'/web/one/my-account/publisher-dashboard'
			);
		});
	});
});
