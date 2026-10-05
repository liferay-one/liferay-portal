/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProjectEventUsage} from './useProjectEventUsage';

const mocks = vi.hoisted(() => ({
	getProjectEventUsage: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {getProjectEventUsage: mocks.getProjectEventUsage},
}));

function getKey() {
	return mocks.useSWR.mock.calls[0][0];
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTUSAGE] useProjectEventUsage', () => {
	beforeEach(() => {
		mocks.getProjectEventUsage.mockReset();
		mocks.useSWR.mockReset();
		mocks.useSWR.mockReturnValue({
			data: {eventSummary: []},
			error: undefined,
			isLoading: false,
		});
	});

	it('keys the request on the project and the dates', () => {
		const {result} = renderHook(() =>
			useProjectEventUsage('PRJCT-1', '2026-01-01', '2026-02-01')
		);

		expect(getKey()).toBe(
			'/projects/PRJCT-1/usage/event-summary?startDate=2026-01-01&endDate=2026-02-01'
		);
		expect(result.current).toEqual({
			error: undefined,
			eventUsage: {eventSummary: []},
			isLoading: false,
		});
	});

	it('calls the event summary endpoint from the fetcher', () => {
		renderHook(() =>
			useProjectEventUsage('PRJCT-1', '2026-01-01', '2026-02-01')
		);

		mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getProjectEventUsage).toHaveBeenCalledWith(
			'2026-02-01',
			'PRJCT-1',
			'2026-01-01'
		);
	});

	it.each([
		['the end date', 'PRJCT-1', '2026-01-01', undefined],
		['the start date', 'PRJCT-1', undefined, '2026-02-01'],
		['the project external reference code', '', '2026-01-01', '2026-02-01'],
		[
			'an unassigned project',
			'one-time-purchases',
			'2026-01-01',
			'2026-02-01',
		],
	])(
		'skips the request without %s',
		(_label, projectExternalReferenceCode, startDate, endDate) => {
			renderHook(() =>
				useProjectEventUsage(
					projectExternalReferenceCode,
					startDate,
					endDate
				)
			);

			expect(getKey()).toBeNull();
		}
	);
});
