/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';

import {useLiferayBundles} from './useLiferayBundles';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

function mockFetch(result: Record<string, unknown>) {
	vi.mocked(useFetch).mockReturnValue(
		result as unknown as ReturnType<typeof useFetch>
	);
}

describe('[HOOK-USELIFERAYBUNDLES] useLiferayBundles', () => {
	beforeEach(() => {
		vi.mocked(useFetch).mockReset();
	});

	it('maps the bundle nodes to ID, link, and name', () => {
		mockFetch({
			data: {
				items: [
					{
						bundleLink: 'https://example.com/a.zip',
						bundleName: 'Bundle A',
						externalReferenceCode: 'BUNDLE-A',
					},
					{bundleName: 'Bundle B', externalReferenceCode: 'BUNDLE-B'},
				],
			},
			error: undefined,
			isLoading: false,
		});

		const {result} = renderHook(() => useLiferayBundles());

		expect(result.current).toEqual({
			bundles: [
				{
					id: 'BUNDLE-A',
					link: 'https://example.com/a.zip',
					name: 'Bundle A',
				},
				{id: 'BUNDLE-B', link: '', name: 'Bundle B'},
			],
			error: undefined,
			loading: false,
		});
		expect(useFetch).toHaveBeenCalledWith('/o/c/liferaybundles', {
			params: {pageSize: 200, sort: 'bundleName:asc'},
		});
	});

	it('returns an empty list without data', () => {
		const error = new Error('failed');

		mockFetch({data: undefined, error, isLoading: true});

		const {result} = renderHook(() => useLiferayBundles());

		expect(result.current).toEqual({bundles: [], error, loading: true});
	});
});
