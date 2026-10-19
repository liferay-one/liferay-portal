/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads what a visitor sees: every page that the site initializer creates,
 * with who can view it, its master page, its fragments, and the custom
 * element route groups placed on it; the navigation menus; and the fragment
 * collections. It reuses the APIs extractor for the routes and the caller
 * check of each endpoint that a route calls.
 */

import * as fs from 'fs';
import * as path from 'path';

import {SITE_INITIALIZER_DIR, listFiles, readJSON, relative} from '../lib.ts';
import {extract as extractAPIs} from '../apis/extract.ts';

interface IPage {
	dir: string;
	fragments: string[];
	guest: boolean;
	hidden: boolean;
	master: null | string;
	menus: string[];
	name: string;
	private: boolean;
	routes: string[];
	signInCalls: string[];
	type: string;
	url: string;
	view: null | string[];
}

const LAYOUTS_DIR = path.join(SITE_INITIALIZER_DIR, 'layouts');

export function extract() {
	const apis = extractAPIs().data as any;

	const endpointsByKey = new Map<string, any>(
		apis.endpoints.map((endpoint: any) => [endpoint.key, endpoint])
	);

	const menus = _menus();

	const pages: IPage[] = listFiles(LAYOUTS_DIR, (file) =>
		file.endsWith('page.json')
	)
		.map((file) => {
			const page = readJSON(file);
			const definitionFile = path.join(
				path.dirname(file),
				'page-definition.json'
			);
			const definition = fs.existsSync(definitionFile)
				? fs.readFileSync(definitionFile, 'utf8')
				: '';

			// A public page with no permissions in page.json gets Liferay's
			// default, which lets Guest view it.

			const view = page.permissions
				? page.permissions
						.filter((permission: any) =>
							permission.actionIds?.includes('VIEW')
						)
						.map((permission: any) => permission.roleName)
				: null;

			const routes = [
				...new Set(
					[...definition.matchAll(/route=([a-z0-9-]+)/g)].map(
						(match) => match[1]
					)
				),
			];

			const guest =
				!page.private && (view === null || view.includes('Guest'));

			const signInCalls = guest
				? ([
						...new Set(
							apis.routes
								.filter((route: any) =>
									routes.includes(route.group)
								)
								.flatMap((route: any) =>
									route.calls.map(
										(id: number) => apis.calls[id]
									)
								)
								.map((call: any) =>
									endpointsByKey.get(call.endpoint)
								)
								.filter(
									(endpoint: any) =>
										endpoint?.kind === 'sidecar' &&
										endpoint.category !== 'objectAction' &&
										endpoint.auth.kind !== 'none'
								)
								.map((endpoint: any) => endpoint.key)
						),
					].sort() as string[])
				: [];

			return {
				dir: relative(path.dirname(file)),
				fragments: [
					...new Set(
						[...definition.matchAll(/"key":\s*"([\w-]+)"/g)].map(
							(match) => match[1]
						)
					),
				].sort(),
				guest,
				hidden: Boolean(page.hidden),
				master:
					/"masterPage":\s*\{\s*"key":\s*"([\w-]+)"/.exec(
						definition
					)?.[1] ?? null,
				menus: menus
					.filter((menu) =>
						menu.items.some((item) => item.url === page.friendlyURL)
					)
					.map((menu) => menu.name),
				name: page.name,
				private: Boolean(page.private),
				routes,
				signInCalls,
				type: page.type,
				url: page.friendlyURL ?? '',
				view,
			};
		})
		.sort((a, b) => a.url.localeCompare(b.url));

	const urls = new Set(pages.map((page) => page.url));

	const pageNames = new Map(pages.map((page) => [page.url, page.name]));

	for (const menu of menus) {
		for (const item of menu.items) {

			// An item with no name of its own shows its page's name, the route
			// after # for a custom element route, or the host of an external
			// link.

			const pageName = pageNames.get(
				item.url.split(/[?#]/)[0].replace(/\/$/, '')
			);
			const route = /#\/?(.+)$/.exec(item.url)?.[1];

			item.label =
				item.label ||
				(pageName && route ? `${pageName} › ${route}` : pageName) ||
				(/^https?:\/\//.test(item.url)
					? new URL(item.url).host
					: item.url);
			item.resolves =
				!item.url?.startsWith('/') ||
				urls.has(item.url.split(/[?#]/)[0].replace(/\/$/, '') || '/');
		}
	}

	const fragments = _fragments(pages);

	const placed = new Set(pages.flatMap((page) => page.routes));

	const masterRoutes = listFiles(
		path.join(SITE_INITIALIZER_DIR, 'layout-page-templates'),
		(file) => file.endsWith('page-definition.json')
	).flatMap((file) =>
		[...fs.readFileSync(file, 'utf8').matchAll(/route=([a-z0-9-]+)/g)].map(
			(match) => match[1]
		)
	);

	for (const route of masterRoutes) {
		placed.add(route);
	}

	const groups = apis.groups
		.filter((group: any) => group.id !== 'app-shell')
		.map((group: any) => ({
			id: group.id,
			placed: placed.has(group.id),
			routes: apis.routes.filter((route: any) => route.group === group.id)
				.length,
		}));

	return {
		actions: [
			...groups
				.filter((group: any) => !group.placed)
				.map((group: any) => ({
					anchor: 'groups-section',
					detail: `The custom element defines ${group.routes} route(s) in the ${group.id} group, and no page or master page places it with route=${group.id}. Place it, or remove the routes.`,
					item: group.id,
					severity: 'medium' as const,
					source: group.id,
					title: `Route group ${group.id} is on no page`,
				})),
			...menus.flatMap((menu) =>
				menu.items
					.filter((item) => !item.resolves)
					.map((item) => ({
						anchor: 'menus-section',
						detail: `The ${menu.name} menu links to ${item.url}, and the site initializer creates no page with that friendly URL. The site initializer skips the item with a warning.`,
						item: item.url,
						severity: 'medium' as const,
						source: 'site-navigation-menus.json',
						title: `Menu item ${item.url} has no page`,
					}))
			),
			...fragments
				.filter((fragment) => !fragment.usedBy.length)
				.map((fragment) => ({
					anchor: 'fragments-section',
					detail: `No page, master page, or template places the fragment ${fragment.key} of the ${fragment.collection} collection. Remove it, or place it.`,
					item: fragment.key,
					severity: 'low' as const,
					source: fragment.dir,
					title: `Fragment ${fragment.key} is unused`,
				})),
			...pages
				.filter((page) => page.signInCalls.length)
				.map((page) => ({
					anchor: 'pages-section',
					detail: `Guest can view ${page.url}, and its routes call ${page.signInCalls.length} sidecar endpoint(s) that need a signed-in user, such as ${page.signInCalls.slice(0, 3).join(', ')}. Confirm that the page asks a visitor to sign in instead of rendering empty.`,
					item: page.url,
					severity: 'low' as const,
					source: page.dir,
					title: `Signed-out visitors can open ${page.url}`,
				})),
		],
		data: {
			fragments,
			generated: new Date().toISOString().slice(0, 10),
			groups,
			menus,
			pages,
		},
		problems: [],
	};
}

function _fragments(pages: IPage[]) {
	const fragmentsDir = path.join(SITE_INITIALIZER_DIR, 'fragments/group');

	if (!fs.existsSync(fragmentsDir)) {
		return [];
	}

	const definitions = listFiles(SITE_INITIALIZER_DIR, (file) =>
		file.endsWith('page-definition.json')
	).map((file) => ({file, text: fs.readFileSync(file, 'utf8')}));

	return fs
		.readdirSync(fragmentsDir)
		.flatMap((collection) => {
			const dir = path.join(fragmentsDir, collection, 'fragments');

			return fs.existsSync(dir)
				? fs.readdirSync(dir).map((key) => ({
						collection,
						dir: relative(path.join(dir, key)),
						key,
					}))
				: [];
		})
		.map((fragment) => ({
			...fragment,
			usedBy: [
				...pages
					.filter((page) => page.fragments.includes(fragment.key))
					.map((page) => page.url),
				...definitions
					.filter(
						(definition) =>
							!definition.file.startsWith(LAYOUTS_DIR) &&
							new RegExp(`"key":\\s*"${fragment.key}"`).test(
								definition.text
							)
					)
					.map((definition) =>
						relative(path.dirname(definition.file))
							.split('/')
							.slice(-2)
							.join('/')
					),
			],
		}))
		.sort(
			(a, b) =>
				a.collection.localeCompare(b.collection) ||
				a.key.localeCompare(b.key)
		);
}

function _menus(): {
	items: {depth: number; label: string; resolves?: boolean; url: string}[];
	name: string;
}[] {
	const file = path.join(SITE_INITIALIZER_DIR, 'site-navigation-menus.json');

	if (!fs.existsSync(file)) {
		return [];
	}

	const flatten = (items: any[], depth = 0): any[] =>
		items.flatMap((item) => [
			{...item, depth},
			...flatten(item.menuItems ?? [], depth + 1),
		]);

	return readJSON<any[]>(file).map((menu) => ({
		items: flatten(menu.menuItems ?? []).map((item) => ({
			depth: item.depth,
			label: item.name ?? item.title ?? '',
			url: item.friendlyURL ?? item.url ?? '',
		})),
		name: menu.name,
	}));
}
