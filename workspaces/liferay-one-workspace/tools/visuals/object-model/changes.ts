/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the items of the object model that a comparison can find added,
 * changed, or removed: each object, each of its fields, each relationship and
 * soft link, and each picklist. An object and a picklist keep their external
 * reference code, and a relationship its ID, across refs, so the keys use
 * them. A field is keyed by its object and its name, because a field has no
 * code of its own. The value of an object holds its fields and its actions,
 * so a changed field also marks its object changed. The domain of an object
 * is a choice of layout in config.json, not part of the model, so it does not
 * count as a change.
 */

import type {IChangeItem} from '../lib.ts';

interface IObjectModel {
	edges: {
		from: string;
		id: string;
		kind: string;
		name: string;
		to: string;
	}[];
	nodes: Record<
		string,
		{
			domain: string;
			erc: string;
			fields: {name: string}[];
			label: string;
		}
	>;
	picklists: {erc: string}[];
}

export function changeItems(data: IObjectModel): IChangeItem[] {
	return [
		...Object.values(data.nodes).flatMap((node) => {
			return [
				{
					key: `object:${node.erc}`,
					kind: 'objects',
					label: node.label,
					value: Object.fromEntries(
						Object.entries(node).filter(
							([field]) => field !== 'domain'
						)
					),
				},
				...node.fields.map((field) => ({
					key: `field:${node.erc}.${field.name}`,
					kind: 'fields',
					label: `${node.label}.${field.name}`,
					value: field,
				})),
			];
		}),
		...data.edges.map((edge) => ({
			key: `relationship:${edge.id}`,
			kind: edge.kind === 'soft' ? 'soft links' : 'relationships',
			label: edge.name,
			value: edge,
		})),
		...data.picklists.map((picklist) => ({
			key: `picklist:${picklist.erc}`,
			kind: 'picklists',
			label: picklist.erc,
			value: picklist,
		})),
	];
}
