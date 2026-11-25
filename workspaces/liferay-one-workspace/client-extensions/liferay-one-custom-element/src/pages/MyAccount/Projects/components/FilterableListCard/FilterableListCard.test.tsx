/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {beforeEach, describe, expect, it} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import FilterableListCard, {
	ListColumn,
	ListFilter,
	RESET_LIST_STATE,
} from './FilterableListCard';

type Item = {
	group: string;
	id: string;
	name: string;
};

const COLUMNS: ListColumn<Item>[] = [
	{
		heading: 'name',
		key: 'name',
		render: (item) => <span>{item.name}</span>,
		sortValue: (item) => item.name,
	},
];

const FILTERS: ListFilter<Item>[] = [
	{
		key: 'group',
		label: 'type',
		matches: (item, values) => values.includes(item.group),
		options: [
			{label: 'Even', value: 'even'},
			{label: 'Odd', value: 'odd'},
		],
	},
];

const ITEMS: Item[] = Array.from({length: 45}, (_, index) => ({
	group: index % 2 ? 'even' : 'odd',
	id: String(index + 1),
	name: `Item ${String(index + 1).padStart(2, '0')}`,
}));

function getFirstItemName() {
	return screen.getAllByText(/^Item \d{2}$/)[0].textContent;
}

function getLocationSearch() {
	return new URLSearchParams(
		screen.getByTestId('location-search').textContent ?? ''
	);
}

function LocationSearch() {
	const {search} = useLocation();

	return <output data-testid="location-search">{search}</output>;
}

type RenderListOptions = {
	filters?: ListFilter<Item>[];
	initialEntry?: string | {pathname: string; state: unknown};
	loading?: boolean;
	persistKey?: string;
};

function renderList({
	filters = FILTERS,
	initialEntry = '/list',
	loading = false,
	persistKey,
}: RenderListOptions = {}) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route
					element={
						<>
							<FilterableListCard
								columns={COLUMNS}
								emptyLabel="no-results-found"
								filters={filters}
								items={ITEMS}
								loading={loading}
								matchesSearch={(item, search) =>
									item.name.toLowerCase().includes(search)
								}
								persistKey={persistKey}
								rowKey={(item) => item.id}
							/>

							<LocationSearch />
						</>
					}
					path="/list"
				/>
			</Routes>
		</MemoryRouter>
	);
}

function renderSavedList(options: Omit<RenderListOptions, 'persistKey'> = {}) {
	return renderList({...options, persistKey: 'test'});
}

function reopenList(options: Omit<RenderListOptions, 'persistKey'> = {}) {
	cleanup();

	return renderSavedList(options);
}

Liferay.Util.SessionStorage = sessionStorage;

