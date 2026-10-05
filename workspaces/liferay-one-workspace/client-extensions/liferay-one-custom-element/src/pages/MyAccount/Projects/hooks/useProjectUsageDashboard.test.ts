/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useProjectUsageDashboard} from './useProjectUsageDashboard';

const mocks = vi.hoisted(() => ({
	getProjectUsage: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {getProjectUsage: mocks.getProjectUsage},
}));

function getKey() {
	return mocks.useSWR.mock.calls[0][0];
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEPROJECTUSAGEDASHBOARD] useProjectUsageDashboard', () => {
	beforeEach(() => {
		mocks.getProjectUsage.mockReset();
		mocks.useSWR.mockReset();
		mocks.useSWR.mockReturnValue({
			data: {metrics: {}},
			error: undefined,
			isLoading: false,
		});
	});

	it('keys the request on the product and the project', () => {
		const {result} = renderHook(() =>
			useProjectUsageDashboard('PRDCT-DXP', 'PRJCT-1')
		);

		expect(getKey()).toBe(
			'/projects/PRJCT-1/usage?productExternalReferenceCode=PRDCT-DXP'
		);
		expect(result.current).toEqual({
			error: undefined,
			isLoading: false,
			usageDashboard: {metrics: {}},
		});

		mocks.useSWR.mock.calls[0][1]();

		expect(mocks.getProjectUsage).toHaveBeenCalledWith(
			'PRDCT-DXP',
			'PRJCT-1'
		);
	});

	it('skips the request without a project external reference code', () => {
		renderHook(() => useProjectUsageDashboard('PRDCT-DXP', ''));

		expect(getKey()).toBeNull();
	});

	it('skips the request for an unassigned project', () => {
		renderHook(() =>
			useProjectUsageDashboard('PRDCT-DXP', 'one-time-purchases')
		);

		expect(getKey()).toBeNull();
	});
});
