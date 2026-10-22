/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Builds the comparison of a head with its base, and prints the actions that
 * the head adds and the ones it resolves. It is a shorter way to run
 *
 *   node tools/visuals/build.ts --base <base> [--ref <head>] workspace-health
 *
 * Usage:
 *
 *   node tools/visuals/diff.ts [base] [head]
 *
 * Each ref is a branch, a tag, or a commit hash. The head defaults to the
 * working tree, and the base to liferay-one/master-temp, or upstream/master
 * when that remote is missing. The comparison starts from the merge base of
 * the two, as on a GitHub compare page.
 */

import {spawnSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {resolveBase, resolveCommit} from './checkout.ts';
import {actionKey} from './lib.ts';

import type {IAction} from './lib.ts';

const BUILD_DIR =
	process.env.VIZ_BUILD_DIR ?? path.join(import.meta.dirname, 'build');

const [baseRef = null, headRef = null] = process.argv
	.slice(2)
	.filter((arg) => !arg.startsWith('--'));

const base = resolveBase(baseRef, resolveCommit(headRef ?? 'HEAD'));

if (!base) {
	console.error(
		'No base branch. Name a base: node tools/visuals/diff.ts <base> [head]'
	);

	process.exit(1);
}

const status = spawnSync(
	process.execPath,
	[
		path.join(import.meta.dirname, 'build.ts'),
		'--base',
		base.ref,
		...(headRef ? ['--ref', headRef] : []),
		'workspace-health',
	],
	{stdio: 'inherit'}
).status;

// A build that fails or is killed leaves the data of an earlier build, which
// names other refs.

if (status !== 0) {
	process.exit(status ?? 1);
}

const data = JSON.parse(
	fs.readFileSync(path.join(BUILD_DIR, 'workspace-health.data.json'), 'utf8')
);

const added = new Set<string>(data.comparison.diff.added);

const newActions = data.actions.filter((action: IAction) =>
	added.has(actionKey(action))
);

console.log(`\n${newActions.length} new action(s):`);

for (const action of newActions) {
	console.log(`  [${action.severity}] ${action.visual}: ${action.title}`);
}

console.log(`\n${data.comparison.diff.resolved.length} resolved action(s):`);

for (const action of data.comparison.diff.resolved) {
	console.log(`  ${action.visual}: ${action.title}`);
}
