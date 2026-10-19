/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Splits each custom element module into its imports, exports, and top level
 * declarations, and each class into its members. Reachability works on these
 * units: a route reaches a declaration only when code it already reaches names
 * that declaration.
 */

import * as fs from 'fs';
import * as path from 'path';

import {flatten, matchBracket, tokenize} from './tokenize.ts';

import type {IToken} from './tokenize.ts';

export interface IImport {
	imported: string;
	source: string;
}

export interface IModule {
	decls: Map<string, IUnit>;
	defaultName: null | string;
	file: string;
	imports: Map<string, IImport>;
	lines: number[];
	reexports: {imported: string; name: string; source: string}[];
	sideEffects: IUnit[];
	starExports: string[];
	text: string;
	tokens: IToken[];
}

export interface IUnit {
	className?: string;
	dynamicImports: string[];
	extendsName?: string;
	idents: Set<string>;
	members?: IUnit[];
	module: IModule;
	name: string;
	tokens: IToken[];
}

const DECLARATION_SKIP = new Set(['declare', 'interface', 'type', 'enum']);

const MEMBER_MODIFIERS = new Set([
	'abstract',
	'async',
	'declare',
	'get',
	'override',
	'private',
	'protected',
	'public',
	'readonly',
	'set',
	'static',
]);

export class ModuleGraph {
	modules = new Map<string, IModule | null>();
	srcDir: string;

	constructor(srcDir: string) {
		this.srcDir = srcDir;
	}

	get(file: string): IModule | null {
		if (!this.modules.has(file)) {
			this.modules.set(file, fs.existsSync(file) ? _parse(file) : null);
		}

		return this.modules.get(file)!;
	}

	/**
	 * Resolves an import specifier to a file under src, or returns null for a
	 * package or a stylesheet.
	 */
	resolve(fromFile: string, specifier: string): null | string {
		let base: string;

		if (specifier.startsWith('~/')) {
			base = path.join(this.srcDir, specifier.slice(2));
		}
		else if (specifier.startsWith('.')) {
			base = path.resolve(path.dirname(fromFile), specifier);
		}
		else {
			return null;
		}

		for (const candidate of [
			base,
			`${base}.ts`,
			`${base}.tsx`,
			path.join(base, 'index.ts'),
			path.join(base, 'index.tsx'),
		]) {
			if (
				/\.tsx?$/.test(candidate) &&
				fs.existsSync(candidate) &&
				fs.statSync(candidate).isFile()
			) {
				return candidate;
			}
		}

		return null;
	}
}

export function lineOf(module: IModule, offset: number): number {
	let low = 0;
	let high = module.lines.length - 1;

	while (low < high) {
		const middle = (low + high + 1) >> 1;

		if (module.lines[middle] <= offset) {
			low = middle;
		}
		else {
			high = middle - 1;
		}
	}

	return low + 1;
}

function _parse(file: string): IModule {
	const text = fs.readFileSync(file, 'utf8');
	const tokens = tokenize(text, file.endsWith('.tsx'));

	const lines = [0];

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			lines.push(i + 1);
		}
	}

	const module: IModule = {
		decls: new Map(),
		defaultName: null,
		file,
		imports: new Map(),
		lines,
		reexports: [],
		sideEffects: [],
		starExports: [],
		text,
		tokens,
	};

	let i = 0;

	while (i < tokens.length) {
		i = _statement(module, tokens, i);
	}

	return module;
}

function _unit(
	module: IModule,
	name: string,
	tokens: IToken[],
	extra: Partial<IUnit> = {}
): IUnit {
	const flat = flatten(tokens);
	const dynamicImports: string[] = [];
	const idents = new Set<string>();

	for (let i = 0; i < flat.length; i++) {
		const token = flat[i];

		if (token.t === 'id') {
			if (
				token.v === 'import' &&
				flat[i + 1]?.v === '(' &&
				flat[i + 2]?.t === 'str'
			) {
				dynamicImports.push(flat[i + 2].v);
			}
			else {
				idents.add(token.v);
			}
		}
		else if (token.t === 'jsx') {
			for (const tag of token.tags!) {
				idents.add(tag.split('.')[0]);
			}
		}
	}

	return {dynamicImports, idents, module, name, tokens, ...extra};
}

