/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the declared dependencies of the workspace: the package.json files
 * and the versions that yarn.lock resolves, the Gradle dependencies of each
 * client extension, the pinned resolutions, and the DXP product. The latest
 * versions and the known vulnerabilities come from the snapshot that
 * `yarn viz:deps` writes, because the build never calls the network.
 */

import * as fs from 'fs';
import * as path from 'path';

import {WORKSPACE_ROOT, listFiles, readJSON, relative} from '../lib.ts';

export interface IDependency {
	declared: string;
	ecosystem: 'Maven' | 'npm';
	files: string[];
	kind: string;
	name: string;
	version: null | string;
}

export interface IDependencySnapshot {
	fetched: string;
	latest: Record<string, null | string>;
	vulnerabilities: {
		aliases: string[];
		id: string;
		packages: string[];
		severity: null | string;
		summary: string;
	}[];
}

const GRADLE_DEPENDENCY =
	/^\s*(\w+)\s+group:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*version:\s*"([^"]+)"/gm;

const PACKAGE_FILES = [
	'package.json',
	'client-extensions/liferay-one-custom-element/package.json',
	'tests/package.json',
	'tools/eslint-plugin-local/package.json',
];

export const SNAPSHOT_FILE = path.join(
	import.meta.dirname,
	'snapshots',
	'dependencies.json'
);

export function readDependencies(problems: string[]) {
	const lock = readLockfile();
	const pins = readJSON<Record<string, string>>(
		path.join(import.meta.dirname, 'pins.json')
	);

	const dependencies = new Map<string, IDependency>();

	const add = (dependency: IDependency) => {
		const key = `${dependency.ecosystem}:${dependency.name}:${dependency.declared}`;

		const existing = dependencies.get(key);

		if (existing) {
			existing.files.push(...dependency.files);
		}
		else {
			dependencies.set(key, dependency);
		}
	};

	const resolutions: {
		name: string;
		reason: null | string;
		version: string;
	}[] = [];

	for (const packageFile of PACKAGE_FILES) {
		const filePath = path.join(WORKSPACE_ROOT, packageFile);

		if (!fs.existsSync(filePath)) {
			continue;
		}

		const json = readJSON(filePath);

		for (const kind of ['dependencies', 'devDependencies'] as const) {
			for (const [name, declared] of Object.entries<string>(
				json[kind] ?? {}
			)) {
				if (
					declared.startsWith('file:') ||
					declared.startsWith('workspace:')
				) {
					continue;
				}

				add({
					declared,
					ecosystem: 'npm',
					files: [packageFile],
					kind: kind === 'dependencies' ? 'runtime' : 'development',
					name,
					version: lock.get(`${name}@${declared}`) ?? null,
				});
			}
		}

		for (const [name, version] of Object.entries<string>(
			json.resolutions ?? {}
		)) {
			resolutions.push({name, reason: pins[name] ?? null, version});

			if (!pins[name]) {
				problems.push(
					`${packageFile} pins ${name} to ${version} in resolutions, and workspace-health/pins.json does not give the reason. Add the reason, or remove the pin.`
				);
			}
		}
	}

	for (const name of Object.keys(pins)) {
		if (!resolutions.some((resolution) => resolution.name === name)) {
			problems.push(
				`workspace-health/pins.json gives a reason for pinning ${name}, but no package.json pins it. Remove the entry.`
			);
		}
	}

	for (const buildFile of listFiles(
		path.join(WORKSPACE_ROOT, 'client-extensions'),
		(file) => path.basename(file) === 'build.gradle'
	)) {
		const text = fs.readFileSync(buildFile, 'utf8');

		for (const match of text.matchAll(GRADLE_DEPENDENCY)) {
			add({
				declared: match[4],
				ecosystem: 'Maven',
				files: [relative(buildFile)],
				kind: match[1],
				name: `${match[2]}:${match[3]}`,
				version: /^latest\./.test(match[4]) ? null : match[4],
			});
		}
	}

	const snapshot = fs.existsSync(SNAPSHOT_FILE)
		? readJSON<IDependencySnapshot>(SNAPSHOT_FILE)
		: null;

	const duplicates = [...lock.byName.entries()]
		.filter(([, versions]) => versions.size > 1)
		.map(([name, versions]) => ({name, versions: [...versions].sort()}))
		.sort(
			(a, b) =>
				b.versions.length - a.versions.length ||
				a.name.localeCompare(b.name)
		);

	return {
		dependencies: [...dependencies.values()].sort(
			(a, b) =>
				a.ecosystem.localeCompare(b.ecosystem) ||
				a.name.localeCompare(b.name)
		),
		duplicates,
		locked: lock.byName.size,
		product: _product(),
		resolutions,
		snapshot,
	};
}

/**
 * Reads yarn.lock (v1). Returns the version for each "name@range" key, and
 * every resolved version by package name.
 */
export function readLockfile(): Map<string, string> & {
	byName: Map<string, Set<string>>;
} {
	const versions = new Map<string, string>() as Map<string, string> & {
		byName: Map<string, Set<string>>;
	};

	versions.byName = new Map();

	const lockFile = path.join(WORKSPACE_ROOT, 'yarn.lock');

	if (!fs.existsSync(lockFile)) {
		return versions;
	}

	let keys: string[] = [];

	for (const line of fs.readFileSync(lockFile, 'utf8').split('\n')) {
		if (/^\S.*:$/.test(line) && !line.startsWith('#')) {
			keys = line
				.slice(0, -1)
				.split(/,\s*/)
				.map((key) => key.replace(/^"|"$/g, ''));

			continue;
		}

		const version = /^\s+version "([^"]+)"/.exec(line)?.[1];

		if (!version) {
			continue;
		}

		for (const key of keys) {
			versions.set(key, version);

			const name = key.slice(0, key.lastIndexOf('@'));

			if (!versions.byName.has(name)) {
				versions.byName.set(name, new Set());
			}

			versions.byName.get(name)!.add(version);
		}
	}

	return versions;
}

/**
 * Reads liferay.workspace.product and counts the quarterly releases between
 * it and the current quarter.
 */
function _product() {
	const gradleProperties = path.join(WORKSPACE_ROOT, 'gradle.properties');

	if (!fs.existsSync(gradleProperties)) {
		return null;
	}

	const product = /^liferay\.workspace\.product=(.+)$/m.exec(
		fs.readFileSync(gradleProperties, 'utf8')
	)?.[1];

	const match = product && /(\d{4})\.q(\d)/.exec(product);

	if (!match) {
		return product ? {behind: null, product} : null;
	}

	const now = new Date();

	const behind =
		(now.getFullYear() - Number(match[1])) * 4 +
		(Math.floor(now.getMonth() / 3) + 1 - Number(match[2]));

	return {behind, product};
}
