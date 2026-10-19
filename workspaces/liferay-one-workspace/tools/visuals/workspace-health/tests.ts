/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the health of the test suites: the tests that the source skips or
 * focuses, and, from the run history that `yarn viz:tests` keeps, the tests
 * that both passed and failed across runs and the slowest tests.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	CUSTOM_ELEMENT_DIR,
	SPRING_BOOT_DIR,
	WORKSPACE_ROOT,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';

export interface ITestCase {
	id: string;
	status: 'failed' | 'passed' | 'skipped';
	time: number;
}

export interface ITestRun {
	cases: ITestCase[];
	date: string;
	suite: string;
}

export const HISTORY_FILE = path.join(
	import.meta.dirname,
	'snapshots',
	'test-history.json'
);

/**
 * The JUnit XML files that each suite writes.
 */
export const RESULT_FILES: Record<string, string> = {
	'Playwright': path.join(
		WORKSPACE_ROOT,
		'tests/test-results/TEST-playwright.xml'
	),
	'Spring Boot JUnit': path.join(SPRING_BOOT_DIR, 'build/test-results/test'),
	'Vitest': path.join(CUSTOM_ELEMENT_DIR, 'TEST-frontend-js.xml'),
};

const MARKERS: [RegExp, string][] = [
	[/\b(?:describe|it|test)(?:\.describe)?\.only\s*\(/g, 'only'],
	[/\b(?:describe|it|test)(?:\.describe)?\.(?:fixme|skip)\s*\(/g, 'skip'],
	[/\b(?:it|test)\.todo\s*\(/g, 'todo'],
	[/@(?:Disabled|Ignore)\b/g, 'skip'],
];

export function readTests() {
	const files = [
		...listFiles(path.join(WORKSPACE_ROOT, 'tests'), (file) =>
			/\.spec\.ts$|\.test\.ts$/.test(file)
		),
		...listFiles(path.join(CUSTOM_ELEMENT_DIR, 'src'), (file) =>
			/\.test\.tsx?$/.test(file)
		),
		...listFiles(path.join(SPRING_BOOT_DIR, 'src/test'), (file) =>
			file.endsWith('.java')
		),
	];

	const markers: {file: string; kind: string; line: number; text: string}[] =
		[];

	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');

		for (const [pattern, kind] of MARKERS) {
			for (const match of text.matchAll(pattern)) {
				const line = text.slice(0, match.index).split('\n').length;

				// test.skip(condition, reason) skips at run time in some
				// environments. Only a skip with a title disables a test.

				const firstArgument = text
					.slice(match.index + match[0].length)
					.trimStart()[0];

				markers.push({
					file: relative(file),
					kind:
						kind === 'skip' &&
						match[0].endsWith('(') &&
						!/["'`]/.test(firstArgument)
							? 'conditional'
							: kind,
					line,
					text: text.split('\n')[line - 1].trim().slice(0, 140),
				});
			}
		}
	}

	const runs = fs.existsSync(HISTORY_FILE)
		? readJSON<ITestRun[]>(HISTORY_FILE)
		: [];

	const byCase = new Map<
		string,
		{suite: string; statuses: string[]; times: number[]}
	>();

	for (const run of runs) {
		for (const testCase of run.cases) {
			const key = `${run.suite}\u0000${testCase.id}`;
			const entry = byCase.get(key) ?? {
				statuses: [],
				suite: run.suite,
				times: [],
			};

			entry.statuses.push(testCase.status);

			if (testCase.status !== 'skipped') {
				entry.times.push(testCase.time);
			}

			byCase.set(key, entry);
		}
	}

	const cases = [...byCase.entries()].map(([key, entry]) => {
		const times = [...entry.times].sort((a, b) => a - b);

		return {
			failures: entry.statuses.filter((status) => status === 'failed')
				.length,
			id: key.split('\u0000')[1],
			median: times.length ? times[Math.floor(times.length / 2)] : 0,
			passes: entry.statuses.filter((status) => status === 'passed')
				.length,
			runs: entry.statuses.length,
			suite: entry.suite,
		};
	});

	return {
		files: files.length,
		flaky: cases
			.filter((testCase) => testCase.failures && testCase.passes)
			.sort((a, b) => b.failures / b.runs - a.failures / a.runs),
		markers,
		runs: runs.map((run) => ({
			date: run.date,
			failed: run.cases.filter((testCase) => testCase.status === 'failed')
				.length,
			suite: run.suite,
			total: run.cases.length,
		})),
		slowest: [...cases].sort((a, b) => b.median - a.median).slice(0, 15),
	};
}
