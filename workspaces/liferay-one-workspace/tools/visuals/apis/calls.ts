/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Finds the HTTP calls in one declaration or class member.
 *
 * A Liferay call is a string or template literal whose path starts with /o/.
 * A sidecar call is a path passed to this.get/post/put/patch/delete in a class
 * whose instance is built with a base path, to the fetch method of an OAuth2
 * client for the sidecar's user agent application, or to a module function
 * that wraps one of those with a fixed prefix (Jira.ts).
 */

import {flatten, matchBracket} from './tokenize.ts';

import type {IModule, IUnit} from './modules.ts';
import type {IToken} from './tokenize.ts';

export interface ICall {
	line: number;
	method: string;
	methodKnown: boolean;
	path: null | string;
	raw: string;
	target: 'liferay' | 'sidecar';
}

interface IModuleContext {
	basePaths: Map<string, string>;
	constants: Map<string, string>;
	sidecarModule: boolean;
	wrappers: Map<string, string>;
}

const CALLEE_METHODS: Record<string, string> = {
	delete: 'DELETE',
	get: 'GET',
	patch: 'PATCH',
	post: 'POST',
	put: 'PUT',
};

const SIDECAR_AGENT = 'liferay-one-etc-spring-boot-oaua';

const contexts = new WeakMap<IModule, IModuleContext>();

export function findCalls(
	unit: IUnit,
	lineOf: (offset: number) => number
): ICall[] {
	const module = unit.module;
	const context = _context(module);
	const flat = flatten(unit.tokens);
	const calls: ICall[] = [];
	const consumed = new Set<IToken>();

	// A wrapper's own fetch receives the wrapper's parameter, not a path.

	const wrapper = context.wrappers.has(unit.name);

	for (let i = 0; i < flat.length && !wrapper; i++) {
		if (flat[i].v !== '(' || flat[i].t !== 'p') {
			continue;
		}

		const callee = _callee(flat, i);

		if (!callee) {
			continue;
		}

		let prefix: null | string = null;
		let method: null | string = null;

		const parts = callee.split('.');
		const last = parts[parts.length - 1];

		if (
			parts[0] === 'this' &&
			parts.length === 2 &&
			CALLEE_METHODS[last] &&
			unit.className &&
			context.basePaths.has(unit.className)
		) {
			prefix = context.basePaths.get(unit.className)!;
			method = CALLEE_METHODS[last];
		}
		else if (
			last === 'fetch' &&
			context.sidecarModule &&
			(parts.length === 1
				? false
				: /^o?auth2client$/i.test(parts[parts.length - 2]) ||
					parts[parts.length - 2] === ')')
		) {
			prefix = '';
		}
		else if (parts.length === 1 && context.wrappers.has(last)) {
			prefix = context.wrappers.get(last)!;
		}
		else {
			continue;
		}

		const close = matchBracket(flat, i);
		const args = _splitArgs(flat.slice(i + 1, close));

		if (!method) {
			method = _optionMethod(args.slice(1)) ?? null;
		}

		const first = _drop(args[0] ?? []);

		let alternatives = _alternatives(first);

		if (!alternatives && first.length === 1 && first[0].t === 'id') {
			alternatives = _alternatives(_localInitializer(flat, first[0].v));
		}

		for (const piece of (alternatives ?? []).flat()) {
			consumed.add(piece);
		}

		const raw = module.text.slice(
			(first[0] ?? flat[i]).s,
			(first[first.length - 1] ?? flat[i]).e
		);

		for (const pieces of alternatives ?? [null]) {
			const path = pieces
				? pieces.map((piece) => _piece(piece, context)).join('')
				: null;

			calls.push({
				line: lineOf(flat[i].s),
				method: method ?? 'GET',
				methodKnown: Boolean(method) || CALLEE_METHODS[last] === 'GET',
				path: path === null ? null : _join(prefix, path),
				raw,
				target: 'sidecar',
			});
		}
	}

	for (let i = 0; i < flat.length; i++) {
		const token = flat[i];

		if ((token.t !== 'str' && token.t !== 'tpl') || consumed.has(token)) {
			continue;
		}

		const path = _path(token, context);

		if (path === null || !/^\/?o\//.test(path)) {
			continue;
		}

		calls.push({
			line: lineOf(token.s),
			...(_literalMethod(flat, i, module) ?? {
				method: 'GET',
				methodKnown: false,
			}),
			path: _cleanPath(path.startsWith('/') ? path : `/${path}`),
			raw: token.v.length > 160 ? `${token.v.slice(0, 160)}…` : token.v,
			target: 'liferay',
		});
	}

	return calls;
}

