/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {Liferay} from '~/services/liferay/liferay';

import useProjectEnvironments from './useProjectEnvironments';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

function mockFetch(data: unknown) {
	vi.mocked(useFetch).mockReturnValue({
		data,
		error: undefined,
		isLoading: false,
		mutate: vi.fn(),
	} as unknown as ReturnType<typeof useFetch>);
}

describe('[HOOK-USEPROJECTENVIRONMENTS] useProjectEnvironments', () => {
	afterEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.account = undefined;
	});

	it('sends no request without an account ID', () => {
		Liferay.CommerceContext.account = undefined;

		mockFetch(undefined);

		const {result} = renderHook(() => useProjectEnvironments());

		expect(vi.mocked(useFetch).mock.calls[0][0]).toBeNull();
		expect(result.current.environments).toEqual([]);
	});

	it('filters by the account and sorts by offering', () => {
		Liferay.CommerceContext.account = {accountId: 12, accountName: 'Acme'};

		mockFetch(undefined);

		renderHook(() => useProjectEnvironments());

		expect(useFetch).toHaveBeenCalledWith('/o/c/environments', {
			params: {
				filter: "r_accountEntryToEnvironment_accountEntryId eq '12'",
				pageSize: 200,
				sort: 'offering:asc',
			},
		});
	});

	it('defaults null fields to empty strings, maps the status, and stringifies the ID', () => {
		Liferay.CommerceContext.account = {accountId: 12, accountName: 'Acme'};

		mockFetch({
			items: [
				{
					activationStatus: 'active',
					externalReferenceCode: 'ENV-1',
					id: 99,
					name: 'Production',
					r_projectToEnvironment_c_projectERC: 'PRJCT-1',
				},
			],
		});

		const {result} = renderHook(() => useProjectEnvironments());

		expect(result.current.environments).toEqual([
			{
				activationCode: '',
				activationMode: '',
				adminEmailAddress: '',
				adminFirstName: '',
				adminLastName: '',
				aiHubURL: '',
				allowedEmailDomains: '',
				currentEntitlementHash: '',
				disasterRecoveryRegion: '',
				domains: '',
				externalReferenceCode: 'ENV-1',
				friendlyURL: '',
				githubUsername: '',
				hostName: '',
				id: '99',
				name: 'Production',
				offering: '',
				ownerEmailAddress: '',
				projectExternalReferenceCode: 'PRJCT-1',
				projectId: '',
				region: '',
				status: 'active',
				timeZone: '',
				tokenMonthlyAllowance: '',
				type: '',
				workspaceName: '',
			},
		]);
	});
});
