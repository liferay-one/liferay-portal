/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI helper; it reports a ref that names no commit */

/**
 * Reads the workspace at any ref: a branch, a tag, or a commit hash. A ref
 * is checked out into a temporary sparse worktree that holds only this
 * workspace, and the extractors read it through VIZ_WORKSPACE_ROOT. build.ts
 * uses it for --ref, and diff.ts, through build.ts, for both sides of a
 * comparison.
 */

import {execFileSync, spawnSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * The checkout that the command runs in. VIZ_WORKSPACE_ROOT does not change
 * it, so a nested build still finds the repository.
 */
export const HOME_ROOT = path.resolve(import.meta.dirname, '..', '..');

/**
 * The branches that a comparison uses as its base when no base is named.
 */
const DEFAULT_BASES = ['liferay-one/master-temp', 'upstream/master'];

export function git(...args: string[]): string {
	return execFileSync('git', args, {
		cwd: HOME_ROOT,
		encoding: 'utf8',
		maxBuffer: 1 << 28,
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
}

/**
 * Returns the commit that a ref names, or exits with a message when the
 * ref names no commit.
 */
export function resolveCommit(ref: string): string {
	try {
		return git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
	}
	catch {
		console.error(
			`${ref} names no branch, tag, or commit. Fetch it, or check the spelling.`
		);

		process.exit(1);
	}
}

/**
 * Returns the commit that a comparison of head with base starts from: the
 * merge base, as on a GitHub compare page, so that the comparison shows what
 * head adds. Two refs with no common history compare directly. With no base,
 * the merge base with the first default base that exists.
 */
export function resolveBase(
	base: null | string,
	head = 'HEAD'
): null | {ref: string; sha: string} {
	const refs = base ? [base] : DEFAULT_BASES;

	for (const ref of refs) {
		const sha = base ? resolveCommit(ref) : _tryCommit(ref);

		if (!sha) {
			continue;
		}

		try {
			return {ref, sha: git('merge-base', sha, head)};
		}
		catch {
			return {ref, sha};
		}
	}

	return null;
}

/**
 * Checks out a commit into a temporary sparse worktree, calls run with the
 * path of this workspace inside it, and removes the worktree.
 */
export function withCheckout<T>(commit: string, run: (root: string) => T): T {
	const prefix = git('rev-parse', '--show-prefix').replace(/\/$/, '');

	try {
		git('cat-file', '-e', `${commit}:${prefix}`);
	}
	catch {
		console.error(
			`${commit.slice(0, 11)} has no ${prefix}. Name a ref that has this workspace.`
		);

		process.exit(1);
	}

	const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'viz-ref-'));

	const checkout = path.join(temporary, 'checkout');

	try {
		git('worktree', 'add', '--detach', '--no-checkout', checkout, commit);

		const checkoutGit = (...args: string[]) =>
			execFileSync('git', args, {cwd: checkout, encoding: 'utf8'});

		checkoutGit('sparse-checkout', 'set', '--cone', prefix);
		checkoutGit('checkout');

		return run(path.join(checkout, prefix));
	}
	finally {
		spawnSync('git', ['worktree', 'remove', '--force', checkout], {
			cwd: HOME_ROOT,
		});
		fs.rmSync(temporary, {force: true, recursive: true});
	}
}

function _tryCommit(ref: string): null | string {
	try {
		return git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
	}
	catch {
		return null;
	}
}