/**
 * Reads the callee before the "(" at `index`, for example "this.get" or
 * "fetcher.post". A call on a call result, such as "(await x()).fetch",
 * reads as ").fetch".
 */
function _callee(flat: IToken[], index: number): null | string {
	let j = index - 1;

	if (flat[j]?.v === '>') {
		let depth = 0;

		while (j >= 0) {
			if (flat[j].v === '>') {
				depth++;
			}
			else if (flat[j].v === '<') {
				depth--;

				if (depth === 0) {
					break;
				}
			}

			j--;
		}

		j--;
	}

	const parts: string[] = [];

	while (j >= 0) {
		const token = flat[j];

		if (token.t !== 'id') {
			if (token.v === ')' && parts.length) {
				parts.unshift(')');
			}

			break;
		}

		parts.unshift(token.v);

		if (flat[j - 1]?.v === '.' || flat[j - 1]?.v === '?.') {
			j -= 2;

			continue;
		}

		break;
	}

	return parts.length ? parts.join('.') : null;
}

/**
 * Drops the query string, a trailing slash, and a trailing placeholder glued
 * to the last segment, such as "/tickets{params}", which is a query string
 * built elsewhere.
 */
function _cleanPath(path: string): string {
	return (
		path
			.split('?')[0]
			.replace(/([^/])\{[^}]*\}$/, '$1')
			.replace(/\/+$/, '') || '/'
	);
}

function _context(module: IModule): IModuleContext {
	let context = contexts.get(module);

	if (context) {
		return context;
	}

	const tokens = flatten(module.tokens);
	const basePaths = new Map<string, string>();
	const constants = new Map<string, string>();

	for (let i = 0; i < tokens.length; i++) {
		if (
			tokens[i].v === 'new' &&
			tokens[i + 1]?.t === 'id' &&
			tokens[i + 2]?.v === '(' &&
			tokens[i + 3]?.t === 'str'
		) {
			basePaths.set(tokens[i + 1].v, tokens[i + 3].v);
		}

		if (
			['const', 'let'].includes(tokens[i].v) &&
			tokens[i + 1]?.t === 'id' &&
			tokens[i + 2]?.v === '=' &&
			tokens[i + 3]?.t === 'str' &&
			[';', ','].includes(tokens[i + 4]?.v)
		) {
			constants.set(tokens[i + 1].v, tokens[i + 3].v);
		}
	}

	// Subclasses inherit nothing here: a base path belongs to the instance.
	// Keep only classes that extend the sidecar client.

	for (const className of [...basePaths.keys()]) {
		const decl = module.decls.get(className);

		if (decl?.extendsName !== 'OneSpringBootOAuth2') {
			basePaths.delete(className);
		}
	}

	context = {
		basePaths,
		constants,
		sidecarModule: module.text.includes(SIDECAR_AGENT),
		wrappers: new Map(),
	};

	contexts.set(module, context);

	// A wrapper is a module function whose first parameter becomes the path
	// of a sidecar fetch, possibly after a constant prefix. Find the direct
	// wrappers first, then functions that pass their first parameter on to
	// a wrapper.

	if (context.sidecarModule) {
		for (let pass = 0; pass < 3; pass++) {
			for (const [name, decl] of module.decls) {
				if (context.wrappers.has(name)) {
					continue;
				}

				const prefix = _wrapperPrefix(decl, context);

				if (prefix !== null) {
					context.wrappers.set(name, prefix);
				}
			}
		}
	}

	return context;
}

