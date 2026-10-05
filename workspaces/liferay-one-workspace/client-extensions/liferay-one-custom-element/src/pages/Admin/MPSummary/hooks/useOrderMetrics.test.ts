/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useOrderMetrics from './useOrderMetrics';

const mocks = vi.hoisted(() => ({
	metrics: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/headless/GraphQL', () => ({
	default: {metrics: mocks.metrics},
}));

function mockMetrics({
	orders = 0,
	ordersCreateBetweenLastPeriod = 0,
	ordersCreatedLastPeriod = 0,
	ordersThisMonth = 0,
	ordersThisYear = 0,
	totalAmountItems = [] as {totalAmount?: number}[],
}) {
	mocks.metrics
		.mockResolvedValueOnce({
			data: {
				metrics: {
					orders: {totalCount: orders},
					ordersCreateBetweenLastPeriod: {
						totalCount: ordersCreateBetweenLastPeriod,
					},
					ordersCreatedLastPeriod: {
						totalCount: ordersCreatedLastPeriod,
					},
					ordersThisMonth: {totalCount: ordersThisMonth},
					ordersThisYear: {totalCount: ordersThisYear},
				},
			},
		})
		.mockResolvedValueOnce({
			data: {metrics: {totalAmount: {items: totalAmountItems}}},
		});
}

function runFetcher() {
	renderHook(() => useOrderMetrics('week'));

	return mocks.useSWR.mock.calls[0][1]();
}

describe('[HOOK-ADMIN-MPSUMMARY-USEORDERMETRICS] useOrderMetrics', () => {
	beforeEach(() => {
		mocks.metrics.mockReset();
		mocks.useSWR.mockReset();
		vi.useFakeTimers({toFake: ['Date']});
		vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keys the request on the period', () => {
		renderHook(() => useOrderMetrics('month'));

		expect(mocks.useSWR.mock.calls[0][0]).toEqual([
			'metrics/order',
			'month',
		]);
	});

	it('computes growth as the percentage of new orders over the last period', async () => {
		mockMetrics({
			orders: 50,
			ordersCreateBetweenLastPeriod: 1,
			ordersCreatedLastPeriod: 3,
			ordersThisMonth: 4,
			ordersThisYear: 9,
		});

		await expect(runFetcher()).resolves.toEqual({
			beforeLastPeriod: 1,
			growth: 66.67,
			lastPeriod: 3,
			ordersThisMonth: 4,
			ordersThisYear: 9,
			totalAmount: 0,
			totalCount: 50,
		});
	});

	it('reports growth 0 when the result is NaN', async () => {
		mockMetrics({});

		await expect(runFetcher()).resolves.toMatchObject({growth: 0});
	});

	it('sums completed order totals treating a missing total as 0', async () => {
		mockMetrics({
			totalAmountItems: [{totalAmount: 100.5}, {}, {totalAmount: 20}],
		});

		await expect(runFetcher()).resolves.toMatchObject({
			totalAmount: 120.5,
		});

		expect(mocks.metrics.mock.calls[1][1].totalAmount).toContain(
			'totalAmount gt'
		);
		expect(mocks.metrics.mock.calls[1][1].totalAmount).toContain(
			'orderStatus'
		);
	});

	it('bounds the month and year filters by the current date', async () => {
		mockMetrics({});

		await runFetcher();

		const filters = mocks.metrics.mock.calls[0][1];

		expect(filters.ordersThisMonth).toContain(
			`createDate gt ${new Date(2026, 1, 1, 0, 0, 0).toISOString()}`
		);
		expect(filters.ordersThisMonth).toContain(
			`createDate lt ${new Date(2026, 1, 28, 23, 59, 59).toISOString()}`
		);
		expect(filters.ordersThisYear).toContain(
			`createDate gt ${new Date(2026, 0, 1, 0, 0, 0).toISOString()}`
		);
		expect(filters.orders).toBe('');
	});
});
