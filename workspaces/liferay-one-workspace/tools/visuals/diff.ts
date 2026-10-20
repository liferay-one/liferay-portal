/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Lists the actions that the current branch adds to its base, and the ones
 * it resolves. It checks out the base into a temporary sparse worktree that
 * holds only this workspace, runs the current extractors against it, and
 * compares their actions with the actions of the current checkout. The
 * result goes to build/diff.json, which workspace-health reads to mark the
 * new actions. It records HEAD, and workspace-health ignores the file once
 * HEAD moves, so a comparison from another branch or an older commit never
 * shows.
 *
 * Usage:
 *
 *   node tools/visuals/diff.ts [base]
 *
 * The base defaults to the merge base with liferay-one/master-temp, or with
 * upstream/master when that remote is missing. A number in an action's title
 * does not count, so a count that grows is not a new action.
 */

import {execFileSync, spawnSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {WORKSPACE_ROOT} from './lib.ts';

import type {IAction} from './lib.ts';

const BUILD_DIR = path.join(import.meta.dirname, 'build');

const git = (...args: string[]) =>
	execFileSync('git', args, {cwd: WORKSPACE_ROOT, encoding: 'utf8'}).trim();

const prefix = git('rev-parse', '--show-prefix').replace(/\/$/, '');

const base = process.argv[2] ?? _defaultBase();

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'viz-diff-'));

const checkout = path.join(temporary, 'base');

console.log(`Comparing HEAD with ${base}`);

try {
	git('worktree', 'add', '--detach', '--no-checkout', checkout, base);

	const baseGit = (...args: string[]) =>
		execFileSync('git', args, {cwd: checkout, encoding: 'utf8'});

	baseGit('sparse-checkout', 'set', '--cone', prefix);
	baseGit('checkout');

	const baseActions = _actions(
		path.join(checkout, prefix),
		path.join(temporary, 'base.json')
	);
	const headActions = _actions(
		WORKSPACE_ROOT,
		path.join(temporary, 'head.json')
	);

	console.log(
		`${baseActions.length} action(s) on the base, ${headActions.length} on HEAD`
	);

	const baseKeys = new Set(baseActions.map(_key));
	const headKeys = new Set(headActions.map(_key));

	const added = headActions.filter((action) => !baseKeys.has(_key(action)));
	const resolved = baseActions.filter(
		(action) => !headKeys.has(_key(action))
	);

	fs.mkdirSync(BUILD_DIR, {recursive: true});
	fs.writeFileSync(
		path.join(BUILD_DIR, 'diff.json'),
		JSON.stringify(
			{
				added: [...new Set(added.map(_key))],
				base,
				date: new Date().toISOString(),
				head: git('rev-parse', 'HEAD'),
				resolved: [
					...new Set(
						resolved.map(
							(action) => `${action.visual}: ${action.title}`
						)
					),
				],
			},
			null,
			'\t'
		)
	);

	console.log(`\n${added.length} new action(s):`);

	for (const action of added) {
		console.log(`  [${action.severity}] ${action.visual}: ${action.title}`);
	}

	console.log(`\n${resolved.length} resolved action(s):`);

	for (const action of resolved) {
		console.log(`  ${action.visual}: ${action.title}`);
	}

	console.log(
		'\nWrote build/diff.json. Run yarn viz workspace-health to mark the new actions.'
	);
}
finally {
	spawnSync('git', ['worktree', 'remove', '--force', checkout], {
		cwd: WORKSPACE_ROOT,
	});
	fs.rmSync(temporary, {force: true, recursive: true});
}

/**
 * Runs every extractor against a workspace and returns its actions. A base
 * that predates a visual can fail an extractor, which only leaves out that
 * visual's actions.
 */
function _actions(workspace: string, file: string): IAction[] {
	const result = spawnSync(
		process.execPath,
		[
			path.join(import.meta.dirname, 'build.ts'),
			'--check',
			'--actions',
			file,
		],
		{
			encoding: 'utf8',
			env: {...process.env, VIZ_WORKSPACE_ROOT: workspace},
		}
	);

	if (!fs.existsSync(file)) {
		throw new Error(
			`Unable to read the actions of ${workspace}:\n${result.stderr}`
		);
	}

	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function _defaultBase(): string {
	for (const ref of ['liferay-one/master-temp', 'upstream/master']) {
		try {
			return git('merge-base', 'HEAD', ref);
		}
		catch {

			// Try the next base.

		}
	}

	throw new Error('Name a base: node tools/visuals/diff.ts <ref>');
}

/**
 * The same action in two checkouts has the same visual and title, apart from
 * the numbers in the title.
 */
function _key(action: IAction): string {
	return `${action.visual}\u0000${action.title.replace(/\d+/g, '#')}`;
}
