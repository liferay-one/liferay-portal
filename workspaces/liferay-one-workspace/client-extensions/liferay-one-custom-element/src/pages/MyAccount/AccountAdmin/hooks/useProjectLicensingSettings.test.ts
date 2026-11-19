/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDataQuery} from '~/hooks/useDataQuery';
import {queryGraphQL} from '~/services/graphql/GraphQL';

import useProjectLicensingSettings, {
	projectLicensingSettingsQuery,
} from './useProjectLicensingSettings';

const mocks = vi.hoisted(() => ({
	account: undefined as {id: number} | undefined,
	loading: false,
}));

vi.mock('~/context/AccountContext', () => ({
	useAccount: () => ({account: mocks.account, loading: mocks.loading}),
}));

vi.mock('~/hooks/useDataQuery', () => ({
	useDataQuery: vi.fn(() => ({data: undefined, isLoading: false})),
}));

vi.mock('~/services/graphql/GraphQL', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/services/graphql/GraphQL')>()),
	queryGraphQL: vi.fn(),
}));

describe('[HOOK-MYACCOUNT-ACCOUNTADMIN-USEPROJECTLICENSINGSETTINGS] useProjectLicensingSettings', () => {
	beforeEach(() => {
		mocks.account = {id: 7};
	});

	afterEach(() => {
		vi.clearAllMocks();

		mocks.account = undefined;
		mocks.loading = false;
	});

	it('reads the licensing settings of every project of the account', async () => {
		vi.mocked(queryGraphQL).mockResolvedValue({
			projects: {items: [], totalCount: 0},
		});

		await projectLicensingSettingsQuery(7).fetcher();

		const selection = vi.mocked(queryGraphQL).mock.calls[0][0];

		expect(selection).toContain(
			"r_accountEntryToProject_accountEntryId eq '7'"
		);
		expect(selection).toContain(
			'allowComplimentary allowPermanentLicenses allowSelfProvisioning'
		);
		expect(selection).toContain('page: 1, pageSize: 200');
	});

	it('reads every page of the projects of the account', async () => {
		vi.mocked(queryGraphQL)
			.mockResolvedValueOnce({
				projects: {
					items: [{externalReferenceCode: 'PRJCT-001'}],
					totalCount: 401,
				},
			})
			.mockResolvedValueOnce({
				projects: {
					items: [{externalReferenceCode: 'PRJCT-002'}],
					totalCount: 401,
				},
			})
			.mockResolvedValueOnce({
				projects: {
					items: [{externalReferenceCode: 'PRJCT-003'}],
					totalCount: 401,
				},
			});

		const response = await projectLicensingSettingsQuery(7).fetcher();

		expect(
			response.items.map((item) => item.externalReferenceCode)
		).toEqual(['PRJCT-001', 'PRJCT-002', 'PRJCT-003']);
		expect(vi.mocked(queryGraphQL)).toHaveBeenCalledTimes(3);
		expect(vi.mocked(queryGraphQL).mock.calls[2][0]).toContain(
			'page: 3, pageSize: 200'
		);
	});

	it('makes no request and stays loading before the account of the route resolves', () => {
		mocks.account = undefined;
		mocks.loading = true;

		const {result} = renderHook(() => useProjectLicensingSettings());

		expect(vi.mocked(useDataQuery).mock.calls[0][0].key).toBeNull();
		expect(result.current.isLoading).toBe(true);
	});

	it('stops loading when the account of the route does not resolve', () => {
		mocks.account = undefined;

		const {result} = renderHook(() => useProjectLicensingSettings());

		expect(vi.mocked(useDataQuery).mock.calls[0][0].key).toBeNull();
		expect(result.current.isLoading).toBe(false);
	});

	it('keys the request by the account of the route', () => {
		const {result} = renderHook(() => useProjectLicensingSettings());

		expect(vi.mocked(useDataQuery).mock.calls[0][0].key).toBe(
			'/graphql/projects/7/licensing-settings'
		);
		expect(result.current.isLoading).toBe(false);
	});
});