function _join(prefix: null | string, path: string): string {
	if (!prefix) {
		return _cleanPath(path.startsWith('/') ? path : `/${path}`);
	}

	return _cleanPath(
		`${prefix.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
	);
}

/**
 * Determines the method of a Liferay literal: from the call it is the first
 * argument of, or from the calls that use the constant it initializes.
 */
function _literalMethod(
	flat: IToken[],
	index: number,
	module: IModule
): null | {method: string; methodKnown: boolean} {
	if (flat[index - 1]?.v === '(') {
		const callee = _callee(flat, index - 1);

		if (callee) {
			const last = callee.split('.').pop()!;

			if (CALLEE_METHODS[last] && callee !== 'this.get') {
				return {method: CALLEE_METHODS[last], methodKnown: true};
			}

			const close = matchBracket(flat, index - 1);
			const method = _optionMethod(
				_splitArgs(flat.slice(index - 1 + 1, close)).slice(1)
			);

			if (method) {
				return {method, methodKnown: true};
			}

			return {method: 'GET', methodKnown: true};
		}
	}

	if (flat[index - 1]?.v === '=' && flat[index - 2]?.t === 'id') {
		const name = flat[index - 2].v;
		const tokens = flatten(module.tokens);

		for (let j = 0; j < tokens.length; j++) {
			if (
				tokens[j].v === name &&
				tokens[j - 1]?.v === '(' &&
				[')', ','].includes(tokens[j + 1]?.v)
			) {
				const callee = _callee(tokens, j - 1);
				const last = callee?.split('.').pop();

				if (last && CALLEE_METHODS[last]) {
					return {method: CALLEE_METHODS[last], methodKnown: true};
				}

				const close = matchBracket(tokens, j - 1);
				const method = _optionMethod(
					_splitArgs(tokens.slice(j, close)).slice(1)
				);

				return {method: method ?? 'GET', methodKnown: Boolean(callee)};
			}
		}
	}

	if (flat[index - 1]?.v === ':' || flat[index - 1]?.v === '=') {
		return {method: 'GET', methodKnown: true};
	}

	return null;
}

/**
 * Returns the paths an argument can take: one literal or a "+" chain of
 * literals, or either branch of a ternary of those. Returns null when the
 * argument is anything else.
 */
function _alternatives(arg: IToken[] | null): IToken[][] | null {
	if (!arg?.length) {
		return null;
	}

	const single = _concatenation(arg);

	if (single) {
		return [single];
	}

	let depth = 0;
	let question = -1;
	let colon = -1;

	for (let i = 0; i < arg.length; i++) {
		const v = arg[i].t === 'p' ? arg[i].v : '';

		if (['(', '[', '{'].includes(v)) {
			depth++;
		}
		else if ([')', ']', '}'].includes(v)) {
			depth--;
		}
		else if (depth === 0 && v === '?' && question < 0) {
			question = i;
		}
		else if (depth === 0 && v === ':' && question >= 0 && colon < 0) {
			colon = i;
		}
	}

	if (question < 0 || colon < 0) {
		return null;
	}

	const whenTrue = _concatenation(arg.slice(question + 1, colon));
	const whenFalse = _concatenation(arg.slice(colon + 1));

	return whenTrue && whenFalse ? [whenTrue, whenFalse] : null;
}

/**
 * Removes the tokens nested inside a template literal or JSX element, which
 * flatten() spliced in after it.
 */
function _drop(tokens: IToken[]): IToken[] {
	const kept: IToken[] = [];

	let container: IToken | null = null;

	for (const token of tokens) {
		if (container && token.s >= container.s && token.e <= container.e) {
			continue;
		}

		container = token.t === 'tpl' || token.t === 'jsx' ? token : null;

		kept.push(token);
	}

	return kept;
}

/**
 * Finds "const name = ...;" in the same unit and returns the initializer.
 */
function _localInitializer(flat: IToken[], name: string): IToken[] | null {
	for (let j = 0; j < flat.length - 3; j++) {
		if (
			['const', 'let'].includes(flat[j].v) &&
			flat[j + 1].v === name &&
			flat[j + 2].v === '='
		) {
			const start = j + 3;

			let end = start;
			let depth = 0;

			while (end < flat.length) {
				const v = flat[end].t === 'p' ? flat[end].v : '';

				if (['(', '[', '{'].includes(v)) {
					depth++;
				}
				else if ([')', ']', '}'].includes(v)) {
					depth--;
				}
				else if (depth === 0 && v === ';') {
					break;
				}

				end++;
			}

			return _drop(flat.slice(start, end));
		}
	}

	return null;
}

function _optionMethod(args: IToken[][]): null | string {
	for (const arg of args) {
		for (let k = 0; k < arg.length - 2; k++) {
			if (arg[k].v === 'method' && arg[k + 1].v === ':') {
				return arg[k + 2].t === 'str'
					? arg[k + 2].v.toUpperCase()
					: null;
			}
		}
	}

	return null;
}

/**
 * Returns the tokens of an argument that is one literal or literals joined
 * with "+", or null.
 */
function _concatenation(arg: IToken[]): IToken[] | null {
	const pieces: IToken[] = [];

	for (let i = 0; i < arg.length; i++) {
		if (i % 2 === 1) {
			if (arg[i].v !== '+') {
				return null;
			}

			continue;
		}

		if (arg[i].t !== 'str' && arg[i].t !== 'tpl') {
			return null;
		}

		pieces.push(arg[i]);
	}

	return pieces.length && arg.length % 2 === 1 ? pieces : null;
}

/**
 * Builds the path of a Liferay literal, or returns null for a literal that
 * is not a path. A host prefix before /o/, such as ${baseURL}, is dropped.
 */
function _path(token: IToken, context: IModuleContext): null | string {
	const path = _piece(token, context).replace(/^\{[^}]*\}(?=\/?o\/)/, '');

	return /^\/|^o\//.test(path) ? path : null;
}

/**
 * Renders a literal. A template expression becomes {name}, where name is the
 * last identifier in the expression, unless it is a module constant.
 */
function _piece(token: IToken, context: IModuleContext): string {
	if (token.t === 'str') {
		return token.v;
	}

	let path = '';

	token.quasis!.forEach((quasi, index) => {
		path += quasi;

		const expr = token.exprs![index];

		if (!expr) {
			return;
		}

		if (
			expr.length === 1 &&
			expr[0].t === 'id' &&
			context.constants.has(expr[0].v)
		) {
			path += context.constants.get(expr[0].v);

			return;
		}

		const ids = expr.filter((item) => item.t === 'id');

		path += `{${ids.length ? ids[ids.length - 1].v : 'expr'}}`;
	});

	return path;
}

function _splitArgs(tokens: IToken[]): IToken[][] {
	const args: IToken[][] = [];

	let current: IToken[] = [];
	let depth = 0;

	for (const token of _drop(tokens)) {
		if (token.t === 'p' && ['(', '[', '{'].includes(token.v)) {
			depth++;
		}
		else if (token.t === 'p' && [')', ']', '}'].includes(token.v)) {
			depth--;
		}

		if (depth === 0 && token.t === 'p' && token.v === ',') {
			args.push(current);

			current = [];

			continue;
		}

		current.push(token);
	}

	if (current.length) {
		args.push(current);
	}

	return args;
}

function _wrapperPrefix(decl: IUnit, context: IModuleContext): null | string {
	const flat = flatten(decl.tokens);

	const open = flat.findIndex((token) => token.v === '(');

	const parameter = flat[open + 1];

	if (open < 0 || parameter?.t !== 'id') {
		return null;
	}

	for (let i = open + 2; i < flat.length; i++) {
		if (flat[i].v !== '(') {
			continue;
		}

		const callee = _callee(flat, i);

		if (!callee) {
			continue;
		}

		const parts = callee.split('.');
		const last = parts[parts.length - 1];
		const first = flat[i + 1];

		const sidecarFetch =
			last === 'fetch' &&
			parts.length > 1 &&
			/^o?auth2client$/i.test(parts[parts.length - 2]);

		const wrapper = parts.length === 1 && context.wrappers.has(last);

		if (!sidecarFetch && !wrapper) {
			continue;
		}

		const prefix = wrapper ? context.wrappers.get(last)! : '';

		if (first?.t === 'id' && first.v === parameter.v) {
			return prefix;
		}

		if (
			first?.t === 'tpl' &&
			first.quasis!.every((quasi) => quasi === '') &&
			first.exprs!.length === 2 &&
			first.exprs![1].length === 1 &&
			first.exprs![1][0].v === parameter.v &&
			first.exprs![0].length === 1 &&
			context.constants.has(first.exprs![0][0].v)
		) {
			return prefix + context.constants.get(first.exprs![0][0].v);
		}
	}

	return null;
}
