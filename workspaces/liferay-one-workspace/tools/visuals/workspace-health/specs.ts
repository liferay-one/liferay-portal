/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Checks the names that the specs put in backticks against the code: object,
 * relationship, picklist, and field external reference codes, sidecar
 * endpoint paths and object REST paths, file paths, and sidecar Java
 * classes. A spec that names something that no longer exists is stale.
 *
 * The check reads only names it can classify. A backtick that holds a
 * command, a value, or a field name is not checked.
 */

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {
	BATCH_DIR,
	SPRING_BOOT_DIR,
	WORKSPACE_ROOT,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';
import {readEndpoints} from '../apis/java.ts';

interface IReference {
	kind: 'class' | 'endpoint' | 'erc' | 'file';
	line: number;
	name: string;
	ok: boolean;
}

const CLASS =
	/^[A-Z][A-Za-z0-9]+(Client|Controller|Exception|Listener|Permission|Resource|Service|Subscriber|Synchronizer|Util|Validator)$/;

const ENDPOINT = /^(?:(GET|POST|PUT|PATCH|DELETE)\s+)?(\/[a-z][\w{}./-]*)$/;

const ERC = /^(?:C|L|LT|R)_[A-Z0-9_]+$/;

const JDK_CLASSES = new Set([
	'ArithmeticException',
	'ClassCastException',
	'IllegalArgumentException',
	'IllegalStateException',
	'IndexOutOfBoundsException',
	'InterruptedException',
	'IOException',
	'NullPointerException',
	'NumberFormatException',
	'RuntimeException',
	'UnsupportedOperationException',
]);

const FILE = /^[\w./-]+\.(java|json|md|properties|sh|ts|tsx|yaml|yml)$/;

const SPECS_DIR = path.join(WORKSPACE_ROOT, 'specs');

export function readSpecs() {
	const ercs = _ercs();

	const javaClasses = new Set(
		listFiles(path.join(SPRING_BOOT_DIR, 'src/main/java'), (file) =>
			file.endsWith('.java')
		).map((file) => path.basename(file, '.java'))
	);

	const sidecarPaths = readEndpoints(
		path.join(SPRING_BOOT_DIR, 'src/main/java')
	).map((endpoint) => endpoint.path);

	const endpoints = sidecarPaths.map(_pattern);

	const prefixes = new Set(
		sidecarPaths.map((endpointPath) => endpointPath.split('/')[1])
	);

	// An object REST path is current when the batch defines the object, or
	// when the code calls it, because some objects come from elsewhere.

	const objectPaths = new Set(
		readJSON<{items: any[]}>(
			path.join(BATCH_DIR, '03-object-definition.batch-engine-data.json')
		).items.map((definition) => definition.restContextPath)
	);

	for (const file of listFiles(
		path.join(WORKSPACE_ROOT, 'client-extensions'),
		(name) => /\.(java|tsx?)$/.test(name) && !name.includes('node_modules')
	)) {
		for (const match of fs
			.readFileSync(file, 'utf8')
			.matchAll(/\/o\/c\/([a-z0-9]+)/g)) {
			objectPaths.add(`/o/c/${match[1]}`);
		}
	}

	const files = _repositoryFiles();

	const specs = listFiles(SPECS_DIR, (file) => file.endsWith('.md')).map(
		(file) => {
			const references: IReference[] = [];
			const seen = new Set<string>();

			fs.readFileSync(file, 'utf8')
				.split('\n')
				.forEach((text, index) => {
					for (const match of text.matchAll(/`([^`\n]+)`/g)) {
						const name = match[1].trim();

						// An integration spec describes the API of another system,
						// so its paths are not sidecar endpoints.

						if (
							file.includes(
								`${path.sep}integrations${path.sep}`
							) &&
							ENDPOINT.test(name)
						) {
							continue;
						}

						const reference = _check(name, path.dirname(file), {
							endpoints,
							ercs,
							files,
							javaClasses,
							objectPaths,
							prefixes,
							sidecarPaths,
						});

						if (
							!reference ||
							seen.has(`${reference.kind}:${name}`)
						) {
							continue;
						}

						seen.add(`${reference.kind}:${name}`);
						references.push({...reference, line: index + 1, name});
					}
				});

			return {file: relative(file), references};
		}
	);

	const stale = specs.filter((spec) =>
		spec.references.some((reference) => !reference.ok)
	);

	return {
		actions: stale.map((spec) => {
			const missing = spec.references.filter(
				(reference) => !reference.ok
			);

			return {
				detail: `It names ${missing.length} thing(s) that the code no longer has, such as ${missing
					.slice(0, 4)
					.map(
						(reference) =>
							`${reference.name} (line ${reference.line})`
					)
					.join(
						', '
					)}. Correct the spec, or restore the code if the spec is right.`,
				item: spec.file,
				severity: (missing.length > 5 ? 'medium' : 'low') as
					| 'low'
					| 'medium',
				source: spec.file,
				title: `${spec.file} is out of date`,
			};
		}),
		specs: specs.filter((spec) => spec.references.length),
	};
}

function _check(
	name: string,
	specDir: string,
	context: {
		endpoints: RegExp[];
		ercs: Set<string>;
		files: {basenames: Set<string>; paths: Set<string>};
		javaClasses: Set<string>;
		objectPaths: Set<string>;
		prefixes: Set<string>;
		sidecarPaths: string[];
	}
): null | Omit<IReference, 'line' | 'name'> {
	if (ERC.test(name)) {
		return {kind: 'erc', ok: context.ercs.has(name)};
	}

	if (CLASS.test(name)) {
		return {
			kind: 'class',
			ok:
				JDK_CLASSES.has(name) ||
				context.javaClasses.has(name) ||
				context.files.basenames.has(`${name}.java`),
		};
	}

	const endpoint = ENDPOINT.exec(name);

	if (
		endpoint &&
		!FILE.test(name) &&
		!name.includes('...') &&
		!name.startsWith('/tmp')
	) {
		const endpointPath = endpoint[2]
			.replace(/(?<!\/)\{[^}]*\}$/, '')
			.replace(/\/$/, '');

		if (endpointPath.startsWith('/o/c/')) {
			const objectPath = endpointPath.split('/').slice(0, 4).join('/');

			return {kind: 'endpoint', ok: context.objectPaths.has(objectPath)};
		}

		// Only a path under a sidecar base path is a sidecar endpoint. Others
		// are custom element routes, Liferay's own APIs, or other hosts.

		const segments = endpointPath.split('/').filter(Boolean);

		if (segments.length < 2 || !context.prefixes.has(segments[0])) {
			return null;
		}

		return {
			kind: 'endpoint',
			ok:
				context.endpoints.some((pattern) =>
					pattern.test(endpointPath)
				) ||
				context.sidecarPaths.some((sidecarPath) =>
					sidecarPath.startsWith(endpointPath + '/')
				),
		};
	}

	if (
		FILE.test(name) &&
		!name.startsWith('~') &&
		!name.includes('*') &&
		!/^[\w-]+\.[\w.-]+\//.test(name)
	) {
		if (name.startsWith('./') || name.startsWith('../')) {
			return {
				kind: 'file',
				ok: fs.existsSync(path.resolve(specDir, name)),
			};
		}

		const filePath = name.replace(
			/^sb\//,
			'client-extensions/liferay-one-etc-spring-boot/src/main/java/com/liferay/one/'
		);

		const ok =
			fs.existsSync(path.join(WORKSPACE_ROOT, filePath)) ||
			(filePath.includes('/')
				? [...context.files.paths].some((file) =>
						file.endsWith(filePath)
					)
				: context.files.basenames.has(filePath));

		return {kind: 'file', ok};
	}

	return null;
}

/**
 * Collects every external reference code in the batch files, including the
 * fields, relationships, and picklist entries nested in them.
 */
function _ercs(): Set<string> {
	const ercs = new Set<string>();

	const walk = (value: any) => {
		if (Array.isArray(value)) {
			value.forEach(walk);
		}
		else if (value && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				if (
					/externalReferenceCode\d?$/i.test(key) &&
					typeof child === 'string'
				) {
					ercs.add(child);
				}

				walk(child);
			}
		}
	};

	for (const file of [
		...listFiles(BATCH_DIR, (name) => name.endsWith('.json')),
		...listFiles(path.join(WORKSPACE_ROOT, 'scripts/seed/data'), (name) =>
			name.endsWith('.json')
		),
	]) {
		walk(readJSON(file));
	}

	return ercs;
}

/**
 * Turns an endpoint path with {placeholders} into a pattern that matches any
 * value in each placeholder, so `/accounts/{id}` and `/accounts/{accountId}`
 * match each other.
 */
function _pattern(endpointPath: string): RegExp {
	const source = endpointPath
		.split(/\{[^}]*\}/)
		.map((part) => part.replace(/[.*+?^$()|[\]\\]/g, '\\$&'))
		.join('(?:\\{[^}]*\\}|[^/]+)');

	return new RegExp(`^${source}$`);
}

/**
 * Lists every file in the repository, not only this workspace, because a
 * spec can name a Liferay core file or class.
 */
function _repositoryFiles(): {basenames: Set<string>; paths: Set<string>} {
	const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
		cwd: WORKSPACE_ROOT,
		encoding: 'utf8',
	}).trim();

	const paths = new Set(
		execFileSync('git', ['ls-files'], {
			cwd: root,
			encoding: 'utf8',
			maxBuffer: 1 << 28,
		})
			.split('\n')
			.filter(Boolean)
	);

	return {
		basenames: new Set([...paths].map((file) => path.basename(file))),
		paths,
	};
}
