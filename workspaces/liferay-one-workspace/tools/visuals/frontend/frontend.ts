/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the weight and the dead code of liferay-one-custom-element: the size
 * of the last build, the source files that no import reaches, and the
 * language keys that no source file uses.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

import {CUSTOM_ELEMENT_DIR, listFiles, relative} from '../lib.ts';
import {ModuleGraph} from '../apis/modules.ts';

const BUILD_DIR = path.join(CUSTOM_ELEMENT_DIR, 'build/vite');

const I18N_DIR = path.join(CUSTOM_ELEMENT_DIR, 'src/i18n');

const IMPORT =
	/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;

const SRC_DIR = path.join(CUSTOM_ELEMENT_DIR, 'src');

const TEST = /\.test\.tsx?$/;

export function readFrontend() {
	return {
		build: _build(),
		files: _files(),
		languageKeys: _languageKeys(),
	};
}

function _build() {
	if (!fs.existsSync(BUILD_DIR)) {
		return null;
	}

	const files = listFiles(BUILD_DIR, () => true).map((file) => {
		const content = fs.readFileSync(file);

		return {
			file: path.relative(BUILD_DIR, file),
			gzip: /\.(css|js|svg|json|html)$/.test(file)
				? zlib.gzipSync(content).length
				: content.length,
			size: content.length,
		};
	});

	return {
		built: fs.statSync(BUILD_DIR).mtime.toISOString(),
		files: files.sort((a, b) => b.size - a.size),
	};
}

/**
 * Follows every import from src/main.tsx, then from the test files. A file
 * that only a test reaches is test only. A file that nothing reaches is
 * unreachable.
 */
function _files() {
	const graph = new ModuleGraph(SRC_DIR);

	const sources = listFiles(
		SRC_DIR,
		(file) => /\.tsx?$/.test(file) && !file.endsWith('.d.ts')
	);

	const reach = (entries: string[], seen: Set<string>) => {
		const queue = [...entries];

		while (queue.length) {
			const file = queue.pop()!;

			if (seen.has(file)) {
				continue;
			}

			seen.add(file);

			const text = fs.readFileSync(file, 'utf8');

			for (const match of text.matchAll(IMPORT)) {
				const target = graph.resolve(file, match[1] ?? match[2]);

				if (target && !seen.has(target)) {
					queue.push(target);
				}
			}
		}

		return seen;
	};

	const fromApp = reach([path.join(SRC_DIR, 'main.tsx')], new Set());

	const tests = sources.filter((file) => TEST.test(file));

	const fromTests = reach(
		[...tests, path.join(SRC_DIR, 'testSetup.ts')].filter((file) =>
			fs.existsSync(file)
		),
		new Set()
	);

	const unreached = sources.filter(
		(file) => !TEST.test(file) && !fromApp.has(file)
	);

	return {
		app: [...fromApp].filter((file) => !TEST.test(file)).length,
		sources: sources.length - tests.length,
		testOnly: unreached
			.filter((file) => fromTests.has(file))
			.map((file) => relative(file)),
		tests: tests.length,
		unreachable: unreached
			.filter((file) => !fromTests.has(file))
			.map((file) => relative(file)),
	};
}

/**
 * Compares the keys in en_US.ts with the string literals in the source, and
 * each other locale with en_US.ts.
 */
function _languageKeys() {
	const keysOf = (file: string) =>
		[
			...fs
				.readFileSync(file, 'utf8')
				.matchAll(/^\s*(?:'([^']+)'|"([^"]+)"|([\w$]+))\s*:/gm),
		].map((match) => match[1] ?? match[2] ?? match[3]);

	const english = path.join(I18N_DIR, 'en_US.ts');

	if (!fs.existsSync(english)) {
		return null;
	}

	const keys = keysOf(english);

	const literals = new Set<string>();

	for (const file of listFiles(
		SRC_DIR,
		(filePath) => /\.tsx?$/.test(filePath) && !filePath.startsWith(I18N_DIR)
	)) {
		for (const match of fs
			.readFileSync(file, 'utf8')
			.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
			literals.add(match[2]);
		}
	}

	// A key that the code builds at run time, such as `status-${value}`, is
	// not a literal, so a key that starts with a literal prefix that ends in
	// a hyphen counts as used.

	const prefixes = [...literals].filter((literal) => literal.endsWith('-'));

	const unused = keys.filter(
		(key) =>
			!literals.has(key) &&
			!prefixes.some((prefix) => key.startsWith(prefix))
	);

	const locales = fs
		.readdirSync(I18N_DIR)
		.filter((file) => /^[a-z]{2}_[A-Z]{2}\.ts$/.test(file))
		.filter((file) => file !== 'en_US.ts')
		.map((file) => {
			const localeKeys = new Set(keysOf(path.join(I18N_DIR, file)));

			return {
				locale: file.replace(/\.ts$/, ''),
				missing: keys.filter((key) => !localeKeys.has(key)).length,
			};
		});

	return {keys: keys.length, locales, unused};
}