/**
 * Reads one top level statement starting at `start` and returns the index
 * after it.
 */
function _statement(module: IModule, tokens: IToken[], start: number): number {
	let i = start;
	let exported = false;
	let isDefault = false;

	if (tokens[i].v === ';') {
		return i + 1;
	}

	if (tokens[i].v === 'import' && tokens[i + 1]?.v !== '(') {
		return _import(module, tokens, i);
	}

	if (tokens[i].v === 'export') {
		exported = true;
		i++;

		if (tokens[i]?.v === '{' || tokens[i]?.v === '*') {
			return _export(module, tokens, i);
		}

		if (tokens[i]?.v === 'type' && tokens[i + 1]?.v === '{') {
			return _skipStatement(tokens, i);
		}

		if (tokens[i]?.v === 'default') {
			isDefault = true;
			i++;
		}
	}

	if (DECLARATION_SKIP.has(tokens[i]?.v) && tokens[i + 1]?.t === 'id') {
		return _skipStatement(tokens, i);
	}

	if (tokens[i]?.v === 'abstract') {
		i++;
	}

	if (tokens[i]?.v === 'async' && tokens[i + 1]?.v === 'function') {
		i++;
	}

	if (tokens[i]?.v === 'function') {
		let j = i + 1;

		if (tokens[j]?.v === '*') {
			j++;
		}

		const name = tokens[j]?.t === 'id' ? tokens[j].v : 'default';
		const end = _functionEnd(tokens, j);
		const unit = _unit(module, name, tokens.slice(start, end));

		module.decls.set(name, unit);

		if (isDefault) {
			module.defaultName = name;
		}

		return end;
	}

	if (tokens[i]?.v === 'class') {
		return _class(module, tokens, start, i, isDefault);
	}

	if (['const', 'let', 'var'].includes(tokens[i]?.v)) {
		const end = _skipStatement(tokens, i);
		const names: string[] = [];

		let j = i + 1;

		if (tokens[j].v === '{' || tokens[j].v === '[') {
			const close = matchBracket(tokens, j);

			for (let k = j + 1; k < close; k++) {
				if (
					tokens[k].t === 'id' &&
					[',', '}', ']', '='].includes(tokens[k + 1]?.v) &&
					tokens[k - 1]?.v !== ':' &&
					tokens[k - 1]?.v !== '='
				) {
					names.push(tokens[k].v);
				}
				else if (tokens[k].t === 'id' && tokens[k - 1]?.v === ':') {
					names.push(tokens[k].v);
				}
			}
		}
		else {
			while (j < end && tokens[j].t === 'id') {
				names.push(tokens[j].v);

				let depth = 0;
				let initializer = false;

				while (j < end) {
					const v = tokens[j].v;

					if (tokens[j].t === 'p' && ['(', '[', '{'].includes(v)) {
						depth++;
					}
					else if (
						tokens[j].t === 'p' &&
						[')', ']', '}'].includes(v)
					) {
						depth--;
					}
					else if (!initializer && v === '<') {
						depth++;
					}
					else if (!initializer && v === '>') {
						depth--;
					}
					else if (depth === 0 && v === '=') {
						initializer = true;
					}
					else if (
						depth === 0 &&
						v === ',' &&
						tokens[j].t === 'p'
					) {
						j++;

						break;
					}

					j++;
				}
			}
		}

		for (const name of names) {
			module.decls.set(
				name,
				_unit(module, name, tokens.slice(start, end))
			);
		}

		return end;
	}

	const end = _skipStatement(tokens, i);

	if (isDefault) {
		if (tokens[i]?.t === 'id' && end - i <= 2) {
			module.defaultName = tokens[i].v;
		}
		else {
			module.decls.set(
				'default',
				_unit(module, 'default', tokens.slice(i, end))
			);
			module.defaultName = 'default';
		}
	}
	else if (!exported) {
		module.sideEffects.push(
			_unit(module, '(module)', tokens.slice(start, end))
		);
	}

	return end;
}

