/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';

import syncRecordToJSM from './syncRecordToJSM';

const mocks = vi.hoisted(() => ({
	accountSync: vi.fn(),
	projectSync: vi.fn(),
	userSync: vi.fn(),
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {postSyncToJSM: mocks.accountSync},
}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {postSyncToJSM: mocks.projectSync},
}));

vi.mock('~/services/spring-boot/UserAccounts', () => ({
	default: {postSyncToJSM: mocks.userSync},
}));

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-SYNCRECORDTOJSM] syncRecordToJSM', () => {
	const openToast = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.Util.openToast = openToast;
	});

	it('syncs an account and a project by ERC, and a user by ID', async () => {
		await syncRecordToJSM({
			externalReferenceCode: 'ACCNT-1',
			name: 'Account',
			recordId: 1,
			type: 'account',
		});
		await syncRecordToJSM({
			externalReferenceCode: 'PRJCT-1',
			name: 'Project',
			recordId: 2,
			type: 'project',
		});
		await syncRecordToJSM({
			externalReferenceCode: 'USER-1',
			name: 'User',
			recordId: 3,
			type: 'user',
		});

		expect(mocks.accountSync).toHaveBeenCalledWith('ACCNT-1');
		expect(mocks.projectSync).toHaveBeenCalledWith('PRJCT-1');
		expect(mocks.userSync).toHaveBeenCalledWith(3);
	});

	it('returns true and shows a success toast when the sync succeeds', async () => {
		mocks.accountSync.mockResolvedValue({});

		expect(
			await syncRecordToJSM({
				externalReferenceCode: 'ACCNT-1',
				name: 'Account',
				recordId: 1,
				type: 'account',
			})
		).toBe(true);
		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
	});

	it('returns false and shows the error detail when the sync fails', async () => {
		const error = new FetcherError('Bad Request');

		error.info = {detail: 'JSM is not configured.'};

		mocks.accountSync.mockRejectedValue(error);

		expect(
			await syncRecordToJSM({
				externalReferenceCode: 'ACCNT-1',
				name: 'Account',
				recordId: 1,
				type: 'account',
			})
		).toBe(false);
		expect(openToast).toHaveBeenCalledWith({
			message: 'JSM is not configured.',
			type: 'danger',
		});
	});
});
