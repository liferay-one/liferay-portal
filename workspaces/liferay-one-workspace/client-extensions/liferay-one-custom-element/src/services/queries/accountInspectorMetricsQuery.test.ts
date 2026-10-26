/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import {accountInspectorMetricsQuery} from './accountInspectorMetricsQuery';

const mocks = vi.hoisted(() => ({fetcher: vi.fn()}));

vi.mock('~/services/fetcher/fetcher', () => ({default: mocks.fetcher}));

describe('[CLIENT-QUERIES-ACCOUNTINSPECTORMETRICSQUERY] accountInspectorMetricsQuery', () => {
	beforeEach(() => {
		mocks.fetcher.mockReset();
	});

	it('reads one row of each collection and returns its total count', async () => {
		mocks.fetcher.mockImplementation(async (url: string) => ({
			items: [],
			totalCount: new URL(url, 'http://x').pathname.length,
		}));

		const metrics = await accountInspectorMetricsQuery().fetcher();

		expect(metrics).toEqual({
			accounts: '/o/headless-admin-user/v1.0/accounts'.length,
			contracts: '/o/c/contracts'.length,
			entitlements: '/o/c/entitlements'.length,
			projects: '/o/c/projects'.length,
		});

		for (const [url] of mocks.fetcher.mock.calls) {
			expect(new URL(url, 'http://x').searchParams.get('pageSize')).toBe(
				'1'
			);
		}
	});

	it('leaves a count that failed to load undefined and keeps the others', async () => {
		mocks.fetcher.mockImplementation(async (url: string) => {
			if (url.startsWith('/o/c/contracts')) {
				throw new FetcherError('Forbidden');
			}

			return {items: [], totalCount: 7};
		});

		const metrics = await accountInspectorMetricsQuery().fetcher();

		expect(metrics.contracts).toBeUndefined();
		expect(metrics.accounts).toBe(7);
	});
});
