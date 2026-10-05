/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useAppsMetrics from './useAppsMetrics';

const mocks = vi.hoisted(() => ({
	getProductsDashboardKPI: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {getProductsDashboardKPI: mocks.getProductsDashboardKPI},
}));

function runFetcher(param?: 'month' | 'week') {
	mocks.useSWR.mockReturnValue({isLoading: false});

	renderHook(() => useAppsMetrics(param));

	return mocks.useSWR.mock.calls[0][1]();
}

describe('[HOOK-ADMIN-APPS-USEAPPSMETRICS] useAppsMetrics', () => {
	beforeEach(() => {
		mocks.getProductsDashboardKPI.mockReset();
		mocks.useSWR.mockReset();
	});

	it('maps each count to its totalCount', async () => {
		mocks.getProductsDashboardKPI.mockResolvedValue({
			data: {
				metrics: {
					approved: {totalCount: 1},
					approvedBeforeLastWeek: {totalCount: 2},
					approvedLastWeek: {totalCount: 3},
					inReview: {totalCount: 4},
					inReviewBeforeLastWeek: {totalCount: 5},
					inReviewLastWeek: {totalCount: 6},
					products: {totalCount: 7},
				},
			},
		});

		await expect(runFetcher()).resolves.toEqual({
			approved: 1,
			approvedBeforeLastWeek: 2,
			approvedLastWeek: 3,
			inReview: 4,
			inReviewBeforeLastWeek: 5,
			inReviewLastWeek: 6,
			products: 7,
		});
	});

	it('maps a missing count to 0', async () => {
		mocks.getProductsDashboardKPI.mockResolvedValue({
			data: {metrics: {approved: {}}},
		});

		await expect(runFetcher()).resolves.toEqual({
			approved: 0,
			approvedBeforeLastWeek: 0,
			approvedLastWeek: 0,
			inReview: 0,
			inReviewBeforeLastWeek: 0,
			inReviewLastWeek: 0,
			products: 0,
		});
	});

	it('bounds the approved and in review counts by createDate for the period window', async () => {
		mocks.getProductsDashboardKPI.mockResolvedValue({data: {metrics: {}}});

		await runFetcher('month');

		const filters = mocks.getProductsDashboardKPI.mock.calls[0][0];

		expect(filters.approved).not.toContain('createDate');
		expect(filters.inReview).not.toContain('createDate');
		expect(filters.products).toBe('');

		for (const key of ['approvedLastWeek', 'inReviewLastWeek']) {
			expect(filters[key]).toContain('createDate gt');
			expect(filters[key]).not.toContain('createDate lt');
		}

		for (const key of [
			'approvedBeforeLastWeek',
			'inReviewBeforeLastWeek',
		]) {
			expect(filters[key]).toContain('createDate lt');
			expect(filters[key]).toContain('createDate gt');
		}

		const lastPeriodTime = new Date(
			filters.approvedLastWeek.match(/createDate gt (\S+)/)[1]
		).getTime();

		const days = (Date.now() - lastPeriodTime) / (24 * 60 * 60 * 1000);

		expect(days).toBeGreaterThan(28);
		expect(days).toBeLessThan(31);
	});

	it('spreads the metrics into the SWR result', () => {
		mocks.useSWR.mockReturnValue({
			data: {approved: 2, products: 9},
			isLoading: false,
		});

		const {result} = renderHook(() => useAppsMetrics());

		expect(result.current).toMatchObject({
			approved: 2,
			isLoading: false,
			products: 9,
		});
	});
});
