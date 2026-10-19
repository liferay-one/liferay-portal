/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the route tree of each router. A route is an object literal with an
 * element, a path or index, and optional children. Children may be an array,
 * a spread, a local constant, a route array imported from another module, or
 * a function imported from another module. For a function, every route object
 * that the function returns is a child, so the product purchase flows, which
 * pick their steps at run time, show the union of their steps.
 */

import {flatten, matchBracket} from './tokenize.ts';

import type {IModule, ModuleGraph} from './modules.ts';
import type {IToken} from './tokenize.ts';

export interface IComponentRef {
	module: IModule;
	name: string;
}

export interface IRouteNode {
	canAccess: null | string;
	children: IRouteNode[];
	components: IComponentRef[];
	index: boolean;
	module: IModule;
	offset: number;
	path: null | string;
	redirect: boolean;
}

export class RouteReader {
	graph: ModuleGraph;

	/** Modules that define route objects. Reachability does not enter them. */
	routeModules = new Set<IModule>();

	/** Component names used as route elements, per module. */
	elementNames = new Map<IModule, Set<string>>();

	private resolving = new Set<string>();

	constructor(graph: ModuleGraph) {
		this.graph = graph;
	}

	/**
	 * Returns the top level routes of a router module, or null when the module
	 * renders no router.
	 */
	read(module: IModule): IRouteNode[] | null {
		const tokens = module.tokens;

		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].v === 'useRoutes' && tokens[i + 1]?.v === '(') {
				this.routeModules.add(module);

				const close = matchBracket(tokens, i + 1);

				return this._resolve(module, tokens.slice(i + 2, close));
			}
		}

		const routesElement = flatten(tokens).find(
			(token) => token.t === 'jsx' && token.tags!.includes('Routes')
		);

		if (routesElement) {
			this.routeModules.add(module);

			return this._jsxRoutes(module, routesElement);
		}

		return null;
	}

	private _components(module: IModule, tokens: IToken[]): IComponentRef[] {
		const refs: IComponentRef[] = [];

		for (const token of flatten(tokens)) {
			if (token.t !== 'jsx') {
				continue;
			}

			for (const tag of token.tags!) {
				if (
					!/^[A-Z]/.test(tag) ||
					refs.some((ref) => ref.name === tag)
				) {
					continue;
				}

				const imported = module.imports.get(tag);

				if (
					module.decls.has(tag) ||
					(imported &&
						this.graph.resolve(module.file, imported.source))
				) {
					refs.push({module, name: tag});

					if (!this.elementNames.has(module)) {
						this.elementNames.set(module, new Set());
					}

					this.elementNames.get(module)!.add(tag);
				}
			}
		}

		return refs;
	}

	private _dedupe(routes: IRouteNode[]): IRouteNode[] {
		const byKey = new Map<string, IRouteNode>();

		for (const route of routes) {
			const key = [
				route.path ?? '',
				route.index,
				route.components.map((ref) => ref.name).join(','),
			].join('|');

			const existing = byKey.get(key);

			if (existing) {
				existing.children = this._dedupe([
					...existing.children,
					...route.children,
				]);
			}
			else {
				byKey.set(key, route);
			}
		}

		return [...byKey.values()];
	}

	/**
	 * Finds every array literal of route objects inside `tokens`.
	 */
	private _arraysIn(module: IModule, tokens: IToken[]): IRouteNode[] {
		const routes: IRouteNode[] = [];

		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].v !== '[' || tokens[i].t !== 'p') {
				continue;
			}

			const close = matchBracket(tokens, i);
			const items = this._items(tokens.slice(i + 1, close));

			const objects = items.filter(
				(item) => item[0]?.v === '{' && this._isRoute(item)
			);

			if (objects.length) {
				for (const item of objects) {
					routes.push(this._object(module, item));
				}

				i = close;
			}
		}

		return routes;
	}

	private _entries(objectTokens: IToken[]): Map<string, IToken[]> {
		const entries = new Map<string, IToken[]>();

		for (const item of this._items(objectTokens.slice(1, -1))) {
			if (item[0]?.t === 'id' && item[1]?.v === ':') {
				entries.set(item[0].v, item.slice(2));
			}
			else if (item[0]?.t === 'id' && item.length === 1) {
				entries.set(item[0].v, item);
			}
		}

		return entries;
	}

	private _isRoute(objectTokens: IToken[]): boolean {
		const entries = this._entries(objectTokens);

		return (
			(entries.has('element') &&
				(entries.has('path') || entries.has('index'))) ||
			(entries.has('children') &&
				(entries.has('element') || entries.has('path')))
		);
	}

	/**
	 * Splits the tokens between brackets on top level commas.
	 */
	private _items(tokens: IToken[]): IToken[][] {
		const items: IToken[][] = [];

		let current: IToken[] = [];

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.t === 'p' && ['(', '[', '{'].includes(token.v)) {
				const close = matchBracket(tokens, i);

				current.push(...tokens.slice(i, close + 1));

				i = close;

				continue;
			}

			if (token.t === 'p' && token.v === ',') {
				items.push(current);

				current = [];

				continue;
			}

			current.push(token);
		}

		if (current.length) {
			items.push(current);
		}

		return items;
	}

	private _jsxRoutes(module: IModule, element: IToken): IRouteNode[] {
		const text = module.text.slice(element.s, element.e);
		const routes: IRouteNode[] = [];
		const pattern = /<Route\b([^]*?)\/?>/g;

		let match: null | RegExpExecArray;

		while ((match = pattern.exec(text))) {
			const attributes = match[1];

			const path = /\bpath="([^"]*)"/.exec(attributes)?.[1] ?? null;
			const elementName = /\belement=\{<([A-Z][\w$]*)/.exec(
				attributes
			)?.[1];

			const components: IComponentRef[] = elementName
				? [{module, name: elementName}]
				: [];

			if (elementName) {
				if (!this.elementNames.has(module)) {
					this.elementNames.set(module, new Set());
				}

				this.elementNames.get(module)!.add(elementName);
			}

			routes.push({
				canAccess: null,
				children: [],
				components,
				index: /\bindex\b/.test(attributes),
				module,
				offset: element.s + match.index,
				path,
				redirect: !components.length,
			});
		}

		return routes;
	}

	private _object(module: IModule, objectTokens: IToken[]): IRouteNode {
		const entries = this._entries(objectTokens);

		const pathTokens = entries.get('path');
		const elementTokens = entries.get('element') ?? [];
		const childrenTokens = entries.get('children');
		const canAccessTokens = entries.get('canAccess');

		const components = this._components(module, elementTokens);

		return {
			canAccess:
				canAccessTokens?.length === 1 ? canAccessTokens[0].v : null,
			children: childrenTokens
				? this._dedupe(this._resolve(module, childrenTokens))
				: [],
			components,
			index: entries.get('index')?.[0]?.v === 'true',
			module,
			offset: objectTokens[0].s,
			path:
				pathTokens?.length === 1 && pathTokens[0].t === 'str'
					? pathTokens[0].v
					: pathTokens
						? '{dynamic}'
						: null,
			redirect:
				!components.length &&
				flatten(elementTokens).some(
					(token) =>
						token.t === 'jsx' && token.tags!.includes('Navigate')
				),
		};
	}

	/**
	 * Resolves an expression that evaluates to route objects.
	 */
	private _resolve(module: IModule, tokens: IToken[]): IRouteNode[] {
		if (
			tokens[0]?.v === '[' &&
			matchBracket(tokens, 0) === tokens.length - 1
		) {
			const routes: IRouteNode[] = [];

			for (const item of this._items(tokens.slice(1, -1))) {
				if (item[0]?.v === '{' && this._isRoute(item)) {
					routes.push(this._object(module, item));
				}
				else if (item[0]?.v === '...') {
					routes.push(...this._resolve(module, item.slice(1)));
				}
				else if (item.length) {
					routes.push(...this._resolve(module, item));
				}
			}

			return routes;
		}

		const routes: IRouteNode[] = [];
		const seen = new Set<string>();

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (
				token.t !== 'id' ||
				tokens[i - 1]?.v === '.' ||
				seen.has(token.v)
			) {
				continue;
			}

			seen.add(token.v);

			routes.push(...this._resolveName(module, token.v));
		}

		return routes;
	}

	private _resolveName(module: IModule, name: string): IRouteNode[] {
		const key = `${module.file}#${name}`;

		if (this.resolving.has(key)) {
			return [];
		}

		this.resolving.add(key);

		try {
			const decl = module.decls.get(name);

			if (decl) {
				const routes = this._arraysIn(module, decl.tokens);

				if (routes.length) {
					this.routeModules.add(module);
				}

				return routes;
			}

			const local = this._localInitializer(module, name);

			if (local) {
				return this._resolve(module, local);
			}

			const imported = module.imports.get(name);
			const file =
				imported && this.graph.resolve(module.file, imported.source);
			const target = file ? this.graph.get(file) : null;

			if (!target || !imported) {
				return [];
			}

			const targetName =
				imported.imported === 'default'
					? target.defaultName
					: imported.imported;

			return targetName ? this._resolveName(target, targetName) : [];
		}
		finally {
			this.resolving.delete(key);
		}
	}

	/**
	 * Finds "const name = ..." inside a function of the module and returns
	 * its initializer.
	 */
	private _localInitializer(module: IModule, name: string): IToken[] | null {
		for (const decl of module.decls.values()) {
			const flat = decl.tokens;

			for (let i = 1; i < flat.length - 2; i++) {
				if (
					['const', 'let'].includes(flat[i - 1].v) &&
					flat[i].v === name
				) {
					let j = i + 1;

					while (j < flat.length && flat[j].v !== '=') {
						if (
							['(', '[', '{'].includes(flat[j].v) &&
							flat[j].t === 'p'
						) {
							j = matchBracket(flat, j);
						}

						j++;
					}

					const start = j + 1;

					let end = start;

					while (end < flat.length && flat[end].v !== ';') {
						if (
							['(', '[', '{'].includes(flat[end].v) &&
							flat[end].t === 'p'
						) {
							end = matchBracket(flat, end);
						}

						end++;
					}

					return flat.slice(start, end);
				}
			}
		}

		return null;
	}
}

export function joinPath(parent: string, child: null | string): string {
	if (child === null) {
		return parent;
	}

	if (child.startsWith('/')) {
		return child.replace(/\/+$/, '') || '/';
	}

	return `${parent.replace(/\/+$/, '')}/${child}`.replace(/\/+$/, '') || '/';
}
