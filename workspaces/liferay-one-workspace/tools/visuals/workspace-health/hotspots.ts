/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Ranks the source files of the workspace that change most often, weighted
 * by their size: a large file that many commits touch is where a change is
 * most likely to break something, and where knowledge is most concentrated.
 */

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {WORKSPACE_ROOT} from '../lib.ts';

const DAYS = 90;

const SOURCE = /\.(java|sh|ts|tsx)$/;

export function readHotspots() {
	let log = '';

	try {
		log = execFileSync(
			'git',
			[
				'log',
				`--since=${DAYS}.days`,
				'--format=%x00%ae',
				'--name-only',
				'--relative',
				'--',
				'.',
			],
			{cwd: WORKSPACE_ROOT, encoding: 'utf8', maxBuffer: 1 << 28}
		);
	}
	catch {
		return {days: DAYS, files: []};
	}

	const files = new Map<string, {authors: Set<string>; commits: number}>();

	for (const commit of log.split('\u0000').filter(Boolean)) {
		const [author, ...names] = commit.split('\n').filter(Boolean);

		for (const name of names) {

			// The language files change with every feature and hold no logic.

			if (
				!SOURCE.test(name) ||
				/\.test\.tsx?$|\/test\/|\/i18n\//.test(name)
			) {
				continue;
			}

			const entry = files.get(name) ?? {authors: new Set(), commits: 0};

			entry.authors.add(author);
			entry.commits++;

			files.set(name, entry);
		}
	}

	return {
		days: DAYS,
		files: [...files.entries()]
			.filter(([name]) => fs.existsSync(path.join(WORKSPACE_ROOT, name)))
			.map(([name, entry]) => {
				const lines = fs
					.readFileSync(path.join(WORKSPACE_ROOT, name), 'utf8')
					.split('\n').length;

				return {
					authors: entry.authors.size,
					commits: entry.commits,
					file: name,
					lines,
					score: Math.round(entry.commits * Math.log2(lines + 1)),
				};
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 20),
	};
}