function _class(
	module: IModule,
	tokens: IToken[],
	start: number,
	classIndex: number,
	isDefault: boolean
): number {
	let j = classIndex + 1;

	const name = tokens[j]?.t === 'id' ? tokens[j].v : 'default';

	let extendsName: string | undefined;

	while (j < tokens.length && tokens[j].v !== '{') {
		if (tokens[j].v === 'extends') {
			extendsName = tokens[j + 1]?.v;
		}

		j++;
	}

	const close = matchBracket(tokens, j);
	const members: IUnit[] = [];

	let k = j + 1;

	while (k < close) {
		const memberStart = k;

		while (MEMBER_MODIFIERS.has(tokens[k].v) && tokens[k + 1]?.t === 'id') {
			k++;
		}

		const memberName = tokens[k].v;

		k++;

		if (tokens[k]?.v === '?' || tokens[k]?.v === '!') {
			k++;
		}

		let end: number;

		if (tokens[k]?.v === '(' || tokens[k]?.v === '<') {
			end = _functionEnd(tokens, k - 1);
		}
		else {
			end = _skipStatement(tokens, k);
		}

		members.push(
			_unit(
				module,
				memberName,
				tokens.slice(memberStart, Math.min(end, close)),
				{
					className: name,
				}
			)
		);

		k = Math.min(end, close);

		while (k < close && tokens[k].v === ';') {
			k++;
		}
	}

	const unit = _unit(module, name, tokens.slice(start, classIndex + 1), {
		extendsName,
		members,
	});

	module.decls.set(name, unit);

	if (isDefault) {
		module.defaultName = name;
	}

	return close + 1;
}

function _export(module: IModule, tokens: IToken[], i: number): number {
	const end = _skipStatement(tokens, i);
	const fromIndex = tokens.findIndex(
		(token, index) => index > i && index < end && token.v === 'from'
	);
	const source = fromIndex > 0 ? tokens[fromIndex + 1].v : null;

	if (tokens[i].v === '*') {
		if (source) {
			module.starExports.push(source);
		}

		return end;
	}

	const close = matchBracket(tokens, i);

	for (let k = i + 1; k < close; k++) {
		if (tokens[k].t !== 'id' || tokens[k].v === 'type') {
			continue;
		}

		const imported = tokens[k].v;

		let name = imported;

		if (tokens[k + 1]?.v === 'as') {
			name = tokens[k + 2].v;
			k += 2;
		}

		if (source) {
			module.reexports.push({imported, name, source});
		}
		else if (name === 'default') {
			module.defaultName = imported;
		}
		else if (name !== imported) {
			module.reexports.push({imported, name, source: ''});
		}
	}

	return end;
}

/**
 * Returns the index after a function's body, starting from the token before
 * its type parameters or parameters.
 */
function _functionEnd(tokens: IToken[], nameIndex: number): number {
	let j = nameIndex + 1;

	if (tokens[j]?.v === '<') {
		j = _skipAngle(tokens, j);
	}

	if (tokens[j]?.v !== '(') {
		return _skipStatement(tokens, j);
	}

	j = matchBracket(tokens, j) + 1;

	if (tokens[j]?.v === ':') {
		j++;

		while (j < tokens.length) {
			const v = tokens[j].v;

			if (v === '<') {
				j = _skipAngle(tokens, j);

				continue;
			}

			if (v === '(' || v === '[') {
				j = matchBracket(tokens, j) + 1;

				continue;
			}

			if (v === '{') {
				const close = matchBracket(tokens, j);

				if (tokens[close + 1]?.v === '{') {
					j = close + 1;

					continue;
				}

				return close + 1;
			}

			if (v === ';') {
				return j + 1;
			}

			j++;
		}

		return j;
	}

	if (tokens[j]?.v === '{') {
		return matchBracket(tokens, j) + 1;
	}

	return _skipStatement(tokens, j);
}

