/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';

import syncAccountFromSalesforce from './syncAccountFromSalesforce';

const mocks = vi.hoisted(() => ({
	fetchSalesforceComparison: vi.fn(),
	postSyncFromSalesforce: vi.fn(),
}));

vi.mock('~/services/queries/accountSalesforceRecordsQuery', () => ({
	fetchSalesforceComparison: mocks.fetchSalesforceComparison,
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {postSyncFromSalesforce: mocks.postSyncFromSalesforce},
}));

const QUERY_JOB_IDS = ['750A', '750B', '750C'];

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-SYNCACCOUNTFROMSALESFORCE] syncAccountFromSalesforce', () => {
	const openToast = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.Util.openToast = openToast;

		mocks.fetchSalesforceComparison.mockResolvedValue({
			queryJobIds: QUERY_JOB_IDS,
			records: [],
		});
	});

	it('syncs the account with the completed query jobs and shows the number of synced records', async () => {
		mocks.postSyncFromSalesforce.mockResolvedValue({count: 3});

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(true);
		expect(mocks.fetchSalesforceComparison).toHaveBeenCalledWith('ACCNT-1');
		expect(mocks.postSyncFromSalesforce).toHaveBeenCalledWith(
			'ACCNT-1',
			QUERY_JOB_IDS
		);
		expect(openToast).toHaveBeenCalledWith({
			message: '3 records were synced from Salesforce.',
			type: 'success',
		});
	});

	it('syncs the account with the query jobs of the comparison on the page', async () => {
		mocks.postSyncFromSalesforce.mockResolvedValue({count: 1});

		expect(
			await syncAccountFromSalesforce('ACCNT-1', ['750D', '750E', '750F'])
		).toBe(true);
		expect(mocks.fetchSalesforceComparison).not.toHaveBeenCalled();
		expect(mocks.postSyncFromSalesforce).toHaveBeenCalledWith('ACCNT-1', [
			'750D',
			'750E',
			'750F',
		]);
	});

	it('states that the account already matches when no record was synced', async () => {
		mocks.postSyncFromSalesforce.mockResolvedValue({count: 0});

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(true);
		expect(openToast).toHaveBeenCalledWith({
			message: 'The account already matches Salesforce.',
			type: 'success',
		});
	});

	it('returns false and shows the error detail when the sync fails', async () => {
		const error = new FetcherError('Bad Request');

		error.info = {
			detail: 'Salesforce query job 750A ended in state Failed',
		};

		mocks.postSyncFromSalesforce.mockRejectedValue(error);

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(false);
		expect(openToast).toHaveBeenCalledWith({
			message: 'Salesforce query job 750A ended in state Failed',
			type: 'danger',
		});
	});

	it('does not sync when the comparison does not complete', async () => {
		const error = new FetcherError('Timeout');

		error.info = {
			title: 'Salesforce did not complete the comparison in time. Try again later.',
		};

		mocks.fetchSalesforceComparison.mockRejectedValue(error);

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(false);
		expect(mocks.postSyncFromSalesforce).not.toHaveBeenCalled();
		expect(openToast).toHaveBeenCalledWith({
			message:
				'Salesforce did not complete the comparison in time. Try again later.',
			type: 'danger',
		});
	});
});
