/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import sortInspectorEntries from './sortInspectorEntries';

type Row = {count?: number; id: number; name?: string};

const ROWS: Row[] = [
	{count: 10, id: 1, name: 'beta'},
	{count: 2, id: 2, name: 'Alpha'},
	{count: 33, id: 3},
	{count: 2, id: 4, name: 'item 10'},
	{id: 5, name: 'item 9'},
];

const COUNT_COLUMN = {label: 'skus' as const, value: ({count}: Row) => count};

const NAME_COLUMN = {label: 'name' as const, value: ({name}: Row) => name};

function getIds(rows: Row[]) {
	return rows.map(({id}) => id);
}

describe('[MOD-ADMIN-PRODUCTINSPECTOR-SORTINSPECTORENTRIES] sortInspectorEntries', () => {
	it('sorts numbers by value in both directions', () => {
		expect(
			getIds(
				sortInspectorEntries(
					ROWS.filter(({count}) => count !== undefined),
					COUNT_COLUMN,
					'asc'
				)
			)
		).toEqual([2, 4, 1, 3]);

		expect(
			getIds(
				sortInspectorEntries(
					ROWS.filter(({count}) => count !== undefined),
					COUNT_COLUMN,
					'desc'
				)
			)
		).toEqual([3, 1, 2, 4]);
	});

	it('sorts text ignoring case, with numbers inside the text in numeric order', () => {
		expect(
			getIds(
				sortInspectorEntries(
					ROWS.filter(({name}) => name),
					NAME_COLUMN,
					'asc'
				)
			)
		).toEqual([2, 1, 5, 4]);
	});

	it('does not change the input array', () => {
		const rows = [...ROWS];

		sortInspectorEntries(rows, NAME_COLUMN, 'desc');

		expect(rows).toEqual(ROWS);
	});
});
