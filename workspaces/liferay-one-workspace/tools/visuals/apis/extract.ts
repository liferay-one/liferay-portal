/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	CUSTOM_ELEMENT_DIR,
	SITE_INITIALIZER_DIR,
	SPRING_BOOT_DIR,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';
import {findCalls} from './calls.ts';
import {readEndpoints} from './java.ts';
import {ModuleGraph, lineOf} from './modules.ts';
import {RouteReader, joinPath} from './routes.ts';
import {readScopes} from './scopes.ts';

import type {IExtraction} from '../lib.ts';
import type {ICall} from './calls.ts';
import type {IEndpoint} from './java.ts';
import type {IModule, IUnit} from './modules.ts';
import type {IComponentRef, IRouteNode} from './routes.ts';

interface IConfig {
	flags: {
		method: string;
		path: string;
		reason: string;
		severity: 'high' | 'medium';
		source: string;
	}[];
	public: {
		method: string;
		path: string;
		reason: string;
	}[];
}

interface ICallRow extends ICall {
	endpoint: null | string;
	id: number;
	module: string;
	status: 'liferay' | 'matched' | 'method' | 'missing' | 'unresolved';
}

interface IPage {
	components: IComponentRef[];
	group: string;
	layouts: IComponentRef[];
	node: IRouteNode;
	path: string;
}

const SRC_DIR = path.join(CUSTOM_ELEMENT_DIR, 'src');

const APP_SHELL = 'app-shell';

