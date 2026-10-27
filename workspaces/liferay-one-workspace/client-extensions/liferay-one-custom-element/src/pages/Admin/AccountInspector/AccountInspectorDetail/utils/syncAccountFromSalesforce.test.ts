/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';

import syncAccountFromSalesforce from './syncAccountFromSalesforce';

const mocks = vi.hoisted(() => ({
	postSyncFromSalesforce: vi.fn(),
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {postSyncFromSalesforce: mocks.postSyncFromSalesforce},
}));

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-SYNCACCOUNTFROMSALESFORCE] syncAccountFromSalesforce', () => {
	const openToast = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.Util.openToast = openToast;
	});

	it('syncs the account by ERC and shows the number of synced records', async () => {
		mocks.postSyncFromSalesforce.mockResolvedValue({count: 3});

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(true);
		expect(mocks.postSyncFromSalesforce).toHaveBeenCalledWith('ACCNT-1');
		expect(openToast).toHaveBeenCalledWith({
			message: '3 records were synced from Salesforce.',
			type: 'success',
		});
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

		error.info = {detail: 'Unable to complete Salesforce query job 750A'};

		mocks.postSyncFromSalesforce.mockRejectedValue(error);

		expect(await syncAccountFromSalesforce('ACCNT-1')).toBe(false);
		expect(openToast).toHaveBeenCalledWith({
			message: 'Unable to complete Salesforce query job 750A',
			type: 'danger',
		});
	});
});
