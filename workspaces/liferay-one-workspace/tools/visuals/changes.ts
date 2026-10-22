/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Compares the items of a visual at two refs. Each visual that can show a
 * change lists its items in <visual>/changes.ts, which exports
 * changeItems(data). The comparison matches the items by key, and an item
 * whose value differs is changed. A line number moves with every edit above
 * it, so the comparison leaves out every field named line, and the build
 * date, before it compares two values.
 */

import type {IChangeItem, IChanges} from './lib.ts';

const IGNORED_FIELDS = new Set(['generated', 'line', 'lines']);

export function compareItems(
	baseItems: IChangeItem[],
	headItems: IChangeItem[]
): IChanges {
	const base = new Map(baseItems.map((item) => [item.key, item]));
	const head = new Map(headItems.map((item) => [item.key, item]));

	const changes: IChanges = {
		counts: {added: 0, changed: 0, removed: 0},
		items: {},
		kinds: {},
		removed: [],
	};

	const count = (kind: string, status: keyof IChanges['counts']) => {
		changes.counts[status]++;

		changes.kinds[kind] ??= {added: 0, changed: 0, removed: 0};
		changes.kinds[kind][status]++;
	};

	for (const [key, item] of head) {
		const before = base.get(key);

		if (!before) {
			changes.items[key] = {
				kind: item.kind,
				layers: item.layers,
				status: 'added',
			};

			count(item.kind, 'added');

			continue;
		}

		const fields = _changedFields(item.value, before.value);

		if (fields.length) {
			changes.items[key] = {
				fields,
				kind: item.kind,
				layers: item.layers,
				status: 'changed',
			};

			count(item.kind, 'changed');
		}
	}

	for (const [key, item] of base) {
		if (!head.has(key)) {
			changes.removed.push({
				key,
				kind: item.kind,
				label: item.label,
				layers: item.layers,
			});

			count(item.kind, 'removed');
		}
	}

	return changes;
}

/**
 * Returns the changes of the items that a layer's tab shows, with their
 * counts.
 */
export function forLayer(changes: IChanges, layer: string): IChanges {
	const shows = (item: {layers?: string[]}) =>
		!item.layers || item.layers.includes(layer);

	const result: IChanges = {
		counts: {added: 0, changed: 0, removed: 0},
		items: {},
		kinds: {},
		removed: changes.removed.filter(shows),
	};

	const count = (kind: string, status: keyof IChanges['counts']) => {
		result.counts[status]++;

		result.kinds[kind] ??= {added: 0, changed: 0, removed: 0};
		result.kinds[kind][status]++;
	};

	for (const [key, item] of Object.entries(changes.items)) {
		if (shows(item)) {
			result.items[key] = item;

			count(item.kind, item.status);
		}
	}

	for (const item of result.removed) {
		count(item.kind, 'removed');
	}

	return result;
}

/**
 * Returns the top-level fields that differ between two values, or ["value"]
 * when the values are not objects and differ.
 */
function _changedFields(after: unknown, before: unknown): string[] {
	if (!_isObject(before) || !_isObject(after)) {
		return _same(before, after) ? [] : ['value'];
	}

	return [...new Set([...Object.keys(before), ...Object.keys(after)])]
		.filter((field) => !IGNORED_FIELDS.has(field))
		.filter((field) => !_same(before[field], after[field]))
		.sort();
}

function _isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function _normalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(_normalize);
	}

	if (_isObject(value)) {
		return Object.fromEntries(
			Object.keys(value)
				.filter((key) => !IGNORED_FIELDS.has(key))
				.sort()
				.map((key) => [key, _normalize(value[key])])
		);
	}

	return value;
}

function _same(a: unknown, b: unknown): boolean {
	return JSON.stringify(_normalize(a)) === JSON.stringify(_normalize(b));
}