export function extract(): IExtraction {
	const config = readJSON<IConfig>(
		path.join(import.meta.dirname, 'config.json')
	);

	const problems: string[] = [];

	const graph = new ModuleGraph(SRC_DIR);
	const reader = new RouteReader(graph);

	const main = graph.get(path.join(SRC_DIR, 'main.tsx'));

	if (!main) {
		return {data: null, problems: ['src/main.tsx is missing.']};
	}

	// Route groups: the "routers" map in main.tsx, from route attribute to
	// router module.

	const groups: {id: string; label: string; module: IModule | null}[] = [];
	const routersDecl = main.decls.get('routers');

	if (routersDecl) {
		const tokens = routersDecl.tokens;

		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].t === 'str' && tokens[i + 1]?.v === ':') {
				const importIndex = tokens.findIndex(
					(token, index) =>
						index > i &&
						token.v === 'import' &&
						tokens[index + 1]?.v === '('
				);

				const file = graph.resolve(
					main.file,
					tokens[importIndex + 2].v
				);

				groups.push({
					id: tokens[i].v,
					label: tokens[i].v,
					module: file ? graph.get(file) : null,
				});
			}
		}
	}
	else {
		problems.push('src/main.tsx no longer declares the routers map.');
	}

	// Pages, with their layouts. A route with children and an element is a
	// layout for its children.

	const pages: IPage[] = [];

	let redirects = 0;

	const walk = (
		group: string,
		node: IRouteNode,
		parentPath: string,
		layouts: IComponentRef[]
	) => {
		const fullPath = node.index
			? parentPath
			: joinPath(parentPath, node.path);

		if (node.children.length) {
			for (const child of node.children) {
				walk(group, child, fullPath, [...layouts, ...node.components]);
			}

			return;
		}

		if (!node.components.length) {
			redirects++;

			return;
		}

		pages.push({
			components: node.components,
			group,
			layouts,
			node,
			path: fullPath,
		});
	};

	const shells = new Map<string, IComponentRef[]>();

	for (const group of groups) {
		if (!group.module) {
			problems.push(`The ${group.id} router module does not resolve.`);

			continue;
		}

		const routes = reader.read(group.module);

		if (!routes) {
			pages.push({
				components: [
					{
						module: group.module,
						name: group.module.defaultName ?? 'default',
					},
				],
				group: group.id,
				layouts: [],
				node: {
					canAccess: null,
					children: [],
					components: [],
					index: true,
					module: group.module,
					offset: 0,
					path: '/',
				},
				path: '/',
			});

			continue;
		}

		shells.set(group.id, [
			{module: group.module, name: group.module.defaultName ?? 'default'},
		]);

		for (const route of routes) {
			walk(group.id, route, '/', []);
		}
	}

	// The element bootstrap in main.tsx runs for every placement.

	reader.routeModules.add(main);
	reader.elementNames.set(main, new Set(['routers']));

	pages.push({
		components: [...main.decls.keys()]
			.filter((name) => name !== 'routers')
			.map((name) => ({module: main, name})),
		group: APP_SHELL,
		layouts: [],
		node: {
			canAccess: null,
			children: [],
			components: [],
			index: true,
			module: main,
			offset: 0,
			path: '/',
		},
		path: '(every placement)',
	});

	// Reachability and calls.

	const callCache = new Map<IUnit, ICall[]>();
	const callRows: ICallRow[] = [];
	const callIds = new Map<string, number>();

	const unitCalls = (unit: IUnit): number[] => {
		if (!callCache.has(unit)) {
			callCache.set(
				unit,
				findCalls(unit, (offset) => lineOf(unit.module, offset))
			);
		}

		return callCache.get(unit)!.map((call) => {
			const module = relative(unit.module.file).replace(
				'client-extensions/liferay-one-custom-element/',
				''
			);
			const key = `${module}:${call.line}:${call.method}:${call.path ?? call.raw}`;

			if (!callIds.has(key)) {
				callIds.set(key, callRows.length);
				callRows.push({
					...call,
					endpoint: null,
					id: callRows.length,
					module,
					status: 'unresolved',
				});
			}

			return callIds.get(key)!;
		});
	};

	const reach = (starts: IComponentRef[]): Set<number> => {
		const units = new Set<IUnit>();
		const idents = new Set<string>();
		const entered = new Set<string>();
		const classes: IUnit[] = [];

		const includeUnit = (unit: IUnit) => {
			if (units.has(unit)) {
				return;
			}

			units.add(unit);

			for (const ident of unit.idents) {
				idents.add(ident);
			}

			if (unit.members) {
				classes.push(unit);
			}

			for (const ident of unit.idents) {
				includeName(unit.module, ident, false);
			}

			for (const specifier of unit.dynamicImports) {
				const file = graph.resolve(unit.module.file, specifier);

				if (file) {
					enterModule(file, 'default');
				}
			}
		};

		const includeName = (module: IModule, name: string, start: boolean) => {
			if (!start && reader.elementNames.get(module)?.has(name)) {
				return;
			}

			const decl = module.decls.get(name);

			if (decl) {
				includeUnit(decl);

				return;
			}

			const imported = module.imports.get(name);

			if (imported) {
				const file = graph.resolve(module.file, imported.source);

				if (file) {
					enterModule(file, imported.imported);
				}
			}
		};

		const enterModule = (file: string, name: string) => {
			const key = `${file}#${name}`;

			if (entered.has(key)) {
				return;
			}

			entered.add(key);

			const module = graph.get(file);

			if (!module || reader.routeModules.has(module)) {
				return;
			}

			if (!entered.has(file)) {
				entered.add(file);

				for (const sideEffect of module.sideEffects) {
					includeUnit(sideEffect);
				}
			}

			if (name === '*') {
				for (const decl of module.decls.values()) {
					includeUnit(decl);
				}

				return;
			}

			const local = name === 'default' ? module.defaultName : name;

			if (
				local &&
				(module.decls.has(local) || module.imports.has(local))
			) {
				includeName(module, local, true);

				return;
			}

			for (const reexport of module.reexports) {
				if (reexport.name === name) {
					if (reexport.source) {
						const target = graph.resolve(
							module.file,
							reexport.source
						);

						if (target) {
							enterModule(target, reexport.imported);
						}
					}
					else {
						includeName(module, reexport.imported, true);
					}

					return;
				}
			}

			for (const source of module.starExports) {
				const target = graph.resolve(module.file, source);

				if (target) {
					enterModule(target, name);
				}
			}
		};

		for (const ref of starts) {
			includeName(ref.module, ref.name, true);

			for (const sideEffect of ref.module.sideEffects) {
				includeUnit(sideEffect);
			}
		}

		let changed = true;

		while (changed) {
			changed = false;

			for (const classUnit of [...classes]) {
				for (const member of classUnit.members!) {
					if (
						!units.has(member) &&
						(idents.has(member.name) ||
							member.name === 'constructor')
					) {
						includeUnit(member);

						changed = true;
					}
				}
			}
		}

		const ids = new Set<number>();

		for (const unit of units) {
			for (const id of unitCalls(unit)) {
				ids.add(id);
			}
		}

		return ids;
	};

	const routeRows = _mergePages(pages).map((page, index) => {
		const calls = reach([
			...(shells.get(page.group) ?? []),
			...page.layouts,
			...page.components,
		]);

		return {
			calls: [...calls].sort((a, b) => a - b),
			components: page.components.map((ref) => _componentRow(graph, ref)),
			gate: page.node.canAccess,
			group: page.group,
			id: index,
			layouts: page.layouts.map((ref) => ref.name),
			line: lineOf(page.node.module, page.node.offset),
			path: page.path,
			source: _srcRelative(page.node.module.file),
		};
	});

	// Every call in the source, so the page can list calls that no route
	// reaches.

	const reached = new Set(routeRows.flatMap((route) => route.calls));

	for (const file of listFiles(
		SRC_DIR,
		(name) =>
			/\.tsx?$/.test(name) &&
			!/\.test\.tsx?$|testSetup|\.d\.ts$/.test(name)
	)) {
		const module = graph.get(file)!;

		for (const unit of [
			...module.decls.values(),
			...module.sideEffects,
			...[...module.decls.values()].flatMap((decl) => decl.members ?? []),
		]) {
			unitCalls(unit);
		}
	}

	// Endpoints.

	const endpoints = readEndpoints(
		path.join(SPRING_BOOT_DIR, 'src/main/java')
	);

	const endpointRows = new Map<string, any>();

	for (const endpoint of endpoints) {
		endpointRows.set(_endpointKey(endpoint.method, endpoint.path), {
			...endpoint,
			category: endpoint.path.startsWith('/object/action')
				? 'objectAction'
				: 'route',
			flag: null,
			kind: 'sidecar',
			public: null,
		});
	}

	for (const flag of config.flags) {
		const row = endpointRows.get(_endpointKey(flag.method, flag.path));

		if (!row) {
			problems.push(
				`apis/config.json flags ${flag.method} ${flag.path}, which no controller maps any more.`
			);

			continue;
		}

		row.flag = {
			reason: flag.reason,
			severity: flag.severity,
			source: flag.source,
		};

		// Every flag records a missing caller check, so a flag on a handler
		// that now reaches a check records a defect that may be fixed.

		if (row.auth.kind === 'checked') {
			problems.push(
				`apis/config.json flags ${flag.method} ${flag.path} for a missing caller check, but ${row.controller}.${row.handler} now reaches ${row.auth.checks.join(', ')}. Confirm the fix, then remove the flag.`
			);
		}
	}

	for (const entry of config.public) {
		const row = endpointRows.get(_endpointKey(entry.method, entry.path));

		if (!row) {
			problems.push(
				`apis/config.json lists ${entry.method} ${entry.path} as public, but no controller maps it any more.`
			);

			continue;
		}

		if (row.auth.kind !== 'none') {
			problems.push(
				`apis/config.json lists ${entry.method} ${entry.path} as public, but ${row.controller}.${row.handler} now takes the caller's Jwt. Remove it from the public list.`
			);
		}

		row.public = entry.reason;
	}

	for (const row of endpointRows.values()) {
		if (
			row.category === 'route' &&
			row.auth.kind === 'none' &&
			!row.flag &&
			!row.public
		) {
			problems.push(
				`${row.method} ${row.path} (${row.file}:${row.line}) takes no Jwt and reaches no permission check. Add a check, or record the endpoint in apis/config.json as an audit flag or as public.`
			);
		}
	}

	for (const call of callRows) {
		if (call.target === 'liferay') {
			const key = _endpointKey(call.method, call.path!);

			if (!endpointRows.has(key)) {
				const api = call.path!.split('/')[2] ?? '';

				endpointRows.set(key, {
					api,
					kind: api === 'c' ? 'object' : 'liferay',
					method: call.method,
					path: call.path,
				});
			}

			call.endpoint = key;
			call.status = 'liferay';

			continue;
		}

		if (call.path === null) {
			call.status = 'unresolved';

			continue;
		}

		const match = _match(endpoints, call.method, call.path);

		if (match.endpoint) {
			call.endpoint = _endpointKey(
				match.endpoint.method,
				match.endpoint.path
			);
			call.status = 'matched';

			continue;
		}

		const key = _endpointKey(call.method, call.path);

		if (!endpointRows.has(key)) {
			endpointRows.set(key, {
				kind: 'missing',
				method: call.method,
				otherMethods: match.otherMethods,
				path: call.path,
			});
		}

		call.endpoint = key;
		call.status = match.otherMethods.length ? 'method' : 'missing';

		problems.push(
			`${call.module}:${call.line} sends ${call.method} ${call.path}, which no sidecar controller maps${match.otherMethods.length ? ` (the path takes ${match.otherMethods.join(', ')})` : ''}.`
		);
	}

	const usedModules = [
		...new Set(callRows.map((call) => call.module)),
	].sort();

	const placements = _placements();

	for (const group of groups) {
		if (!placements.some((placement) => placement.route === group.id)) {
			placements.push({
				group: 'Not placed',
				hidden: true,
				name: '(no page)',
				route: group.id,
				url: '',
				view: [],
			});
		}
	}

	// The page shows the caller check that each handler reaches. Why a missing
	// check matters is an action for workspace-health, with its audit source.

	const scopes = readScopes();

	return {
		actions: [
			...config.flags.map((flag) => ({
				anchor: 'endpoints-section',
				detail: `${flag.reason} Source: ${flag.source}.`,
				item: `${flag.method} ${flag.path}`,
				severity: flag.severity,
				source: `${flag.method} ${flag.path}`,
				title: `${flag.method} ${flag.path} has no caller check`,
			})),
			...scopes.rows
				.filter((row) => row.status !== 'covered')
				.map((row) => ({
					anchor: 'scopes-section',
					detail:
						row.status === 'missing'
							? `The sidecar calls this API, and no OAuth2 application of the sidecar declares the scope. Confirm how the call authenticates, or add the scope to client-extension.yaml.`
							: `${row.declaredBy.join(', ')} declares the scope, and the sidecar calls no API that needs it. Remove it, so the application holds only what it uses.`,
					item: row.scope,
					severity: (row.status === 'missing' ? 'medium' : 'low') as
						| 'low'
						| 'medium',
					source: row.files.join(', ') || row.declaredBy.join(', '),
					title:
						row.status === 'missing'
							? `${row.scope} is not declared`
							: `${row.scope} is declared and unused`,
				})),
		],
		data: {
			calls: callRows.map((call) => ({
				...call,
				reached: reached.has(call.id),
			})),
			endpoints: [...endpointRows.entries()]
				.map(([key, row]) => ({key, ...row, flag: undefined}))
				.sort((a, b) =>
					(a.path + a.method).localeCompare(b.path + b.method)
				),
			generated: new Date().toISOString().slice(0, 10),
			scopeApplications: scopes.applications,
			scopes: scopes.rows,
			groups: [
				...groups.map((group) => ({
					id: group.id,
					pages: placements.filter(
						(placement) => placement.route === group.id
					),
					router: group.module
						? _srcRelative(group.module.file)
						: null,
				})),
				{
					id: APP_SHELL,
					pages: [],
					router: 'src/main.tsx',
				},
			],
			modules: usedModules.map((module) => ({
				file: module,
				kind: _moduleKind(module),
			})),
			redirects,
			routes: routeRows,
		},
		problems,
	};
}