describe('FilterableListCard', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	describe('pagination and sort in the URL', () => {
		it('applies the page and the page size of the URL', () => {
			renderList({initialEntry: '/list?page=2&pageSize=20'});

			expect(
				screen.getByText('Showing 21 to 40 of 45')
			).toBeInTheDocument();
		});

		it('applies the sort of the URL', () => {
			renderList({initialEntry: '/list?sort=name:desc'});

			expect(getFirstItemName()).toBe('Item 45');
		});

		it('ignores the values of the URL that are not valid', () => {
			renderList({
				initialEntry: '/list?page=abc&pageSize=7&sort=unknown:asc',
			});

			expect(
				screen.getByText('Showing 1 to 10 of 45')
			).toBeInTheDocument();
			expect(getFirstItemName()).toBe('Item 01');
		});

		it('shows the last page when the page of the URL is past it', () => {
			renderList({initialEntry: '/list?page=9'});

			expect(
				screen.getByText('Showing 41 to 45 of 45')
			).toBeInTheDocument();
		});

		it('writes the page to the URL', async () => {
			const user = userEvent.setup();

			renderList();

			await user.click(screen.getByLabelText('Go to page, 2'));

			expect(getLocationSearch().get('page')).toBe('2');
			expect(
				screen.getByText('Showing 11 to 20 of 45')
			).toBeInTheDocument();
		});

		it('writes the page size to the URL and goes back to the first page', async () => {
			const user = userEvent.setup();

			renderList({initialEntry: '/list?page=3'});

			await user.click(
				screen.getByRole('combobox', {name: 'Items Per Page'})
			);
			await user.click(screen.getByRole('option', {name: '20 Items'}));

			const searchParams = getLocationSearch();

			expect(searchParams.get('page')).toBeNull();
			expect(searchParams.get('pageSize')).toBe('20');
		});

		it('writes the sort to the URL and reverses it on a second click', async () => {
			const user = userEvent.setup();

			renderList({initialEntry: '/list?page=2'});

			await user.click(screen.getByRole('button', {name: 'Name'}));

			const searchParams = getLocationSearch();

			expect(searchParams.get('page')).toBeNull();
			expect(searchParams.get('sort')).toBe('name:asc');

			await user.click(screen.getByRole('button', {name: 'Name'}));

			expect(getLocationSearch().get('sort')).toBe('name:desc');
			expect(getFirstItemName()).toBe('Item 45');
		});

		it('goes back to the first page when the search changes', async () => {
			const user = userEvent.setup();

			renderList({initialEntry: '/list?page=2'});

			await user.type(screen.getByPlaceholderText('Search'), 'item');

			const searchParams = getLocationSearch();

			expect(searchParams.get('page')).toBeNull();
			expect(searchParams.get('search')).toBe('item');
		});
	});

	describe('saved state', () => {
		it('restores the saved state when the URL has no query', () => {
			renderSavedList({
				initialEntry:
					'/list?group=even&page=2&pageSize=20&sort=name:desc',
			});

			reopenList();

			const searchParams = getLocationSearch();

			expect(searchParams.get('group')).toBe('even');
			expect(searchParams.get('page')).toBe('2');
			expect(searchParams.get('pageSize')).toBe('20');
			expect(searchParams.get('sort')).toBe('name:desc');
			expect(
				screen.getByText('Showing 21 to 22 of 22')
			).toBeInTheDocument();
		});

		it('restores the saved search into the search field', () => {
			renderSavedList({initialEntry: '/list?search=item%2001'});

			reopenList();

			expect(screen.getByPlaceholderText('Search')).toHaveValue(
				'item 01'
			);
		});

		it('does not restore the saved state when the URL has a query', () => {
			renderSavedList({initialEntry: '/list?pageSize=20'});

			reopenList({initialEntry: '/list?group=odd'});

			const searchParams = getLocationSearch();

			expect(searchParams.get('group')).toBe('odd');
			expect(searchParams.get('pageSize')).toBeNull();
		});

		it('does not save the parameters that the list does not own', () => {
			renderSavedList({initialEntry: '/list?new=KEY-1&pageSize=20'});

			reopenList();

			const searchParams = getLocationSearch();

			expect(searchParams.get('new')).toBeNull();
			expect(searchParams.get('pageSize')).toBe('20');
		});

		it('keeps the saved state when the list opens with only other parameters', () => {
			renderSavedList({initialEntry: '/list?pageSize=20'});

			reopenList({initialEntry: '/list?new=KEY-1'});

			reopenList();

			expect(getLocationSearch().get('pageSize')).toBe('20');
		});

		it('saves and applies a filter that has no options yet', async () => {
			const user = userEvent.setup();

			const filters = [{...FILTERS[0], options: []}];

			renderSavedList({
				filters,
				initialEntry: '/list?group=even',
			});

			expect(
				screen.getByText('Showing 1 to 10 of 22')
			).toBeInTheDocument();

			await user.click(screen.getByRole('button', {name: 'Filter'}));

			expect(screen.queryByText('Type')).toBeNull();

			reopenList({filters});

			expect(getLocationSearch().get('group')).toBe('even');
		});

		it('skips the restore and clears the saved state when the list opens with the reset state', () => {
			renderSavedList({initialEntry: '/list?pageSize=20'});

			reopenList({
				initialEntry: {pathname: '/list', state: RESET_LIST_STATE},
			});

			expect(getLocationSearch().toString()).toBe('');

			reopenList();

			expect(getLocationSearch().toString()).toBe('');
		});

		it('clears the saved state when the user removes the last filter', async () => {
			const user = userEvent.setup();

			renderSavedList({initialEntry: '/list?group=even'});

			await user.click(
				within(screen.getByText('Even')).getByRole('button')
			);

			reopenList();

			expect(getLocationSearch().toString()).toBe('');
		});

		it('does not save the state while the list loads', () => {
			renderSavedList({
				initialEntry: '/list?pageSize=20',
				loading: true,
			});

			reopenList();

			expect(getLocationSearch().toString()).toBe('');
		});

		it('saves a change that the user makes while the list loads', async () => {
			const user = userEvent.setup();

			renderSavedList({loading: true});

			await user.type(screen.getByPlaceholderText('Search'), 'item');

			reopenList();

			expect(getLocationSearch().get('search')).toBe('item');
		});

		it('does not save the state of a list that has no persist key', () => {
			renderList({initialEntry: '/list?pageSize=20'});

			reopenList();

			expect(getLocationSearch().toString()).toBe('');
		});
	});
});
