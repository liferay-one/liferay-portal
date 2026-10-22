/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the artifact of each phase of the current branch. A phase has an
 * agentic artifact in place of a traditional deliverable:
 *
 *   Planning        mockup.html
 *   Analysis        git diff specs/business
 *   Design          git diff specs/technical
 *   Implementation  git diff client-extensions
 *   Testing         yarn test:report
 *   Deployment      yarn viz:diff
 *   Maintenance     yarn viz
 *
 * Only a comparison has phases. The head is the workspace that the
 * extractors read: the working tree, or the ref that `yarn viz --ref` names.
 * The base is the ref that `--base` names, and the diff starts from the merge
 * base of the two. In the working tree, a change that is not committed yet
 * counts, and an untracked file counts as added. The Playwright report
 * belongs to the working tree, so a report at a ref has none. The page
 * decides the status of each phase from this data.
 */

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {WORKSPACE_ROOT} from '../lib.ts';

import type {IComparison} from '../lib.ts';

export interface IChangedFile {
	added: null | number;
	deleted: null | number;
	file: string;
	untracked: boolean;
}

const MOCKUP = /(^|\/)[^/]*mockup[^/]*\.html$/i;

const REPORT_FILE = path.join(
	WORKSPACE_ROOT,
	'tests/playwright-report/index.html'
);

const TEST = /\.test\.tsx?$|\/src\/test\/|^tests\//;

/**
 * The parts of the user interface. A change to one of them is a change that
 * a mockup can show.
 */
const VIEW =
	/^client-extensions\/(liferay-one-custom-element\/src\/.*\.(css|scss|tsx)|liferay-one-global-css\/|liferay-one-site-initializer\/site-initializer\/(fragments|layout-page-templates|layouts)\/)/;

const git = (...args: string[]) =>
	execFileSync('git', args, {
		cwd: WORKSPACE_ROOT,
		encoding: 'utf8',
		maxBuffer: 1 << 28,
	}).trim();

export type IHead = ReturnType<typeof readHead>;

/**
 * Returns what the report shows: the ref, its commit, the subject and date
 * of the commit, and, in the working tree, the number of files with changes
 * that are not committed yet.
 */
export function readHead() {
	const worktree = !process.env.VIZ_REF;

	const [subject = '', date = ''] = _list(() =>
		git('log', '-1', '--format=%s%n%cI', 'HEAD')
	);

	return {
		date,
		ref:
			process.env.VIZ_REF ??
			_list(() => git('rev-parse', '--abbrev-ref', 'HEAD'))[0] ??
			'HEAD',
		sha: git('rev-parse', 'HEAD'),
		subject,
		uncommitted: worktree
			? _list(() => git('status', '--porcelain', '--', '.')).length
			: 0,
		worktree,
	};
}

/**
 * Returns the artifact of each phase of a comparison, or null at a point in
 * time, where no phase has a change to measure.
 */
export function readLifecycle(comparison: IComparison | null, head: IHead) {
	if (!comparison) {
		return null;
	}

	const mergeBase = comparison.mergeBase;

	const [baseSubject = '', baseDate = ''] = _list(() =>
		git('log', '-1', '--format=%s%n%cI', comparison.base.sha)
	);

	const mockups = _list(() =>
		git('ls-files', '--cached', '--others', '--exclude-standard', '--', '.')
	).filter((file) => MOCKUP.test(file) && !/(^|\/)build\//.test(file));

	const report =
		head.worktree && fs.existsSync(REPORT_FILE)
			? {
					date: fs.statSync(REPORT_FILE).mtime.toISOString(),
					file: path.relative(WORKSPACE_ROOT, REPORT_FILE),
				}
			: null;

	const files: IChangedFile[] = [
		..._list(() =>
			git(
				'diff',
				'--no-renames',
				'--numstat',
				'--relative',
				mergeBase,
				'--',
				'.'
			)
		).map((line) => {
			const [added, deleted, file] = line.split('\t');

			return {
				added: added === '-' ? null : Number(added),
				deleted: deleted === '-' ? null : Number(deleted),
				file,
				untracked: false,
			};
		}),
		..._list(() =>
			git('ls-files', '--others', '--exclude-standard', '--', '.')
		).map((file) => ({
			added: _lineCount(file),
			deleted: 0,
			file,
			untracked: true,
		})),
	].sort((a, b) => a.file.localeCompare(b.file));

	// The commits that the base has and the head lacks. A head that is only
	// behind its base adds nothing, which usually means the two refs are
	// swapped.

	const behind = Number(
		_list(() =>
			git('rev-list', '--count', `${head.sha}..${comparison.base.sha}`)
		)[0] ?? 0
	);

	const commits = Number(
		_list(() =>
			git('rev-list', '--count', `${mergeBase}..${head.sha}`)
		)[0] ?? 0
	);

	// The time of the latest change: the latest commit, or, in the working
	// tree, the latest edit to a file that the diff names and that still
	// exists. A checkout of a ref has the time of the checkout.

	const times = head.worktree
		? files
				.map((file) => path.join(WORKSPACE_ROOT, file.file))
				.filter((file) => fs.existsSync(file))
				.map((file) => fs.statSync(file).mtime.getTime())
		: [];

	if (commits) {
		times.push(Date.parse(head.date));
	}

	return {
		base: {
			date: baseDate,
			mergeBase,
			ref: comparison.base.ref,
			sha: comparison.base.sha,
			subject: baseSubject,
		},
		behind,
		changedAt: times.length
			? new Date(Math.max(...times)).toISOString()
			: null,
		commits,
		files: files.map((file) => ({
			...file,
			mockup: MOCKUP.test(file.file),
			test: TEST.test(file.file),
			view: VIEW.test(file.file),
		})),
		mockups,
		report,
	};
}

function _lineCount(file: string): null | number {
	try {
		return (
			fs
				.readFileSync(path.join(WORKSPACE_ROOT, file), 'utf8')
				.match(/\n/g)?.length ?? 0
		);
	}
	catch {
		return null;
	}
}

function _list(read: () => string): string[] {
	try {
		return read().split('\n').filter(Boolean);
	}
	catch {
		return [];
	}
}