function _componentRow(graph: ModuleGraph, ref: IComponentRef) {
	let module = ref.module;
	let name = ref.name;

	// Follow a lazy() declaration or an import to the module that defines
	// the component.

	for (let hop = 0; hop < 4; hop++) {
		const decl = module.decls.get(name);

		if (decl?.dynamicImports.length) {
			const file = graph.resolve(module.file, decl.dynamicImports[0]);
			const target = file ? graph.get(file) : null;

			if (target) {
				module = target;
				name = target.defaultName ?? name;

				continue;
			}
		}

		const imported = module.imports.get(name);

		if (!decl && imported) {
			const file = graph.resolve(module.file, imported.source);
			const target = file ? graph.get(file) : null;

			if (target) {
				module = target;
				name =
					imported.imported === 'default'
						? target.defaultName ?? name
						: imported.imported;

				continue;
			}
		}

		break;
	}

	const decl = module.decls.get(name);

	return {
		file: _srcRelative(module.file),
		line: decl ? lineOf(module, decl.tokens[0].s) : 1,
		name: ref.name,
	};
}

function _endpointKey(method: string, endpointPath: string): string {
	return `${method} ${endpointPath.replace(/\{[^}]*\}/g, '{}')}`;
}

function _match(
	endpoints: IEndpoint[],
	method: string,
	callPath: string
): {endpoint: IEndpoint | null; otherMethods: string[]} {
	const callSegments = callPath.split('/').filter(Boolean);

	let best: IEndpoint | null = null;
	let bestScore = -1;

	const otherMethods = new Set<string>();

	for (const endpoint of endpoints) {
		const segments = endpoint.path.split('/').filter(Boolean);

		if (segments.length !== callSegments.length) {
			continue;
		}

		let score = 0;
		let ok = true;

		for (let i = 0; i < segments.length; i++) {
			const endpointParam = segments[i].startsWith('{');
			const callParam = /\{[^}]*\}/.test(callSegments[i]);

			if (segments[i] === callSegments[i]) {
				score += 2;
			}
			else if (endpointParam) {
				score += callParam ? 1 : 0;
			}
			else if (
				callParam &&
				callSegments[i].startsWith('{') &&
				callSegments[i].endsWith('}')
			) {
				score += 0;
			}
			else {
				ok = false;

				break;
			}
		}

		if (!ok) {
			continue;
		}

		if (endpoint.method !== method && endpoint.method !== 'ANY') {
			otherMethods.add(endpoint.method);

			continue;
		}

		if (score > bestScore) {
			best = endpoint;
			bestScore = score;
		}
	}

	return {endpoint: best, otherMethods: best ? [] : [...otherMethods]};
}

