/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useSSATrialsExtend} from './useSSATrialsExtend';

import type {Account} from '~/types/accounts';

const mocks = vi.hoisted(() => ({
	getTrialExtensionRequest: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/services/objects/TrialExtensionRequests', () => ({
	default: {getTrialExtensionRequest: mocks.getTrialExtensionRequest},
}));

describe('[HOOK-ADMIN-SSADASHBOARD-USESSATRIALSEXTEND] useSSATrialsExtend', () => {
	beforeEach(() => {
		mocks.getTrialExtensionRequest.mockReset();
		mocks.useSWR.mockReset();
	});

	it('sends no request without an account ID', () => {
		renderHook(() => useSSATrialsExtend(undefined as unknown as Account));

		expect(mocks.useSWR.mock.calls[0][0]).toBeNull();
	});

	it('filters by the account entry ID sorted by date created descending with no page limit', () => {
		renderHook(() => useSSATrialsExtend({id: 7} as Account));

		expect(mocks.useSWR.mock.calls[0][0]).toBe(
			'/o/c/trialextensionrequests'
		);

		mocks.useSWR.mock.calls[0][1]();

		const searchParams = mocks.getTrialExtensionRequest.mock
			.calls[0][0] as URLSearchParams;

		expect(Object.fromEntries(searchParams)).toEqual({
			filter: "r_accountEntryToTrialExtensionRequest_accountEntryId eq '7'",
			page: '1',
			pageSize: '-1',
			sort: 'dateCreated:desc',
		});
	});
});
