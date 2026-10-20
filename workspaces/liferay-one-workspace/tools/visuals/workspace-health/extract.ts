/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The front door of the visuals. The Model, View, and Controller pages show
 * the current state, and every action that they find comes here, sorted by
 * layer. This page adds the actions that span the layers: the dependencies,
 * the tests, and the specs. It also shows where each action is tracked, how
 * old each snapshot is, and, after `yarn viz:diff`, which actions the current
 * branch adds.
 *
 * The problems are a pinned resolution with no reason, and a reason with no
 * pin. The counts themselves are data for the page and do not fail
 * `yarn viz:check`.
 */

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {CUSTOM_ELEMENT_DIR, WORKSPACE_ROOT, readJSON} from '../lib.ts';
import {readDependencies} from './dependencies.ts';
import {readHotspots} from './hotspots.ts';
import {readSpecs} from './specs.ts';
import {HISTORY_FILE, readTests} from './tests.ts';

import type {IAction, IExtractContext, IExtraction} from '../lib.ts';

const DIFF_FILE = path.join(import.meta.dirname, '..', 'build', 'diff.json');

const ENVIRONMENT_SNAPSHOTS_DIR = path.join(
	import.meta.dirname,
	'..',
	'environment-drift',
	'snapshots'
);

/**
 * A ticket key or a Go-Live Tasks ID in the text of an action says where it
 * is tracked.
 */
const TRACKING = /\b(Go-Live Tasks [A-Z]\d+|(?:LCD|LPD|LPS|LRCI|LRSD)-\d+)\b/;

export function extract(context?: IExtractContext): IExtraction {
	const problems: string[] = [];

	const dependencies = readDependencies(problems);
	const specs = readSpecs();
	const tests = readTests();

	const own: IAction[] = [
		...specs.actions.map((action) => ({
			...action,
			kind: 'finding' as const,
			layer: 'workspace',
			tracked: null,
			visual: 'workspace-health',
		})),
		..._testActions(tests),
		..._dependencyActions(dependencies),
	];

	const actions = [...(context?.actions ?? []), ...own].map((action) => ({
		...action,
		tracked:
			action.tracked ??
			TRACKING.exec(`${action.title} ${action.detail ?? ''}`)?.[1] ??
			null,
	}));

	return {
		data: {
			actions,
			dependencies,
			diff: fs.existsSync(DIFF_FILE) ? readJSON(DIFF_FILE) : null,
			freshness: _freshness(dependencies.snapshot?.fetched ?? null),
			generated: new Date().toISOString().slice(0, 10),
			github: _github(),
			hotspots: readHotspots(),
			places: context?.places ?? {},
			specs: specs.specs,
			tests,
			visuals: context?.visuals ?? {},
		},
		problems,
	};
}

function _dependencyActions(
	dependencies: ReturnType<typeof readDependencies>
): IAction[] {
	const actions: IAction[] = [];

	const base = {
		kind: 'finding' as const,
		layer: 'workspace',
		tracked: null,
		visual: 'workspace-health',
	};

	const severe = (dependencies.snapshot?.vulnerabilities ?? []).filter(
		(vulnerability) =>
			['CRITICAL', 'HIGH'].includes(
				(vulnerability.severity ?? '').toUpperCase()
			)
	);

	if (severe.length) {
		actions.push({
			...base,
			detail: `The locked versions of ${[...new Set(severe.flatMap((vulnerability) => vulnerability.packages))].join(', ')} have known critical or high vulnerabilities. Upgrade them, or pin a fixed version in resolutions.`,
			severity: 'high',
			source: 'yarn.lock',
			title: `${severe.length} critical or high vulnerabilities in locked packages`,
		});
	}

	const floating = dependencies.dependencies.filter(
		(dependency) =>
			/^latest\./.test(dependency.declared) && !dependency.reason
	);

	if (floating.length) {
		actions.push({
			...base,
			detail: `${floating.map((dependency) => dependency.name).join(', ')} resolve to whatever version is newest when the build runs, so the same commit can build differently. Pin each one.`,
			severity: 'medium',
			source: floating[0].files[0],
			title: `${floating.length} Gradle dependencies use latest.release`,
		});
	}

	return actions;
}

