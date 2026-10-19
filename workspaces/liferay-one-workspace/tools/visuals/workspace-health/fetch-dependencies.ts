/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Reads the latest version of each declared dependency, and the known
 * vulnerabilities of every locked npm package and every fixed Maven version,
 * into snapshots/dependencies.json. The audit tracker reads that file, so
 * `yarn viz` itself never calls the network.
 *
 * Usage:
 *
 *   node tools/visuals/workspace-health/fetch-dependencies.ts
 *
 * The latest versions come from registry.npmjs.org and repo1.maven.org. The
 * vulnerabilities come from the OSV database at api.osv.dev.
 */

import * as fs from 'fs';
import * as path from 'path';

import {SNAPSHOT_FILE, readDependencies, readLockfile} from './dependencies.ts';

import type {IDependencySnapshot} from './dependencies.ts';

const OSV_BATCH_SIZE = 500;

const PARALLEL = 8;

const {dependencies} = readDependencies([]);

const latest: Record<string, null | string> = {};

await _parallel(
	[
		...new Set(
			dependencies.map(
				(dependency) => `${dependency.ecosystem}:${dependency.name}`
			)
		),
	],
	async (key) => {
		const [ecosystem, ...rest] = key.split(':');

		latest[key] = await (
			ecosystem === 'npm'
				? _latestNPM(rest.join(':'))
				: _latestMaven(rest.join(':'))
		).catch(() => null);
	}
);

console.log(
	`Read the latest version of ${Object.values(latest).filter(Boolean).length} of ${Object.keys(latest).length} dependencies.`
);

const queries: {name: string; version: string; ecosystem: string}[] = [];

for (const [name, versions] of readLockfile().byName) {
	for (const version of versions) {
		queries.push({ecosystem: 'npm', name, version});
	}
}

for (const dependency of dependencies) {
	if (dependency.ecosystem === 'Maven' && dependency.version) {
		queries.push({
			ecosystem: 'Maven',
			name: dependency.name,
			version: dependency.version,
		});
	}
}

const affected = new Map<string, Set<string>>();

for (let i = 0; i < queries.length; i += OSV_BATCH_SIZE) {
	const batch = queries.slice(i, i + OSV_BATCH_SIZE);

	const response = await fetch('https://api.osv.dev/v1/querybatch', {
		body: JSON.stringify({
			queries: batch.map((query) => ({
				package: {ecosystem: query.ecosystem, name: query.name},
				version: query.version,
			})),
		}),
		method: 'POST',
	});

	if (!response.ok) {
		throw new Error(`The OSV query returned ${response.status}.`);
	}

	const {results} = (await response.json()) as {
		results: {vulns?: {id: string}[]}[];
	};

	results.forEach((result, index) => {
		for (const vulnerability of result.vulns ?? []) {
			if (!affected.has(vulnerability.id)) {
				affected.set(vulnerability.id, new Set());
			}

			affected
				.get(vulnerability.id)!
				.add(`${batch[index].name}@${batch[index].version}`);
		}
	});
}

const vulnerabilities: IDependencySnapshot['vulnerabilities'] = [];

await _parallel([...affected.keys()], async (id) => {
	const response = await fetch(`https://api.osv.dev/v1/vulns/${id}`);

	const vulnerability = response.ok ? ((await response.json()) as any) : {};

	vulnerabilities.push({
		aliases: vulnerability.aliases ?? [],
		id,
		packages: [...affected.get(id)!].sort(),
		severity: vulnerability.database_specific?.severity ?? null,
		summary: vulnerability.summary ?? '',
	});
});

console.log(
	`Checked ${queries.length} package versions. ${vulnerabilities.length} known vulnerabilities.`
);

fs.mkdirSync(path.dirname(SNAPSHOT_FILE), {recursive: true});

fs.writeFileSync(
	SNAPSHOT_FILE,
	JSON.stringify(
		{
			fetched: new Date().toISOString(),
			latest,
			vulnerabilities: vulnerabilities.sort((a, b) =>
				a.id.localeCompare(b.id)
			),
		} satisfies IDependencySnapshot,
		null,
		'\t'
	)
);

async function _latestMaven(name: string): Promise<null | string> {
	const [group, artifact] = name.split(':');

	const response = await fetch(
		`https://repo1.maven.org/maven2/${group.replaceAll('.', '/')}/${artifact}/maven-metadata.xml`
	);

	if (!response.ok) {
		return null;
	}

	// <release> can name a milestone, so take the newest stable version.

	const stable = [
		...(await response.text()).matchAll(/<version>([^<]+)<\/version>/g),
	]
		.map((match) => match[1])
		.filter(
			(version) =>
				!/alpha|beta|rc|cr\d|-m\d|milestone|snapshot|preview/i.test(
					version
				)
		);

	return stable.at(-1) ?? null;
}

async function _latestNPM(name: string): Promise<null | string> {
	const response = await fetch(
		`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`
	);

	if (!response.ok) {
		return null;
	}

	return ((await response.json()) as {version?: string}).version ?? null;
}

async function _parallel<T>(items: T[], task: (item: T) => Promise<void>) {
	const queue = [...items];

	await Promise.all(
		Array.from({length: PARALLEL}, async () => {
			while (queue.length) {
				await task(queue.shift()!);
			}
		})
	);
}
