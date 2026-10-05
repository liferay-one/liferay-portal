/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import useSWR from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useFetch} from './useFetch';

vi.mock('swr', () => ({
	default: vi.fn(),
}));

const mutate = vi.fn();

function getKey() {
	return vi.mocked(useSWR).mock.calls[0][0];
}

describe('[HOOK-USEFETCH] useFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useSWR).mockReturnValue({
			data: {id: 1},
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate,
		} as unknown as ReturnType<typeof useSWR>);
	});

	it('sends no request for a null url', () => {
		renderHook(() => useFetch(null, {params: {page: 1}}));

		expect(getKey()).toBeNull();
	});

	it('keeps a url without params unchanged', () => {
		renderHook(() => useFetch('/o/c/projects'));

		expect(getKey()).toBe('/o/c/projects');
	});

	it('drops falsy param values', () => {
		renderHook(() =>
			useFetch('/o/c/projects', {
				params: {filter: '', page: 0, pageSize: 20, sort: undefined},
			})
		);

		expect(getKey()).toBe('/o/c/projects?pageSize=20');
	});

	it('merges customParams into the params', () => {
		renderHook(() =>
			useFetch('/o/c/projects', {
				params: {customParams: {accountId: 5}, page: 2},
			})
		);

		expect(getKey()).toBe('/o/c/projects?page=2&accountId=5');
	});

	it('keeps the params already in the url', () => {
		renderHook(() =>
			useFetch('/o/c/projects?fields=id&page=1', {params: {page: 3}})
		);

		expect(getKey()).toBe('/o/c/projects?fields=id&page=3');
	});

	it('passes the refresh interval to SWR', () => {
		renderHook(() => useFetch('/o/c/projects', undefined, 60000));

		expect(vi.mocked(useSWR).mock.calls[0][1]).toEqual({
			refreshInterval: 60000,
		});
	});

	it('revalidates by re-running mutate', () => {
		const {result} = renderHook(() => useFetch('/o/c/projects'));

		result.current.revalidate();

		expect(mutate).toHaveBeenCalledWith(expect.any(Function), {
			revalidate: true,
		});

		const [updater] = mutate.mock.calls[0];

		expect(updater({id: 2})).toEqual({id: 2});
		expect(result.current.data).toEqual({id: 1});
	});
});
