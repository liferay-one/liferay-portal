/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProjectEventHistory} from './useProjectEventHistory';

const mocks = vi.hoisted(() => ({
	getProjectEventHistory: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {getProjectEventHistory: mocks.getProjectEventHistory},
}));

const OPTIONS = {
	endDate: '2026-02-01',
	granularity: 'day' as const,
	projectExternalReferenceCode: 'PRJCT-1',
	startDate: '2026-01-01',
};

function getKey() {
	return mocks.useSWR.mock.calls[0][0];
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTHISTORY] useProjectEventHistory', () => {
	beforeEach(() => {
		mocks.getProjectEventHistory.mockReset();
		mocks.useSWR.mockReset();
		mocks.useSWR.mockReturnValue({
			data: {eventHistory: []},
			error: undefined,
			isLoading: false,
		});
	});

	it('keys the request on the dates and granularity', () => {
		const {result} = renderHook(() => useProjectEventHistory(OPTIONS));

		expect(getKey()).toBe(
			'/projects/PRJCT-1/usage/event-history?startDate=2026-01-01&endDate=2026-02-01&granularity=day'
		);
		expect(result.current).toEqual({
			error: undefined,
			eventHistory: {eventHistory: []},
			isLoading: false,
		});
	});

	it('calls the event history endpoint from the fetcher', () => {
		renderHook(() =>
			useProjectEventHistory({...OPTIONS, granularity: 'month'})
		);

		mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getProjectEventHistory).toHaveBeenCalledWith(
			'2026-02-01',
			'month',
			'PRJCT-1',
			'2026-01-01'
		);
	});

	it.each([
		['the end date', {endDate: undefined}],
		['the start date', {startDate: undefined}],
		[
			'the project external reference code',
			{projectExternalReferenceCode: ''},
		],
		[
			'an unassigned project',
			{projectExternalReferenceCode: 'one-time-purchases'},
		],
	])('skips the request without %s', (_label, overrides) => {
		renderHook(() => useProjectEventHistory({...OPTIONS, ...overrides}));

		expect(getKey()).toBeNull();
	});
});
