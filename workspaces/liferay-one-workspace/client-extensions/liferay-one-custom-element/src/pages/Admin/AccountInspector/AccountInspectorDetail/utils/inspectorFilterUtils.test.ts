/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	EMPTY_FILTER,
	filterAccountTree,
	filterInspectedEntries,
	formatInspectedValue,
	getFilterOptions,
	getTreeKeys,
	isFilterActive,
	toggleFilterValue,
} from './inspectorFilterUtils';

import type {AccountTreeNode} from '~/types/accountInspection';

import type {InspectedCollectionColumn} from './inspectedCollectionConstants';

const COLUMNS: InspectedCollectionColumn[] = [
	{label: 'name', value: (entry) => entry.name},
	{label: 'status', value: (entry) => entry.status},
];

const ENTRIES = [
	{externalReferenceCode: 'PRJCT-001', id: 1, name: 'Omni', status: 'open'},
	{externalReferenceCode: 'PRJCT-002', id: 2, name: 'Beta', status: 'closed'},
	{id: 3, name: 'Gamma', status: {label: 'Open Later'}},
];

function filter(
	search: string,
	values: Record<string, string[]> = {},
	flaggedOnly = false
) {
	return filterInspectedEntries(
		ENTRIES,
		COLUMNS,
		{flaggedOnly, search, values},
		new Set([2, 3]),
		100
	).map(({id}) => id);
}

function node(
	key: string,
	children: AccountTreeNode[] = [],
	severity?: AccountTreeNode['severity']
): AccountTreeNode {
	return {children, key, label: key, severity};
}

const TREE = [
	node('Users', [node('Alice'), node('Bob', [], 'warning')], 'warning'),
	node('Main Project', [node('Contract C-1', [node('DXP')])]),
];

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-INSPECTORFILTERUTILS] inspectorFilterUtils', () => {
	it('formats empty values, booleans, and objects by their label', () => {
		expect(formatInspectedValue('')).toBe('-');
		expect(formatInspectedValue(null)).toBe('-');
		expect(formatInspectedValue(true)).toBe('Yes');
		expect(formatInspectedValue(['a', 'b'])).toBe('a, b');
		expect(formatInspectedValue([])).toBe('-');
		expect(formatInspectedValue({key: 'open', label: 'Open'})).toBe('Open');
	});

	it('searches every column, the ID, and the ERC, ignoring case', () => {
		expect(filter('')).toEqual([1, 2, 3]);
		expect(filter('OPEN')).toEqual([1, 3]);
		expect(filter('prjct-002')).toEqual([2]);
		expect(filter('3')).toEqual([3]);
	});

	it('keeps only records whose column value is one of the chosen values', () => {
		expect(filter('', {status: ['closed']})).toEqual([2]);
		expect(filter('', {status: ['closed', 'open']})).toEqual([1, 2]);
		expect(filter('o', {status: ['open']})).toEqual([1]);
		expect(filter('', {status: []})).toEqual([1, 2, 3]);
	});

	it('offers a column as a filter only when its values repeat and number 2 to 10', () => {
		const entries = [
			{id: 1, name: 'A', status: 'open'},
			{id: 2, name: 'B', status: 'open'},
			{id: 3, name: 'C', status: 'closed'},
		];

		expect(getFilterOptions(entries, COLUMNS, 100)).toEqual([
			{label: 'status', values: ['closed', 'open']},
		]);
	});

	it('toggles a value on and off in a filter', () => {
		const once = toggleFilterValue(EMPTY_FILTER, 'status', 'open');

		expect(once.values).toEqual({status: ['open']});
		expect(toggleFilterValue(once, 'status', 'open').values).toEqual({
			status: [],
		});
	});

	it('keeps only flagged records when flagged only is on', () => {
		expect(filter('', {}, true)).toEqual([2, 3]);
		expect(filter('open', {}, true)).toEqual([3]);
	});

	it('keeps tree matches with their ancestors, and a matching node keeps its children', () => {
		expect(
			getTreeKeys(
				filterAccountTree(TREE, {...EMPTY_FILTER, search: 'dxp'})
			)
		).toEqual(['Main Project', 'Contract C-1', 'DXP']);
		expect(
			getTreeKeys(
				filterAccountTree(TREE, {...EMPTY_FILTER, search: 'main'})
			)
		).toEqual(['Main Project', 'Contract C-1', 'DXP']);
	});

	it('keeps only flagged branches when flagged only is on', () => {
		expect(
			getTreeKeys(
				filterAccountTree(TREE, {...EMPTY_FILTER, flaggedOnly: true})
			)
		).toEqual(['Users', 'Bob']);
	});

	it('is active with a search, flagged only, or a chosen value, but not with spaces alone', () => {
		expect(isFilterActive({...EMPTY_FILTER, search: '  '})).toBe(false);
		expect(isFilterActive({...EMPTY_FILTER, flaggedOnly: true})).toBe(true);
		expect(isFilterActive({...EMPTY_FILTER, search: 'a'})).toBe(true);
		expect(
			isFilterActive({...EMPTY_FILTER, values: {status: ['open']}})
		).toBe(true);
	});

	it('treats an info finding as flagged in the tree, like the tables do', () => {
		expect(
			getTreeKeys(
				filterAccountTree(
					[node('Orders', [node('#50', [], 'info')], 'info')],
					{
						...EMPTY_FILTER,
						flaggedOnly: true,
					}
				)
			)
		).toEqual(['Orders', '#50']);
	});
});
