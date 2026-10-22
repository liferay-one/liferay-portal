/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the items of the pages visual that a comparison can mark: the pages,
 * keyed by layout set and friendly URL, because a public and a private page
 * can share a URL, the fragments, keyed by collection and key, the
 * menus, keyed by name, and the custom element route groups, keyed by ID.
 * A page directory carries an order prefix that a reorder changes, so the
 * key and the value leave the directory out. The hash of a page or a
 * fragment changes when its source files do.
 */

import type {IChangeItem} from '../lib.ts';

export function changeItems(data: any): IChangeItem[] {
	return [
		...data.pages.map(({dir, ...page}: any) => ({
			key: `page:${page.private ? 'private' : 'public'}:${page.url || dir}`,
			kind: 'pages',
			label: page.url || page.name,
			value: page,
		})),
		...data.fragments.map((fragment: any) => ({
			key: `fragment:${fragment.collection}/${fragment.key}`,
			kind: 'fragments',
			label: fragment.key,
			value: {...fragment, dir: undefined},
		})),
		...data.menus.map((menu: any) => ({
			key: `menu:${menu.name}`,
			kind: 'menus',
			label: menu.name,
			value: menu.items,
		})),
		...data.groups.map((group: any) => ({
			key: `group:${group.id}`,
			kind: 'route groups',
			label: group.id,
			value: group,
		})),
	];
}
