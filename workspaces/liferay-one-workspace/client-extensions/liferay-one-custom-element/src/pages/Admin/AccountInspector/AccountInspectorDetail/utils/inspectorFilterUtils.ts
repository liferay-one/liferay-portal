/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';

import type {AccountTreeNode, InspectedEntry} from '~/types/accountInspection';

import type {InspectedCollectionColumn} from './inspectedCollectionConstants';

export const EMPTY_VALUE = '-';

export const EMPTY_FILTER: InspectorFilter = {
	flaggedOnly: false,
	search: '',
	values: {},
};

const MAX_FILTER_OPTIONS = 10;

export type InspectorFilter = {
	flaggedOnly: boolean;
	search: string;
	values: Record<string, string[]>;
};

export type InspectorFilterOption = {
	label: InspectedCollectionColumn['label'];
	values: string[];
};

export function formatInspectedValue(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return EMPTY_VALUE;
	}

	if (Array.isArray(value)) {
		return value.length ? value.join(', ') : EMPTY_VALUE;
	}

	if (typeof value === 'boolean') {
		return i18n.translate(value ? 'yes' : 'no');
	}

	if (typeof value === 'object') {
		const {key, label, name} = value as Record<string, unknown>;

		return formatInspectedValue(
			label ?? name ?? key ?? JSON.stringify(value)
		);
	}

	return String(value);
}

function includesText(text: string, search: string) {
	return text.toLowerCase().includes(search.trim().toLowerCase());
}

export function getActiveValueCount({values}: InspectorFilter) {
	return Object.values(values).reduce(
		(count, selectedValues) => count + selectedValues.length,
		0
	);
}

export function isFilterActive(filter: InspectorFilter) {
	return (
		filter.flaggedOnly ||
		Boolean(filter.search.trim()) ||
		getActiveValueCount(filter) > 0
	);
}

export function getFilterOptions<Entry extends InspectedEntry>(
	entries: Entry[],
	columns: InspectedCollectionColumn<Entry>[],
	accountId: number
): InspectorFilterOption[] {
	return columns
		.filter(({label}) => label !== 'id')
		.map(({label, value}) => ({
			label,
			values: [
				...new Set(
					entries.map((entry) =>
						formatInspectedValue(value(entry, accountId))
					)
				),
			].sort(),
		}))
		.filter(
			({values}) =>
				values.length > 1 &&
				values.length <= MAX_FILTER_OPTIONS &&
				values.length < entries.length
		);
}

export function toggleFilterValue(
	filter: InspectorFilter,
	label: string,
	value: string
): InspectorFilter {
	const selectedValues = filter.values[label] ?? [];

	return {
		...filter,
		values: {
			...filter.values,
			[label]: selectedValues.includes(value)
				? selectedValues.filter(
						(selectedValue) => selectedValue !== value
					)
				: [...selectedValues, value],
		},
	};
}

export function filterInspectedEntries<Entry extends InspectedEntry>(
	entries: Entry[],
	columns: InspectedCollectionColumn<Entry>[],
	{flaggedOnly, search, values}: InspectorFilter,
	flaggedIds: Set<number | string>,
	accountId: number
) {
	const valueFilters = columns.filter(({label}) => values[label]?.length);

	return entries.filter((entry) => {
		if (flaggedOnly && !flaggedIds.has(entry.id)) {
			return false;
		}

		const matchesValues = valueFilters.every(({label, value}) =>
			values[label].includes(
				formatInspectedValue(value(entry, accountId))
			)
		);

		if (!matchesValues) {
			return false;
		}

		if (!search.trim()) {
			return true;
		}

		return [
			...columns.map(({value}) =>
				formatInspectedValue(value(entry, accountId))
			),
			String(entry.id),
			entry.externalReferenceCode ?? '',
		].some((text) => includesText(text, search));
	});
}

function isFlagged({severity}: AccountTreeNode) {
	return Boolean(severity);
}

function keepFlagged(nodes: AccountTreeNode[]): AccountTreeNode[] {
	return nodes.filter(isFlagged).map((node) => ({
		...node,
		children: keepFlagged(node.children),
	}));
}

function keepSearched(
	nodes: AccountTreeNode[],
	search: string
): AccountTreeNode[] {
	return nodes.flatMap((node) => {
		if (includesText(`${node.label} ${node.meta ?? ''}`, search)) {
			return [node];
		}

		const children = keepSearched(node.children, search);

		return children.length ? [{...node, children}] : [];
	});
}

export function filterAccountTree(
	nodes: AccountTreeNode[],
	{flaggedOnly, search}: InspectorFilter
) {
	const flaggedNodes = flaggedOnly ? keepFlagged(nodes) : nodes;

	return search.trim() ? keepSearched(flaggedNodes, search) : flaggedNodes;
}

export function getTreeKeys(nodes: AccountTreeNode[]): string[] {
	return nodes.flatMap(({children, key}) => [key, ...getTreeKeys(children)]);
}
