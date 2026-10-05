/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {Liferay} from '~/services/liferay/liferay';

import {useHasProject} from './useHasProject';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

const mockedUseFetch = vi.mocked(useFetch);

function mockFetch(data: unknown, isLoading = false) {
	mockedUseFetch.mockReturnValue({
		data,
		isLoading,
	} as unknown as ReturnType<typeof useFetch>);
}

function setAccountId(accountId?: number) {
	(Liferay as unknown as {CommerceContext: unknown}).CommerceContext =
		accountId ? {account: {accountId}} : {};
}

describe('[HOOK-MYACCOUNT-PROJECTS-USEHASPROJECT] useHasProject', () => {
	beforeEach(() => {
		mockedUseFetch.mockReset();
		setAccountId(10);
	});

	afterEach(() => {
		setAccountId();
	});

	it('is true when the account has at least one project', () => {
		mockFetch({totalCount: 2});

		const {result} = renderHook(() => useHasProject());

		expect(result.current).toEqual({hasProject: true, loading: false});
		expect(mockedUseFetch).toHaveBeenCalledWith('/o/c/projects', {
			params: {
				fields: 'id',
				filter: "r_accountEntryToProject_accountEntryId eq '10'",
				pageSize: 1,
			},
		});
	});

	it('is false when the project count is zero', () => {
		mockFetch({totalCount: 0});

		const {result} = renderHook(() => useHasProject());

		expect(result.current.hasProject).toBe(false);
	});

	it('is false while there is no data', () => {
		mockFetch(undefined, true);

		const {result} = renderHook(() => useHasProject());

		expect(result.current).toEqual({hasProject: false, loading: true});
	});

	it('sends no request without an account ID', () => {
		setAccountId();
		mockFetch(undefined);

		renderHook(() => useHasProject());

		expect(mockedUseFetch.mock.calls[0][0]).toBeNull();
	});
});
