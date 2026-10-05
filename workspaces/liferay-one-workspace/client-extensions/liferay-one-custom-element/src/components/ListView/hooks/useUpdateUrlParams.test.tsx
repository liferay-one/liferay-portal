/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {ReactNode} from 'react';
import {MemoryRouter, useSearchParams} from 'react-router-dom';
import {describe, expect, it} from 'vitest';

import useUpdateUrlParams from './useUpdateUrlParams';

function renderWithSearch(search: string) {
	function wrapper({children}: {children: ReactNode}) {
		return (
			<MemoryRouter initialEntries={[`/list${search}`]}>
				{children}
			</MemoryRouter>
		);
	}

	return renderHook(
		() => ({
			searchParams: useSearchParams()[0],
			updateParams: useUpdateUrlParams(),
		}),
		{wrapper}
	);
}

function toObject(searchParams: URLSearchParams) {
	return Object.fromEntries(searchParams.entries());
}

describe('[HOOK-LISTVIEW-USEUPDATEURLPARAMS] useUpdateUrlParams', () => {
	it('preserves the parsed filter with its filter schema', () => {
		const filter = JSON.stringify({status: ['active']});

		const {result} = renderWithSearch(
			`?${new URLSearchParams({filter, filterSchema: 'orders', page: '3'})}`
		);

		act(() => result.current.updateParams({sort: 'name:asc'}));

		expect(toObject(result.current.searchParams)).toEqual({
			filter,
			filterSchema: 'orders',
			page: '3',
			sort: 'name:asc',
		});
	});

	it('resets the page to 1 when a page size is present', () => {
		const {result} = renderWithSearch('?page=4&pageSize=50');

		act(() => result.current.updateParams({}));

		expect(toObject(result.current.searchParams)).toEqual({
			page: '1',
			pageSize: '50',
		});
	});

	it('lets caller params override the existing params', () => {
		const {result} = renderWithSearch('?page=4&pageSize=50');

		act(() => result.current.updateParams({page: 2, pageSize: 10}));

		expect(toObject(result.current.searchParams)).toEqual({
			page: '2',
			pageSize: '10',
		});
	});

	it('handles a missing filter param without a crash', () => {
		const {result} = renderWithSearch('');

		act(() => result.current.updateParams({page: 1}));

		expect(toObject(result.current.searchParams)).toEqual({page: '1'});
	});
});