function _mergePages(pages: IPage[]): IPage[] {
	const byKey = new Map<string, IPage>();

	for (const page of pages) {
		const key = [
			page.group,
			page.path,
			page.components.map((ref) => ref.name).join(','),
		].join('|');

		const existing = byKey.get(key);

		if (existing) {
			for (const layout of page.layouts) {
				if (!existing.layouts.some((ref) => ref.name === layout.name)) {
					existing.layouts.push(layout);
				}
			}
		}
		else {
			byKey.set(key, {...page, layouts: [...page.layouts]});
		}
	}

	return [...byKey.values()];
}

function _moduleKind(module: string): string {
	for (const [prefix, kind] of [
		['src/services/', 'service'],
		['src/hooks/', 'hook'],
		['src/context/', 'context'],
		['src/pages/', 'page'],
		['src/components/', 'component'],
	]) {
		if (module.startsWith(prefix)) {
			return kind;
		}
	}

	return 'other';
}

/**
 * Reads the site initializer pages and the master page that place the
 * custom element, from the "route=" widget property.
 */
function _placements() {
	const placements: {
		group: string;
		hidden: boolean;
		name: string;
		route: string;
		url: string;
		view: string[];
	}[] = [];

	const layoutsDir = path.join(SITE_INITIALIZER_DIR, 'layouts');

	for (const file of listFiles(layoutsDir, (name) =>
		name.endsWith('page-definition.json')
	)) {
		const text = fs.readFileSync(file, 'utf8');

		const routes = new Set(
			[...text.matchAll(/route=([a-z0-9-]+)/g)].map((match) => match[1])
		);

		if (!routes.size) {
			continue;
		}

		const pageFile = path.join(path.dirname(file), 'page.json');
		const page = fs.existsSync(pageFile) ? readJSON<any>(pageFile) : {};

		const topDir = path.relative(layoutsDir, file).split(path.sep)[0];
		const topPageFile = path.join(layoutsDir, topDir, 'page.json');
		const topPage = fs.existsSync(topPageFile)
			? readJSON<any>(topPageFile)
			: {};

		for (const route of routes) {
			placements.push({
				group: topPage.name ?? topDir,
				hidden: Boolean(page.hidden),
				name: page.name ?? '',
				route,
				url: page.friendlyURL ?? '',
				view: (page.permissions ?? [])
					.filter((permission: any) =>
						(permission.actionIds ?? []).includes('VIEW')
					)
					.map((permission: any) => permission.roleName),
			});
		}
	}

	const masterDir = path.join(
		SITE_INITIALIZER_DIR,
		'layout-page-templates/master-pages'
	);

	for (const file of listFiles(masterDir, (name) =>
		name.endsWith('page-definition.json')
	)) {
		const text = fs.readFileSync(file, 'utf8');

		for (const match of new Set(
			[...text.matchAll(/route=([a-z0-9-]+)/g)].map((item) => item[1])
		)) {
			placements.push({
				group: 'Every page',
				hidden: false,
				name: `${path.basename(path.dirname(file))} master page`,
				route: match,
				url: '(every page)',
				view: [],
			});
		}
	}

	return placements.sort((a, b) => a.url.localeCompare(b.url));
}

function _srcRelative(file: string): string {
	return path.relative(CUSTOM_ELEMENT_DIR, file);
}