/**
 * Returns the age of each snapshot that a page reads, and the command that
 * refreshes it.
 */
function _freshness(dependenciesFetched: null | string) {
	const environments = fs.existsSync(ENVIRONMENT_SNAPSHOTS_DIR)
		? fs
				.readdirSync(ENVIRONMENT_SNAPSHOTS_DIR)
				.filter((file) => file.endsWith('.json'))
				.map((file) => ({
					command: `yarn viz:env ${file.replace(/\.json$/, '')}`,
					date: readJSON(path.join(ENVIRONMENT_SNAPSHOTS_DIR, file))
						.fetched as string,
					name: `Environment ${file.replace(/\.json$/, '')}`,
				}))
		: [];

	const history = fs.existsSync(HISTORY_FILE)
		? readJSON<{date: string}[]>(HISTORY_FILE)
		: [];

	const build = path.join(CUSTOM_ELEMENT_DIR, 'build/vite');

	return [
		...environments,
		{
			command: 'yarn viz:deps',
			date: dependenciesFetched,
			name: 'Dependencies',
		},
		{
			command: 'yarn viz:tests',
			date:
				history
					.map((run) => run.date)
					.sort()
					.pop() ?? null,
			name: 'Test runs',
		},
		{
			command: 'yarn build in liferay-one-custom-element',
			date: fs.existsSync(build)
				? fs.statSync(build).mtime.toISOString()
				: null,
			name: 'Front end build',
		},
	];
}

/**
 * Returns the base URL of the workspace on GitHub, so that an action can
 * link to its source. VIZ_GITHUB_REF sets the branch, which is master-temp
 * on the liferay-one fork by default.
 */
function _github(): null | string {
	try {
		const run = (...args: string[]) =>
			execFileSync('git', args, {
				cwd: WORKSPACE_ROOT,
				encoding: 'utf8',
			}).trim();

		const remotes = run('remote').split('\n');

		const remote = ['liferay-one', 'upstream', 'origin'].find((name) =>
			remotes.includes(name)
		);

		if (!remote) {
			return null;
		}

		const slug = /github\.com[:/]([^/]+\/[^/.]+)/.exec(
			run('remote', 'get-url', remote)
		)?.[1];

		const ref =
			process.env.VIZ_GITHUB_REF ??
			(remote === 'liferay-one' ? 'master-temp' : 'master');

		return slug
			? `https://github.com/${slug}/blob/${ref}/${run('rev-parse', '--show-prefix')}`
			: null;
	}
	catch {
		return null;
	}
}

function _testActions(tests: ReturnType<typeof readTests>): IAction[] {
	const base = {
		kind: 'finding' as const,
		layer: 'workspace',
		tracked: null,
		visual: 'workspace-health',
	};

	const skipped = tests.markers.filter((marker) => marker.kind === 'skip');

	return [
		...tests.markers
			.filter((marker) => marker.kind === 'only')
			.map((marker) => ({
				...base,
				detail: `${marker.text} A focused test makes the suite run only that test, so every other test stops running in CI.`,
				item: `${marker.file}:${marker.line}`,
				severity: 'high' as const,
				source: `${marker.file}:${marker.line}`,
				title: 'A test is focused with .only',
			})),
		...(skipped.length
			? [
					{
						...base,
						detail: `No run executes these tests. Fix and enable each one, or delete it.`,
						severity: 'low' as const,
						source: `${skipped[0].file}:${skipped[0].line}`,
						title: `${skipped.length} tests are skipped or disabled`,
					},
				]
			: []),
		...tests.flaky.slice(0, 10).map((testCase) => ({
			...base,
			detail: `Failed ${testCase.failures} of ${testCase.runs} recorded runs of ${testCase.suite}, and passed the others.`,
			item: testCase.id,
			severity: 'medium' as const,
			title: `Flaky test: ${testCase.id}`,
		})),
	];
}
