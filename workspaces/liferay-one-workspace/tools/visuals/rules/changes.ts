/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the rules and their matches for a comparison. A match moves with
 * every edit above it, so it is keyed by its rule, its file, and its code
 * with the spaces collapsed. A second match of the same code in the same file
 * gets its number after a \u0001, a character that no code holds. A rule
 * changes when its text or its set of matches changes. The rules visual shows
 * in a tab of each layer, so each item names its layers, and the change bar
 * of each tab counts only the items of its layer.
 */

import type {IChangeItem} from '../lib.ts';

interface IHit {
	file: string;
	layer: string;
	text: string;
}

interface IRule {
	description: string;
	hits: IHit[];
	id: string;
	layers: string[];
	severity: string;
	title: string;
}

const LAYER_KINDS: Record<string, string> = {
	controller: 'sidecar rule matches',
	model: 'batch file rule matches',
	view: 'custom element rule matches',
};

export function changeItems(data: {rules: IRule[]}): IChangeItem[] {
	return data.rules.flatMap((rule) => {
		const keys = hitKeys(rule);

		return [
			{
				key: `rule:${rule.id}`,
				kind: 'rules',
				label: rule.title,
				layers: rule.layers,
				value: {
					description: rule.description,
					hits: [...keys].sort(),
					layers: rule.layers,
					severity: rule.severity,
					title: rule.title,
				},
			},
			...rule.hits.map((hit, index) => ({
				key: keys[index],
				kind: LAYER_KINDS[hit.layer] ?? `${hit.layer} rule matches`,
				label: `${rule.title}: ${hit.file.split('/').pop()} ${_normalize(hit.text)}`,
				layers: [hit.layer],
				value: hit.layer,
			})),
		];
	});
}

/**
 * Returns the key of each match of a rule, in the order of its matches. The
 * template builds the same keys from the same order.
 */
export function hitKeys(rule: IRule): string[] {
	const seen = new Map<string, number>();

	return rule.hits.map((hit) => {
		const key = `hit:${rule.id}|${hit.file}|${_normalize(hit.text)}`;

		const count = (seen.get(key) ?? 0) + 1;

		seen.set(key, count);

		return count > 1 ? `${key}\u0001${count}` : key;
	});
}

function _normalize(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
