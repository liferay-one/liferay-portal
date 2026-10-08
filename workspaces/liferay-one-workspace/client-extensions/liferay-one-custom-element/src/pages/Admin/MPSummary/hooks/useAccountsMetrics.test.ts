/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useAccountsMetrics from './useAccountsMetrics';

const mocks = vi.hoisted(() => ({
	getAccounts: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {getAccounts: mocks.getAccounts},
}));

function mockTotalCounts(...totalCounts: number[]) {
	for (const totalCount of totalCounts) {
		mocks.getAccounts.mockResolvedValueOnce({totalCount});
	}
}

function runFetcher(param: 'month' | 'week' = 'week') {
	renderHook(() => useAccountsMetrics(param));

	return mocks.useSWR.mock.calls[0][1]();
}

describe('[HOOK-ADMIN-MPSUMMARY-USEACCOUNTSMETRICS] useAccountsMetrics', () => {
	beforeEach(() => {
		mocks.getAccounts.mockReset();
		mocks.useSWR.mockReset();
		vi.useFakeTimers({toFake: ['Date']});
		vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keys the request on the period', () => {
		renderHook(() => useAccountsMetrics('month'));

		expect(mocks.useSWR.mock.calls[0][0]).toEqual([
			'metrics/accounts',
			'month',
		]);
	});

	it('keys the request on the account types too', () => {
		renderHook(() => useAccountsMetrics('week', ['business', 'person']));

		expect(mocks.useSWR.mock.calls[0][0]).toEqual([
			'metrics/accounts',
			'week',
			'business',
			'person',
		]);
	});

	it('restricts every count to the requested account types', async () => {
		mockTotalCounts(100, 30, 10);

		renderHook(() => useAccountsMetrics('week', ['business', 'person']));

		await mocks.useSWR.mock.calls[0][1]();

		const lastPeriod = new Date(2026, 4, 8, 23, 59, 59).toISOString();

		const [allParams, lastPeriodParams, windowParams] =
			mocks.getAccounts.mock.calls.map(
				([searchParams]) => searchParams as URLSearchParams
			);

		expect(allParams.get('filter')).toBe("type in ('business','person')");
		expect(lastPeriodParams.get('filter')).toBe(
			`type in ('business','person') and dateCreated gt ${lastPeriod}`
		);
		expect(windowParams.get('filter')).toContain(
			`type in ('business','person') and dateCreated lt ${lastPeriod}`
		);
	});

	it('computes new accounts as the last period minus the earlier window', async () => {
		mockTotalCounts(100, 30, 10);

		await expect(runFetcher()).resolves.toEqual({
			beforeLastPeriod: 10,
			growth: 66.67,
			lastPeriod: 30,
			param: 'week',
			totalCount: 100,
		});
	});

	it('requests the last period and the earlier window by creation date', async () => {
		mockTotalCounts(100, 30, 10);

		await runFetcher('week');

		const lastPeriod = new Date(2026, 4, 8, 23, 59, 59).toISOString();
		const beforeLastPeriod = new Date(2026, 4, 1, 0, 0, 0).toISOString();

		const [allParams, lastPeriodParams, windowParams] =
			mocks.getAccounts.mock.calls.map(
				([searchParams]) => searchParams as URLSearchParams
			);

		expect(allParams.get('filter')).toBeNull();
		expect(lastPeriodParams.get('filter')).toContain(
			`dateCreated gt ${lastPeriod}`
		);
		expect(windowParams.get('filter')).toContain(
			`dateCreated lt ${lastPeriod}`
		);
		expect(windowParams.get('filter')).toContain(
			`dateCreated gt ${beforeLastPeriod}`
		);
	});

	it('reports growth 0 when both counts are zero', async () => {
		mockTotalCounts(5, 0, 0);

		await expect(runFetcher()).resolves.toMatchObject({growth: 0});
	});

	it('reports growth 0 instead of Infinity when the last period is zero', async () => {
		mockTotalCounts(5, 0, 3);

		await expect(runFetcher()).resolves.toMatchObject({growth: 0});
	});
});
