/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {OrderWorkflowStatusCode} from '~/utils/orderUtils';

import useTrialMetrics from './useTrialMetrics';

const mocks = vi.hoisted(() => ({
	getAvailability: vi.fn(),
	getOrders: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/headless/HeadlessCommerceAdminOrder', () => ({
	default: {getOrders: mocks.getOrders},
}));

vi.mock('~/services/spring-boot/Trial', () => ({
	default: {getAvailability: mocks.getAvailability},
}));

function mockTrialData(data?: unknown[]) {
	mocks.useSWR.mockReturnValue({
		data,
		error: undefined,
		isLoading: false,
		mutate: vi.fn(),
	});
}

function getLastRefreshInterval() {
	return mocks.useSWR.mock.calls.at(-1)?.[2].refreshInterval;
}

function toOrders(...codes: number[]) {
	return {
		items: codes.map((code) => ({orderStatusInfo: {code}})),
		totalCount: codes.length,
	};
}

describe('[HOOK-ADMIN-TRIALS-USETRIALMETRICS] useTrialMetrics', () => {
	beforeEach(() => {
		mocks.getAvailability.mockReset();
		mocks.getOrders.mockReset();
		mocks.useSWR.mockReset();
	});

	it('computes resources available as max minus available over max', () => {
		mockTrialData([{available: 3, max: 10}]);

		const {result} = renderHook(() => useTrialMetrics('week'));

		expect(result.current.availability).toEqual({
			available: 3,
			max: 10,
			resourcesAvailable: '7 / 10',
		});
	});

	it('falls back to 0 for resources available and every count without data', () => {
		mockTrialData(undefined);

		const {result} = renderHook(() => useTrialMetrics('week'));

		expect(result.current.availability.resourcesAvailable).toBe('0 / 0');
		expect(result.current.inProgressCount).toBeUndefined();
		expect(result.current.totalCount).toEqual({
			all: 0,
			expired: 0,
			inProgress: 0,
			onHold: 0,
		});
	});

	it('maps each count from its response', () => {
		mockTrialData([
			{available: 0, max: 5},
			toOrders(OrderWorkflowStatusCode.COMPLETED),
			{totalCount: 4},
			{totalCount: 2},
			{totalCount: 1},
		]);

		const {result} = renderHook(() => useTrialMetrics('week'));

		expect(result.current.inProgressCount).toBe(2);
		expect(result.current.totalCount).toEqual({
			all: 1,
			expired: 4,
			inProgress: 2,
			onHold: 1,
		});
	});

	it('fetches the availability and the four order queries', async () => {
		mockTrialData(undefined);
		mocks.getAvailability.mockResolvedValue({available: 1, max: 2});
		mocks.getOrders.mockResolvedValue({totalCount: 0});

		renderHook(() => useTrialMetrics('week'));

		expect(mocks.useSWR.mock.calls[0][0]).toBe(
			'administrator-dashboard/metrics/trial'
		);

		await mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getAvailability).toHaveBeenCalledTimes(1);
		expect(mocks.getOrders).toHaveBeenCalledTimes(4);
	});

	it.each([
		['processing', OrderWorkflowStatusCode.PROCESSING],
		['on hold', OrderWorkflowStatusCode.ON_HOLD],
	])('refreshes every 60 seconds while an order is %s', (_label, code) => {
		mockTrialData([{}, toOrders(OrderWorkflowStatusCode.COMPLETED, code)]);

		renderHook(() => useTrialMetrics('week'));

		expect(mocks.useSWR.mock.calls[0][2].refreshInterval).toBe(240 * 1000);
		expect(getLastRefreshInterval()).toBe(60 * 1000);
	});

	it('returns to 240 seconds once no order is processing or on hold', () => {
		mockTrialData([{}, toOrders(OrderWorkflowStatusCode.PROCESSING)]);

		const {rerender} = renderHook(() => useTrialMetrics('week'));

		expect(getLastRefreshInterval()).toBe(60 * 1000);

		mockTrialData([{}, toOrders(OrderWorkflowStatusCode.COMPLETED)]);

		rerender();

		expect(getLastRefreshInterval()).toBe(240 * 1000);
	});
});
