/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {Liferay} from '~/services/liferay/liferay';

import {useDXPConnections} from './useDXPConnections';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {
			account: {accountId: 100, accountName: 'Account'},
		},
	},
}));

const mockedUseFetch = vi.mocked(useFetch);

const creator = {
	additionalName: '',
	contentType: 'UserAccount',
	externalReferenceCode: 'USER-1',
	familyName: 'Doe',
	givenName: 'Jane',
	id: 1,
	image: '',
	name: 'Jane Doe',
};

function mockFetch(result: Record<string, unknown>) {
	mockedUseFetch.mockReturnValue({
		isLoading: false,
		isValidating: false,
		revalidate: vi.fn(),
		...result,
	} as unknown as ReturnType<typeof useFetch>);
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEDXPCONNECTIONS] useDXPConnections', () => {
	beforeEach(() => {
		mockedUseFetch.mockReset();
		Liferay.CommerceContext.account = {
			accountId: 100,
			accountName: 'Account',
		};
	});

	it('requests the 20 newest connections of the current account', () => {
		mockFetch({data: {items: []}});

		renderHook(() => useDXPConnections());

		expect(mockedUseFetch.mock.calls[0][0]).toBe(
			'/o/c/oauth2dxpauthorizations'
		);
		expect(mockedUseFetch.mock.calls[0][1]).toEqual({
			params: {
				filter: "r_accountEntryToOAuth2DxpAuthorization_accountEntryId eq '100'",
				pageSize: 20,
				sort: 'dateCreated:desc',
			},
		});
	});

	it('skips the request without an account', () => {
		Liferay.CommerceContext.account = undefined;
		mockFetch({});

		const {result} = renderHook(() => useDXPConnections());

		expect(mockedUseFetch.mock.calls[0][0]).toBeNull();
		expect(result.current.connections).toEqual([]);
	});

	it('drops the connections whose creator no longer exists', () => {
		const connection = {
			connectionSource: 'https://dxp.example.com',
			creator,
			dateCreated: '2026-01-02T00:00:00Z',
		};

		mockFetch({
			data: {
				items: [
					connection,
					{
						connectionSource: 'https://orphan.example.com',
						dateCreated: '2026-01-01T00:00:00Z',
					},
				],
			},
		});

		const {result} = renderHook(() => useDXPConnections());

		expect(result.current.connections).toEqual([connection]);
	});

	it('returns the fetch error and no connections when the request fails', () => {
		const error = new Error('Forbidden');

		mockFetch({error});

		const {result} = renderHook(() => useDXPConnections());

		expect(result.current.connections).toEqual([]);
		expect(result.current.error).toBe(error);
	});
});
