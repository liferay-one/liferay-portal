/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

import {parsePlan, validatePlan} from './lib/plan.ts';
import {bar, pct} from './lib/progress.ts';
import {
	indexRequirements,
	isTraceable,
	parseRequirements,
} from './lib/requirements.ts';
import {indexTests} from './lib/testsIndex.ts';

function main(): number {
	const args = process.argv.slice(2);
	const list = args.includes('--list');
	const minIndex = args.indexOf('--min');
	const min = minIndex >= 0 ? Number(args[minIndex + 1]) : null;

	if (min !== null && (Number.isNaN(min) || args[minIndex + 1] === '')) {
		console.error(
			`Invalid --min value "${args[minIndex + 1] ?? ''}". Give a ` +
				'percentage, for example --min 40.'
		);

		return 1;
	}

	const items = parsePlan();
	const {errors} = validatePlan(items);

	if (errors.length) {
		console.error('Plan validation errors (run checkPlan):\n');

		for (const error of errors) {
			console.error(`  ✗ ${error}`);
		}

		return 1;
	}

	const coverage = indexTests(items);

	const planned = items.filter((item) => item.status === 'planned');
	const excluded = items.filter((item) => item.status !== 'planned');

	const isCovered = (id: string) => (coverage.get(id)?.length ?? 0) > 0;

	const isTagged = (id: string) =>
		(coverage.get(id) ?? []).some((entry) => !entry.inferred);

	const coveredItems = planned.filter((item) => isCovered(item.id));
	const taggedItems = coveredItems.filter((item) => isTagged(item.id));

	const files = [...new Set(planned.map((item) => item.file))].sort();

	console.log('checkCoverage — how close is the plan to go-live?\n');

	for (const file of files) {
		const inFile = planned.filter((item) => item.file === file);
		const done = inFile.filter((item) => isCovered(item.id)).length;

		console.log(
			`  ${bar(done, inFile.length)} ${pct(done, inFile.length).padStart(6)}  ` +
				`${file.replace(/\.md$/, '').padEnd(20)} ${done}/${inFile.length}`
		);
	}

	console.log('');

	for (const priority of ['P0', 'P1', 'P2']) {
		const inPriority = planned.filter((item) => item.priority === priority);

		if (!inPriority.length) {
			continue;
		}

		const done = inPriority.filter((item) => isCovered(item.id)).length;

		console.log(
			`  ${bar(done, inPriority.length)} ${pct(done, inPriority.length).padStart(6)}  ` +
				`${priority.padEnd(20)} ${done}/${inPriority.length}`
		);
	}

	const overall = pct(coveredItems.length, planned.length);

	console.log('');
	console.log(
		`  ${bar(coveredItems.length, planned.length)} ${overall.padStart(6)}  ` +
			`OVERALL              ${coveredItems.length}/${planned.length}` +
			(excluded.length ? `  (+${excluded.length} deferred/n/a)` : '')
	);
	console.log(
		`           explicit tag ${taggedItems.length} · ` +
			`convention-inferred ${coveredItems.length - taggedItems.length}`
	);
	console.log('');

	const requirementIndex = indexRequirements(parseRequirements());
	const traceable = items.filter(isTraceable);

	const isTraced = (id: string) => requirementIndex.has(id);

	const untraced = traceable
		.filter((item) => !isTraced(item.id))
		.sort((left, right) => left.priority.localeCompare(right.priority));

	console.log('Requirement traceability — does a requirement cite it?\n');

	for (const file of [
		...new Set(traceable.map((item) => item.file)),
	].sort()) {
		const inFile = traceable.filter((item) => item.file === file);
		const done = inFile.filter((item) => isTraced(item.id)).length;

		console.log(
			`  ${bar(done, inFile.length)} ${pct(done, inFile.length).padStart(6)}  ` +
				`${file.replace(/\.md$/, '').padEnd(20)} ${done}/${inFile.length}`
		);
	}

	const tracedCount = traceable.length - untraced.length;

	console.log('');
	console.log(
		`  ${bar(tracedCount, traceable.length)} ` +
			`${pct(tracedCount, traceable.length).padStart(6)}  ` +
			`TRACED               ${tracedCount}/${traceable.length}`
	);
	console.log('');

	if (list) {
		if (untraced.length) {
			console.log(`Untraced (${untraced.length}):\n`);

			for (const item of untraced) {
				console.log(
					`  ${item.priority}  ${item.id}  — ${item.requirement}`
				);
			}

			console.log('');
		}

		const uncovered = planned
			.filter((item) => !isCovered(item.id))
			.sort((left, right) => left.priority.localeCompare(right.priority));

		if (uncovered.length) {
			console.log(`Uncovered (${uncovered.length}):\n`);

			for (const item of uncovered) {
				console.log(
					`  ${item.priority}  ${item.id}  — ${item.requirement}`
				);
			}

			console.log('');
		}
	}
	else {
		const uncoveredP0 = planned.filter(
			(item) => item.priority === 'P0' && !isCovered(item.id)
		);

		if (uncoveredP0.length) {
			console.log(`Uncovered P0 (${uncoveredP0.length}):`);

			for (const item of uncoveredP0) {
				console.log(`  ${item.id} — ${item.requirement}`);
			}

			console.log('');
		}

		console.log(
			`Untraced P0: ${untraced.filter((item) => item.priority === 'P0').length}.`
		);
		console.log('');
		console.log(
			'Run with --list to see every uncovered and every untraced item.\n'
		);
	}

	if (min !== null) {
		const value = planned.length
			? (coveredItems.length / planned.length) * 100
			: 100;

		if (value < min) {
			console.log(
				`FAIL — coverage ${overall} is below the ${min}% threshold.`
			);

			return 1;
		}

		console.log(`OK — coverage ${overall} meets the ${min}% threshold.`);
	}

	return 0;
}

process.exit(main());
