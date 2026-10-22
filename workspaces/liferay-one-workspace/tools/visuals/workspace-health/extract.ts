/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The front door of the visuals. Every action that the visuals find comes
 * here, sorted by layer, and the Model, View, and Controller tabs show the
 * visuals of their layer after the actions. This page adds the actions that
 * span the layers: the dependencies, the bundle health of the custom
 * element, the tests, and the specs. It also shows where each action is
 * tracked and how old each snapshot is. In a comparison, built with --base,
 * it also marks the actions that the head adds and lists the ones it
 * resolves, reads the deltas of its own sections from the base, and shows
 * the Lifecycle tab: the artifact of each phase of the change.
 *
 * The problems are a pinned resolution with no reason, a reason with no
 * pin, and an accepted advisory that no locked package has any more. The
 * counts themselves are data for the page and do not fail `yarn viz:check`.
 */

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {forLayer} from '../changes.ts';
import {
	CUSTOM_ELEMENT_DIR,
	WORKSPACE_ROOT,
	actionKey,
	inputFile,
	readJSON,
} from '../lib.ts';
import {readBundle} from './bundle.ts';
import {readDependencies} from './dependencies.ts';
import {readHotspots} from './hotspots.ts';
import {readHead, readLifecycle} from './lifecycle.ts';
import {readSpecs} from './specs.ts';
import {HISTORY_FILE, readTests} from './tests.ts';

import type {IAction, IChanges, IExtractContext, IExtraction} from '../lib.ts';

const ENVIRONMENT_SNAPSHOTS_DIR = path.join(
	import.meta.dirname,
	'..',
	'environment-drift',
	'snapshots'
);

/**
 * The advisories that the team accepted, each with the reason. An accepted
 * advisory is not an action.
 */
const ACCEPTED_VULNERABILITIES = readJSON<Record<string, string>>(
	inputFile(import.meta.dirname, 'vulnerabilities.json')
);

/**
 * A ticket key or a Go-Live Tasks ID in the text of an action says where it
 * is tracked.
 */
const TRACKING = /\b(Go-Live Tasks [A-Z]\d+|(?:LCD|LPD|LPS|LRCI|LRSD)-\d+)\b/;

export function extract(context?: IExtractContext): IExtraction {
	const problems: string[] = [];

	const bundle = readBundle();
	const dependencies = readDependencies(problems);

	if (dependencies.snapshot) {
		for (const id of Object.keys(ACCEPTED_VULNERABILITIES)) {
			if (
				!dependencies.snapshot.vulnerabilities.some(
					(vulnerability) => vulnerability.id === id
				)
			) {
				problems.push(
					`workspace-health/vulnerabilities.json accepts ${id}, which no locked package has any more. Remove the entry.`
				);
			}
		}
	}
	const specs = readSpecs();
	const tests = readTests();

	const own: IAction[] = [
		...specs.actions.map((action) => ({
			...action,
			kind: 'finding' as const,
			layer: 'workspace',
			section: 'specs',
			tracked: null,
			visual: 'workspace-health',
		})),
		..._bundleActions(bundle),
		..._dependencyActions(dependencies),
		..._testActions(tests),
	];

	const actions = [...(context?.actions ?? []), ...own].map((action) => ({
		...action,
		tracked:
			action.tracked ??
			TRACKING.exec(`${action.title} ${action.detail ?? ''}`)?.[1] ??
			null,
	}));

	const comparison = context?.comparison ?? null;

	const head = readHead();

	const lifecycle = readLifecycle(comparison, head);

	const baseHealth = context?.base?.data['workspace-health'] as
		| undefined
		| {
				actions: IAction[];
				dependencies: typeof dependencies;
				specs: typeof specs.specs;
				tests: typeof tests;
		  };

	return {
		data: {
			actions,
			bundle,
			changes: _changeCounts(context?.changes ?? {}),
			comparison: comparison && {
				...comparison,
				deltas: {
					dependencies: _dependencyDelta(
						baseHealth?.dependencies ?? null,
						dependencies
					),
					markers: _markerDelta(baseHealth?.tests ?? null, tests),
					specs: _specDelta(baseHealth?.specs ?? null, specs.specs),
				},
				diff: _actionDiff(
					baseHealth?.actions ?? context?.base?.actions ?? [],
					actions
				),
			},
			dependencies,
			freshness: _freshness(dependencies.snapshot?.fetched ?? null),
			generated: new Date().toISOString().slice(0, 10),
			github: _github(head),
			head,
			hotspots: readHotspots(),
			lifecycle,
			mode: comparison ? 'diff' : 'snapshot',
			places: context?.places ?? {},
			specs: specs.specs,
			tests,
			visuals: context?.visuals ?? {},
		},
		problems,
	};
}

