/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {IFilterOption} from '~/components/Filter/Filter';
import {initialFilter} from '~/pages/BusinessEvents/utils/constants';

import useFilters from './useFilters';

const selectedFilters = [
	{key: 'eventStatus', name: 'event-status'},
] as IFilterOption[];

describe('[HOOK-BUSINESSEVENTS-USEFILTERS] useFilters', () => {
	it('starts with the initial filters, an empty search term, and no selection', () => {
		const {result} = renderHook(() => useFilters());

		expect(result.current.filters).toEqual({
			availableFilters: initialFilter,
			searchTerm: '',
			selectedFilters: [],
		});
	});

	it('updates only the selected filters on a filter change', () => {
		const {result} = renderHook(() => useFilters());

		act(() => result.current.handleSearchChange('launch'));
		act(() => result.current.handleFilterChange(selectedFilters));

		expect(result.current.filters).toEqual({
			availableFilters: initialFilter,
			searchTerm: 'launch',
			selectedFilters,
		});
	});

	it('updates only the search term on a search change', () => {
		const {result} = renderHook(() => useFilters());

		act(() => result.current.handleFilterChange(selectedFilters));
		act(() => result.current.handleSearchChange('launch'));

		expect(result.current.filters).toEqual({
			availableFilters: initialFilter,
			searchTerm: 'launch',
			selectedFilters,
		});
	});
});
