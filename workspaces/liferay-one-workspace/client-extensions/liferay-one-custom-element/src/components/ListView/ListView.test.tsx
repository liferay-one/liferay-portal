/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {SWRConfig} from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import ListView, {ListViewProps} from './ListView';

const mocks = vi.hoisted(() => ({
	useFetch: vi.fn(),
}));

vi.mock('~/hooks/useFetch', () => ({
	useFetch: mocks.useFetch,
}));

type Row = {id: number; name: string};

function renderListView(props: Partial<ListViewProps<Row>>) {
	return render(
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			<MemoryRouter>
				<ListView<Row>
					id="list-view-test"
					initialContext={{pageSize: 5}}
					tableProps={{columns: [{id: 'name', name: 'Name'}]}}
					{...props}
				/>
			</MemoryRouter>
		</SWRConfig>
	);
}

describe('[COMPONENT-LISTVIEW] ListView', () => {
	beforeEach(() => {
		mocks.useFetch.mockReset();
		mocks.useFetch.mockReturnValue({
			data: {items: [{id: 1, name: 'Portal Row'}], totalCount: 1},
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});
	});

	it('reads the rows from the resource when no fetcher is given', async () => {
		renderListView({resource: 'o/resource'});

		expect(await screen.findByText('Portal Row')).toBeTruthy();

		expect(mocks.useFetch).toHaveBeenCalledWith(
			'o/resource',
			expect.anything(),
			undefined
		);
	});

	it('reads the rows from the fetcher and not from the resource when a fetcher is given', async () => {
		const fetcher = vi.fn().mockResolvedValue({
			items: [{id: 2, name: 'Fetcher Row'}],
			page: 1,
			pageSize: 5,
			totalCount: 1,
		});

		mocks.useFetch.mockReturnValue({
			data: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});

		renderListView({fetcher, resource: 'o/resource'});

		expect(await screen.findByText('Fetcher Row')).toBeTruthy();

		expect(mocks.useFetch).toHaveBeenCalledWith(
			null,
			expect.anything(),
			undefined
		);

		const params = fetcher.mock.calls[0][0] as URLSearchParams;

		expect(params.get('page')).toBe('1');
		expect(params.get('pageSize')).toBe('5');
	});
});
