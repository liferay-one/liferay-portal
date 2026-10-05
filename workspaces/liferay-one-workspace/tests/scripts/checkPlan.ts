/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

import {findDanglingReferences, parsePlan, validatePlan} from './lib/plan.ts';
import {ENUMERABLE_PREFIXES, enumerateSurface} from './lib/surface.ts';
import {findOrphanTags} from './lib/testsIndex.ts';

function sourcePrefix(source: string): string {
	return source.split(':', 1)[0];
}

function main(): number {
	const items = parsePlan();
	const {errors} = validatePlan(items);

	if (errors.length) {
		console.error('Plan validation errors:\n');

		for (const error of errors) {
			console.error(`  ✗ ${error}`);
		}

		console.error('');

		return 1;
	}

	const plannedSources = new Set(items.map((item) => item.source));
	const surface = enumerateSurface();

	let gapCount = 0;
	let staleCount = 0;

	console.log('checkPlan — does the plan cover the code surface?\n');

	for (const group of surface) {
		const enumerated = new Set(group.anchors);
		const planForPrefix = new Set(
			[...plannedSources].filter(
				(source) => sourcePrefix(source) === group.prefix
			)
		);

		const gaps = [...enumerated].filter(
			(anchor) => !planForPrefix.has(anchor)
		);
		const stale = [...planForPrefix].filter(
			(anchor) => !enumerated.has(anchor)
		);

		gapCount += gaps.length;
		staleCount += stale.length;

		const mark = !gaps.length && !stale.length ? '✓' : '✗';

		console.log(
			`  ${mark} ${group.title.padEnd(22)} ${enumerated.size} in code, ` +
				`${planForPrefix.size} in plan` +
				(gaps.length ? `, ${gaps.length} GAP` : '') +
				(stale.length ? `, ${stale.length} STALE` : '')
		);

		for (const anchor of gaps) {
			console.log(`        GAP   (not in plan): ${anchor}`);
		}

		for (const anchor of stale) {
			console.log(`        STALE (not in code): ${anchor}`);
		}
	}

	const unknown = [...plannedSources].filter(
		(source) =>
			!ENUMERABLE_PREFIXES.includes(sourcePrefix(source)) &&
			sourcePrefix(source) !== 'spec'
	);

	if (unknown.length) {
		console.log('');

		for (const source of unknown) {
			console.log(`  ✗ UNKNOWN Source prefix: ${source}`);
		}
	}

	const orphans = findOrphanTags(new Set(items.map((item) => item.id)));

	if (orphans.length) {
		console.log('');

		for (const orphan of orphans) {
			console.log(
				`  ✗ ORPHAN tag (no such plan item): ${orphan.id} in ${orphan.file}`
			);
		}
	}

	const dangling = findDanglingReferences(items);

	if (dangling.length) {
		console.log('');

		for (const reference of dangling) {
			console.log(
				`  ✗ DANGLING reference (no such plan item): ${reference.id} ` +
					`in ${reference.file}:${reference.line}`
			);
		}
	}

	console.log('');

	if (
		gapCount ||
		staleCount ||
		unknown.length ||
		orphans.length ||
		dangling.length
	) {
		const reasons = [];

		if (gapCount) {
			reasons.push(`${gapCount} gap(s)`);
		}

		if (staleCount) {
			reasons.push(`${staleCount} stale row(s)`);
		}

		if (unknown.length) {
			reasons.push(`${unknown.length} unknown Source prefix(es)`);
		}

		if (orphans.length) {
			reasons.push(`${orphans.length} orphan tag(s)`);
		}

		if (dangling.length) {
			reasons.push(`${dangling.length} dangling reference(s)`);
		}

		console.log(
			`FAIL — ${reasons.join(', ')}. ` +
				`Run \`node scripts/scaffoldPlan.ts\` to add rows for gaps. For a ` +
				`stale row, edit its Source to the renamed anchor so it keeps its ` +
				`ID, or delete the row if the code is gone. ` +
				`Fix unknown Source prefixes, orphan tags, and dangling ` +
				`references to match the code surface or a plan ID.`
		);

		return 1;
	}

	const enumerableInPlan = [...plannedSources].filter((source) =>
		ENUMERABLE_PREFIXES.includes(sourcePrefix(source))
	).length;
	const specInPlan = items.length - enumerableInPlan;

	console.log(
		`OK — plan covers all ${enumerableInPlan} enumerable surface items` +
			` (+${specInPlan} spec derived flow and cross cutting items tracked); ` +
			`all test tags and plan references resolve.`
	);

	return 0;
}

process.exit(main());
