/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import {fetchSalesforceComparison} from './accountSalesforceRecordsQuery';

const mocks = vi.hoisted(() => ({
	getSalesforceRecords: vi.fn(),
	postSalesforceQueryJobs: vi.fn(),
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {
		getSalesforceRecords: mocks.getSalesforceRecords,
		postSalesforceQueryJobs: mocks.postSalesforceQueryJobs,
	},
}));

const QUERY_JOB_IDS = ['750A', '750B', '750C'];

const RECORD = {
	differences: [],
	externalReferenceCode: '0015g00000ABCDE',
	name: 'Acme',
	status: 'in-sync',
	type: 'account',
};

describe('[CLIENT-QUERIES-ACCOUNTSALESFORCERECORDSQUERY] accountSalesforceRecordsQuery', () => {
	beforeEach(() => {
		vi.useFakeTimers();

		mocks.getSalesforceRecords.mockReset();
		mocks.postSalesforceQueryJobs.mockReset();

		mocks.postSalesforceQueryJobs.mockResolvedValue({
			queryJobIds: QUERY_JOB_IDS,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('starts the query jobs and reads the records when the jobs are complete', async () => {
		mocks.getSalesforceRecords.mockResolvedValue({
			complete: true,
			records: [RECORD],
		});

		await expect(fetchSalesforceComparison('ACCNT-1')).resolves.toEqual({
			queryJobIds: QUERY_JOB_IDS,
			records: [RECORD],
		});

		expect(mocks.postSalesforceQueryJobs).toHaveBeenCalledWith('ACCNT-1');
		expect(mocks.getSalesforceRecords).toHaveBeenCalledWith(
			'ACCNT-1',
			QUERY_JOB_IDS
		);
	});

	it('polls again until the query jobs are complete', async () => {
		mocks.getSalesforceRecords
			.mockResolvedValueOnce({complete: false})
			.mockResolvedValueOnce({complete: false})
			.mockResolvedValueOnce({complete: true, records: [RECORD]});

		const promise = fetchSalesforceComparison('ACCNT-1');

		await vi.runAllTimersAsync();

		await expect(promise).resolves.toEqual({
			queryJobIds: QUERY_JOB_IDS,
			records: [RECORD],
		});

		expect(mocks.getSalesforceRecords).toHaveBeenCalledTimes(3);
		expect(mocks.postSalesforceQueryJobs).toHaveBeenCalledTimes(1);
	});

	it('stops polling when the signal is aborted', async () => {
		mocks.getSalesforceRecords.mockResolvedValue({complete: false});

		const abortController = new AbortController();

		const promise = fetchSalesforceComparison(
			'ACCNT-1',
			abortController.signal
		);

		const assertion = expect(promise).rejects.toMatchObject({
			name: 'AbortError',
		});

		await vi.advanceTimersByTimeAsync(0);

		abortController.abort();

		await vi.runAllTimersAsync();

		await assertion;

		expect(mocks.getSalesforceRecords).toHaveBeenCalledTimes(1);
	});

	it('throws when the query jobs do not complete in time', async () => {
		mocks.getSalesforceRecords.mockResolvedValue({complete: false});

		const promise = fetchSalesforceComparison('ACCNT-1');

		const assertion = expect(promise).rejects.toMatchObject({
			info: {
				title: 'Salesforce did not complete the comparison in time. Try again later.',
			},
		});

		await vi.runAllTimersAsync();

		await assertion;

		await expect(promise).rejects.toBeInstanceOf(FetcherError);
		expect(mocks.getSalesforceRecords).toHaveBeenCalledTimes(90);
	});
});
