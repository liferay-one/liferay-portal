/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the sidecar endpoints: every @GetMapping, @PostMapping, @PutMapping,
 * @PatchMapping, @DeleteMapping, and method level @RequestMapping, joined to
 * the class level @RequestMapping.
 */

import * as fs from 'fs';
import * as path from 'path';

import {listFiles, relative} from '../lib.ts';
import {ClassAuth, mask} from './auth.ts';

import type {IAuth} from './auth.ts';

export interface IEndpoint {
	auth: IAuth;
	controller: string;
	file: string;
	handler: string;
	line: number;
	method: string;
	path: string;
}

const ANNOTATION = /@(Get|Post|Put|Patch|Delete|Request)Mapping\b\s*(\()?/g;

export function readEndpoints(javaDir: string): IEndpoint[] {
	const endpoints: IEndpoint[] = [];

	for (const file of listFiles(javaDir, (name) => name.endsWith('.java'))) {
		const text = fs.readFileSync(file, 'utf8');

		if (!/@(Rest)?Controller\b/.test(text)) {
			continue;
		}

		const classAuth = new ClassAuth(mask(text));
		const controller = path.basename(file, '.java');
		const classIndex = text.search(/\bclass\s+\w+/);

		let basePaths = [''];

		ANNOTATION.lastIndex = 0;

		let match: null | RegExpExecArray;

		while ((match = ANNOTATION.exec(text))) {
			const kind = match[1];

			let args = '';
			let end = match.index + match[0].length;

			if (match[2]) {
				let depth = 1;

				while (end < text.length && depth) {
					if (text[end] === '"') {
						const close = text.indexOf('"', end + 1);

						end = close + 1;

						continue;
					}

					if (text[end] === '(') {
						depth++;
					}
					else if (text[end] === ')') {
						depth--;
					}

					end++;
				}

				args = text.slice(match.index + match[0].length, end - 1);
			}

			const paths = _paths(args);

			if (match.index < classIndex) {
				if (kind === 'Request') {
					basePaths = paths;
				}

				continue;
			}

			let methods = [kind.toUpperCase()];

			if (kind === 'Request') {
				const requestMethods = [
					...args.matchAll(/RequestMethod\.(\w+)/g),
				].map((item) => item[1]);

				methods = requestMethods.length ? requestMethods : ['ANY'];
			}

			const handler =
				/\b(\w+)\s*\(/.exec(
					text.slice(end).replace(/@\w+(\([^)]*\))?/g, '')
				)?.[1] ?? '?';

			const auth = classAuth.classify(end);
			const line = text.slice(0, match.index).split('\n').length;

			for (const base of basePaths) {
				for (const subPath of paths) {
					for (const method of methods) {
						endpoints.push({
							auth,
							controller,
							file: relative(file),
							handler,
							line,
							method,
							path: _join(base, subPath),
						});
					}
				}
			}
		}
	}

	return endpoints;
}

function _join(base: string, subPath: string): string {
	const joined = `/${base}/${subPath}`
		.replace(/\/+/g, '/')
		.replace(/\/$/, '');

	return joined || '/';
}

/**
 * Reads the paths in the arguments of a mapping annotation: one string, a
 * concatenation of strings, or an array of strings, with or without "value ="
 * or "path =".
 */
function _paths(args: string): string[] {
	const pathPart = args
		.replace(/\b(value|path)\s*=\s*/g, '')
		.split(/,\s*(?:method|produces|consumes|params|headers)\s*=/)[0];

	const literals = [...pathPart.matchAll(/"([^"]*)"/g)].map(
		(item) => item[1]
	);

	if (!literals.length) {
		return [''];
	}

	return /^\s*\{/.test(pathPart) ? literals : [literals.join('')];
}