/**
 * The actions that the head adds to the base, by key, and the ones that it
 * resolves.
 */
function _actionDiff(baseActions: IAction[], headActions: IAction[]) {
	const baseKeys = new Set(baseActions.map(actionKey));
	const headKeys = new Set(headActions.map(actionKey));

	return {
		added: [
			...new Set(
				headActions
					.filter((action) => !baseKeys.has(actionKey(action)))
					.map(actionKey)
			),
		],
		resolved: [
			...new Map(
				baseActions
					.filter((action) => !headKeys.has(actionKey(action)))
					.map((action) => [actionKey(action), action])
			).values(),
		].map((action) => ({
			layer: action.layer,
			severity: action.severity,
			title: action.title,
			visual: action.visual,
		})),
	};
}

/**
 * The added, changed, and removed counts of each visual that a comparison
 * marks, in all and for each layer, because a visual such as the rules
 * shows in a tab of each layer. Null means that the extractor failed at the
 * base.
 */
function _changeCounts(changes: Record<string, IChanges | null>) {
	return Object.fromEntries(
		Object.entries(changes).map(([visual, change]) => [
			visual,
			change && {
				...change.counts,
				layers: Object.fromEntries(
					['controller', 'model', 'view'].map((layer) => [
						layer,
						forLayer(change, layer).counts,
					])
				),
			},
		])
	);
}

/**
 * The dependencies that the head adds, removes, or declares or locks at
 * another version.
 */