function _import(module: IModule, tokens: IToken[], i: number): number {
	const end = _skipStatement(tokens, i);

	let j = i + 1;

	if (tokens[j].t === 'str') {
		return end;
	}

	if (tokens[j].v === 'type') {
		return end;
	}

	const sourceToken = tokens
		.slice(i, end)
		.find((token, index, list) => list[index - 1]?.v === 'from');

	const source = sourceToken?.v ?? '';

	while (j < end && tokens[j].v !== 'from') {
		const token = tokens[j];

		if (token.t === 'id' && tokens[j - 1]?.v !== 'as') {
			if (tokens[j + 1]?.v === ',' || tokens[j + 1]?.v === 'from') {
				if (tokens[j - 1]?.v === 'import' || tokens[j - 1]?.v === ',') {
					if (!_insideBraces(tokens, i, j)) {
						module.imports.set(token.v, {
							imported: 'default',
							source,
						});
					}
				}
			}
		}

		if (token.v === '*' && tokens[j + 1]?.v === 'as') {
			module.imports.set(tokens[j + 2].v, {imported: '*', source});
			j += 3;

			continue;
		}

		if (token.v === '{') {
			const close = matchBracket(tokens, j);

			for (let k = j + 1; k < close; k++) {
				if (tokens[k].t !== 'id') {
					continue;
				}

				if (tokens[k].v === 'type' && tokens[k + 1]?.t === 'id') {
					k++;

					while (k < close && tokens[k].v !== ',') {
						k++;
					}

					continue;
				}

				let local = tokens[k].v;
				const imported = local;

				if (tokens[k + 1]?.v === 'as') {
					local = tokens[k + 2].v;
					k += 2;
				}

				module.imports.set(local, {imported, source});
			}

			j = close + 1;

			continue;
		}

		j++;
	}

	return end;
}

function _insideBraces(tokens: IToken[], from: number, index: number): boolean {
	let depth = 0;

	for (let k = from; k < index; k++) {
		if (tokens[k].v === '{') {
			depth++;
		}
		else if (tokens[k].v === '}') {
			depth--;
		}
	}

	return depth > 0;
}

function _skipAngle(tokens: IToken[], j: number): number {
	let depth = 0;

	while (j < tokens.length) {
		const v = tokens[j].v;

		if (v === '<') {
			depth++;
		}
		else if (v === '>') {
			depth--;

			if (depth === 0) {
				return j + 1;
			}
		}
		else if (v === '(' || v === '[' || v === '{') {
			j = matchBracket(tokens, j);
		}

		j++;
	}

	return j;
}

/**
 * Returns the index after the statement that starts at `i`: the first `;` at
 * bracket depth 0, or the token before the next top level keyword when the
 * statement has no semicolon.
 */
function _skipStatement(tokens: IToken[], i: number): number {
	let j = i;

	while (j < tokens.length) {
		const token = tokens[j];

		if (
			token.t === 'p' &&
			(token.v === '(' || token.v === '[' || token.v === '{')
		) {
			j = matchBracket(tokens, j) + 1;

			const next = tokens[j];

			// A declaration such as "interface X {...}" or "enum X {...}"
			// ends at its closing brace.

			if (
				token.v === '{' &&
				next &&
				next.t === 'id' &&
				[
					'const',
					'export',
					'function',
					'import',
					'class',
					'let',
					'type',
					'interface',
				].includes(next.v) &&
				DECLARATION_SKIP.has(tokens[i].v)
			) {
				return j;
			}

			continue;
		}

		if (token.t === 'p' && token.v === ';') {
			return j + 1;
		}

		if (
			j > i &&
			token.t === 'id' &&
			['export', 'import'].includes(token.v) &&
			tokens[j + 1]?.v !== '(' &&
			tokens[j - 1]?.v !== '.'
		) {
			return j;
		}

		j++;
	}

	return j;
}
