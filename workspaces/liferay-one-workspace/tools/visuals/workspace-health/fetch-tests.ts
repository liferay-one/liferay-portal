/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Appends the latest results of each test suite to snapshots/test-history.json,
 * so that workspace-health can find the tests that pass in one run and fail in
 * another. Run it after a test run:
 *
 *   yarn test:unit && yarn viz:tests
 *
 * A suite whose JUnit file has not changed since the last record is skipped,
 * so running it twice does not count one run twice. The history keeps the
 * last 30 runs of each suite.
 */

import * as fs from 'fs';
import * as path from 'path';

import {listFiles, readJSON} from '../lib.ts';
import {HISTORY_FILE, RESULT_FILES} from './tests.ts';

import type {ITestCase, ITestRun} from './tests.ts';

const KEEP = 30;

const history: ITestRun[] = fs.existsSync(HISTORY_FILE)
	? readJSON<ITestRun[]>(HISTORY_FILE)
	: [];

let added = 0;

for (const [suite, location] of Object.entries(RESULT_FILES)) {
	if (!fs.existsSync(location)) {
		console.log(`${suite.padEnd(20)} no results at ${location}`);

		continue;
	}

	const files = fs.statSync(location).isDirectory()
		? listFiles(location, (file) => file.endsWith('.xml'))
		: [location];

	const date = new Date(
		Math.max(...files.map((file) => fs.statSync(file).mtimeMs))
	).toISOString();

	if (history.some((run) => run.suite === suite && run.date === date)) {
		console.log(`${suite.padEnd(20)} already recorded`);

		continue;
	}

	const cases: ITestCase[] = files.flatMap((file) =>
		_cases(fs.readFileSync(file, 'utf8'))
	);

	history.push({cases, date, suite});

	added++;

	console.log(`${suite.padEnd(20)} ${cases.length} test cases from ${date}`);
}

const trimmed = Object.keys(RESULT_FILES).flatMap((suite) =>
	history
		.filter((run) => run.suite === suite)
		.sort((a, b) => a.date.localeCompare(b.date))
		.slice(-KEEP)
);

fs.mkdirSync(path.dirname(HISTORY_FILE), {recursive: true});
fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, '\t'));

console.log(`Recorded ${added} run(s).`);

function _attribute(tag: string, name: string): string {
	return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
}

function _cases(xml: string): ITestCase[] {
	const cases: ITestCase[] = [];

	for (const match of xml.matchAll(
		/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g
	)) {
		const body = match[3] ?? '';

		cases.push({
			id: `${_attribute(match[1], 'classname')} › ${_attribute(match[1], 'name')}`,
			status: /<(failure|error)\b/.test(body)
				? 'failed'
				: /<skipped\b/.test(body)
					? 'skipped'
					: 'passed',
			time: Number(_attribute(match[1], 'time')) || 0,
		});
	}

	return cases;
}