function _dependencyDelta(
	base: null | ReturnType<typeof readDependencies>,
	head: ReturnType<typeof readDependencies>
) {
	if (!base) {
		return null;
	}

	const key = (dependency: {ecosystem: string; name: string}) =>
		`${dependency.ecosystem}:${dependency.name}`;

	const before = new Map(
		base.dependencies.map((dependency) => [key(dependency), dependency])
	);
	const after = new Map(
		head.dependencies.map((dependency) => [key(dependency), dependency])
	);

	const describe = (dependency?: {declared: string; version?: string}) =>
		dependency ? dependency.version ?? dependency.declared : null;

	return [
		...[...after].map(([name, dependency]) => ({
			after: describe(dependency),
			before: describe(before.get(name)),
			ecosystem: dependency.ecosystem,
			kind: dependency.kind,
			name: dependency.name,
		})),
		...[...before]
			.filter(([name]) => !after.has(name))
			.map(([, dependency]) => ({
				after: null,
				before: describe(dependency),
				ecosystem: dependency.ecosystem,
				kind: dependency.kind,
				name: dependency.name,
			})),
	]
		.filter((dependency) => dependency.before !== dependency.after)
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The tests that the head newly skips or focuses, and the ones it enables
 * again. A marker is the same at two refs when its file, kind, and text are.
 */
function _markerDelta(
	base: null | ReturnType<typeof readTests>,
	head: ReturnType<typeof readTests>
) {
	if (!base) {
		return null;
	}

	const key = (marker: {file: string; kind: string; text: string}) =>
		`${marker.file}\u0000${marker.kind}\u0000${marker.text}`;

	const baseKeys = new Set(base.markers.map(key));
	const headKeys = new Set(head.markers.map(key));

	return {
		added: head.markers.filter((marker) => !baseKeys.has(key(marker))),
		removed: base.markers.filter((marker) => !headKeys.has(key(marker))),
	};
}

/**
 * The names in backticks that each spec newly misses, and the ones it no
 * longer misses, because the code or the spec changed.
 */
function _specDelta(
	base: null | ReturnType<typeof readSpecs>['specs'],
	head: ReturnType<typeof readSpecs>['specs']
) {
	if (!base) {
		return null;
	}

	const missing = (specs: typeof head) =>
		new Set(
			specs.flatMap((spec) =>
				spec.references
					.filter((reference) => !reference.ok)
					.map((reference) => `${spec.file}\u0000${reference.name}`)
			)
		);

	const before = missing(base);
	const after = missing(head);

	const split = (key: string) => {
		const [file, name] = key.split('\u0000');

		return {file, name};
	};

	return {
		fixed: [...before].filter((key) => !after.has(key)).map(split),
		stale: [...after].filter((key) => !before.has(key)).map(split),
	};
}

/**
 * The source files that no import reaches, the files that only a test
 * reaches, and the language keys with no translation.
 */
function _bundleActions(bundle: ReturnType<typeof readBundle>): IAction[] {
	const actions: IAction[] = [];

	const base = {
		kind: 'finding' as const,
		layer: 'workspace',
		section: 'bundle',
		tracked: null,
		visual: 'workspace-health',
	};

	if (bundle.files.unreachable.length) {
		actions.push({
			...base,
			detail: bundle.files.unreachable.join(', '),
			severity: 'low',
			source: 'client-extensions/liferay-one-custom-element/src',
			title: `${bundle.files.unreachable.length} source files that no import reaches`,
		});
	}

	if (bundle.files.testOnly.length) {
		actions.push({
			...base,
			detail: `${bundle.files.testOnly.join(', ')}. Only a test imports these files, so the app does not use them.`,
			severity: 'low',
			source: bundle.files.testOnly[0],
			title: `${bundle.files.testOnly.length} source files that only a test reaches`,
		});
	}

	for (const locale of bundle.languageKeys?.locales ?? []) {
		if (locale.missing) {
			actions.push({
				...base,
				detail: `en_US.ts has ${locale.missing} keys that ${locale.locale}.ts does not translate, so the page shows English to those users.`,
				severity: 'low',
				source: `client-extensions/liferay-one-custom-element/src/i18n/${locale.locale}.ts`,
				title: `${locale.missing} language keys have no ${locale.locale} translation`,
			});
		}
	}

	return actions;
}

function _dependencyActions(
	dependencies: ReturnType<typeof readDependencies>
): IAction[] {
	const actions: IAction[] = [];

	const base = {
		kind: 'finding' as const,
		layer: 'workspace',
		section: 'bundle',
		tracked: null,
		visual: 'workspace-health',
	};

	const severe = (dependencies.snapshot?.vulnerabilities ?? []).filter(
		(vulnerability) =>
			!ACCEPTED_VULNERABILITIES[vulnerability.id] &&
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
 * link to its source. VIZ_GITHUB_REF sets the branch. A report at a ref
 * links to that commit, and a report of the working tree to master-temp on
 * the liferay-one fork by default.
 */
function _github(head: {sha: string; worktree: boolean}): null | string {
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
			(!head.worktree
				? head.sha
				: remote === 'liferay-one'
					? 'master-temp'
					: 'master');

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
		section: 'tests',
		tracked: null,
		visual: 'workspace-health',
	};

	const skipped = tests.markers.filter((marker) => marker.kind === 'skip');

	const failingSuites = [
		...new Set(tests.failing.map((testCase) => testCase.suite)),
	];

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
		...failingSuites.map((suite) => {
			const failing = tests.failing.filter(
				(testCase) => testCase.suite === suite
			);
			const always = failing.filter((testCase) => !testCase.passes);

			return {
				...base,
				detail: `${always.length} of them failed in every recorded run, so they are broken, not flaky. ${failing
					.slice(0, 5)
					.map((testCase) => testCase.id)
					.join(
						'; '
					)}${failing.length > 5 ? `; and ${failing.length - 5} more` : ''}. Fix each test or the code it covers, or skip it with a ticket.`,
				item: failing.length === 1 ? failing[0].id : undefined,
				severity: 'high' as const,
				title: `${failing.length} ${suite} tests failed in their latest run`,
			};
		}),
		...tests.flaky.slice(0, 10).map((testCase) => ({
			...base,
			detail: `Failed ${testCase.failures} of ${testCase.runs} recorded runs of ${testCase.suite}, and passed the others.`,
			item: testCase.id,
			severity: 'medium' as const,
			title: `Flaky test: ${testCase.id}`,
		})),
	];
}
