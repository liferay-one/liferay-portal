/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

import * as fs from 'fs';
import * as path from 'path';

import {VALID_TYPES, parsePlan} from './lib/plan.ts';
import {bar, pct} from './lib/progress.ts';
import {
	indexRequirements,
	isTraceable,
	parseRequirements,
} from './lib/requirements.ts';
import {WORKSPACE_ROOT} from './lib/surface.ts';
import {indexTests} from './lib/testsIndex.ts';

import type {IPlanItem} from './lib/plan.ts';
import type {ICoverageEntry} from './lib/testsIndex.ts';

const OUTPUT = path.join(WORKSPACE_ROOT, 'tests/test-results/plan-report.md');

type Klass = 'deferred' | 'pending' | 'real' | 'uncovered';

type RequirementKlass = 'partial' | 'unverified' | 'verified';

const REQUIREMENT_MARK: Record<RequirementKlass, string> = {
	partial: '◐ partial',
	unverified: '✗ unverified',
	verified: '✓ verified',
};

const MARK: Record<Klass, string> = {
	deferred: '⊘ deferred',
	pending: '⏳ pending',
	real: '✓ real',
	uncovered: '✗ uncovered',
};

function isPendingFile(file: string): boolean {
	const base = path.basename(file);

	return base === 'pending.spec.ts' || base === 'pendingFlows.spec.ts';
}

function classify(
	item: IPlanItem,
	coverage: Map<string, ICoverageEntry[]>
): {entries: ICoverageEntry[]; klass: Klass} {
	if (item.status !== 'planned') {
		return {entries: [], klass: 'deferred'};
	}

	const entries = coverage.get(item.id) ?? [];

	if (!entries.length) {
		return {entries: [], klass: 'uncovered'};
	}

	const realEntries = entries.filter((entry) => !isPendingFile(entry.file));

	if (!realEntries.length) {
		return {entries, klass: 'pending'};
	}

	return {entries: realEntries, klass: 'real'};
}

function main(): void {
	const items = parsePlan();
	const coverage = indexTests(items);

	const classified = items.map((item) => ({
		...classify(item, coverage),
		item,
	}));

	const count = (klass: Klass, list = classified) =>
		list.filter((entry) => entry.klass === klass).length;

	const planned = classified.filter((entry) => entry.klass !== 'deferred');
	const real = count('real', planned);

	const files = [...new Set(items.map((item) => item.file))].sort();

	console.log('planReport — real test coverage vs pending stubs\n');

	for (const file of files) {
		const inFile = planned.filter((entry) => entry.item.file === file);

		if (!inFile.length) {
			continue;
		}

		const realInFile = inFile.filter(
			(entry) => entry.klass === 'real'
		).length;

		console.log(
			`  ${bar(realInFile, inFile.length)} ${pct(realInFile, inFile.length).padStart(6)}  ` +
				`${file.replace(/\.md$/, '').padEnd(20)} ${realInFile}/${inFile.length} real`
		);
	}

	console.log('');
	console.log(
		`  ${bar(real, planned.length)} ${pct(real, planned.length).padStart(6)}  ` +
			`GO-LIVE (real)       ${real}/${planned.length}`
	);
	console.log(
		`           real ${count('real')} · pending ${count('pending')} · ` +
			`uncovered ${count('uncovered')} · deferred ${count('deferred')}`
	);

	const tiers = VALID_TYPES.map((tier) => {
		const inTier = classified.filter((entry) => entry.item.type === tier);
		const plannedInTier = inTier.filter(
			(entry) => entry.klass !== 'deferred'
		);
		const realInTier = plannedInTier.filter(
			(entry) => entry.klass === 'real'
		).length;

		return {
			deferred: inTier.filter((entry) => entry.klass === 'deferred')
				.length,
			planned: plannedInTier.length,
			real: realInTier,
			tier,
		};
	});

	console.log('');
	console.log('  Coverage by tier (real / planned · deferred):');

	for (const {
		deferred,
		planned: plannedCount,
		real: realCount,
		tier,
	} of tiers) {
		console.log(
			`  ${bar(realCount, plannedCount)} ${pct(realCount, plannedCount).padStart(6)}  ` +
				`${tier.padEnd(12)} ${realCount}/${plannedCount} real · ${deferred} deferred`
		);
	}

	const requirements = parseRequirements();
	const requirementIndex = indexRequirements(requirements);
	const klassById = new Map(
		classified.map((entry) => [entry.item.id, entry.klass])
	);

	const classifiedRequirements = requirements.map((requirement) => {
		const realCount = requirement.verifiedBy.filter(
			(id) => klassById.get(id) === 'real'
		).length;

		let klass: RequirementKlass = 'partial';

		if (!realCount) {
			klass = 'unverified';
		}
		else if (realCount === requirement.verifiedBy.length) {
			klass = 'verified';
		}

		return {klass, realCount, requirement};
	});

	const countRequirements = (klass: RequirementKlass) =>
		classifiedRequirements.filter((entry) => entry.klass === klass).length;

	const traceable = items.filter(isTraceable);
	const tracedCount = traceable.filter((item) =>
		requirementIndex.has(item.id)
	).length;

	console.log('');
	console.log('  Requirements (every cited plan item has a real test):');
	console.log(
		`  ${bar(countRequirements('verified'), requirements.length)} ` +
			`${pct(countRequirements('verified'), requirements.length).padStart(6)}  ` +
			`VERIFIED             ${countRequirements('verified')}/${requirements.length}`
	);
	console.log(
		`           verified ${countRequirements('verified')} · partial ` +
			`${countRequirements('partial')} · unverified ` +
			`${countRequirements('unverified')}`
	);
	console.log(
		`  ${bar(tracedCount, traceable.length)} ` +
			`${pct(tracedCount, traceable.length).padStart(6)}  ` +
			`TRACED               ${tracedCount}/${traceable.length} plan items ` +
			'cited by a requirement'
	);

	const lines: string[] = [
		'# Liferay One — Testing Plan Report',
		'',
		'Per-requirement status. **Real** = a non-stub test covers it. **Pending** ' +
			'= only a hard-failing stub covers it. **Uncovered** = no test. ' +
			'**Deferred** = excluded from go-live. A covering file marked `*` was ' +
			'matched by naming convention rather than an explicit plan-ID tag. ' +
			'Regenerate with `yarn plan:report`.',
		'',
		'## Summary',
		'',
		'| Status | Count |',
		'| --- | --- |',
		`| ✓ Real | ${count('real')} |`,
		`| ⏳ Pending | ${count('pending')} |`,
		`| ✗ Uncovered | ${count('uncovered')} |`,
		`| ⊘ Deferred / n/a | ${count('deferred')} |`,
		'',
		`**Go-live (real / planned): ${real}/${planned.length} = ${pct(real, planned.length)}**`,
		'',
		'## By Tier',
		'',
		'The same requirements grouped by `Type`. Surface files (routes, rest, ' +
			'crons, subscribers) are all `unit`; `flows.md` carries the ' +
			'`integration` and `e2e` rows.',
		'',
		'| Tier | Real | Planned | Deferred |',
		'| --- | --- | --- | --- |',
		...tiers.map(
			({deferred, planned: plannedCount, real: realCount, tier}) =>
				`| ${tier} | ${realCount} | ${plannedCount} | ${deferred} |`
		),
		'',
	];

	lines.push(
		'## Requirements',
		'',
		'A requirement is **verified** when every plan item it cites has a ' +
			'real test, **partial** when some do, and **unverified** when none ' +
			`do. ${tracedCount}/${traceable.length} plan items ` +
			`(${pct(tracedCount, traceable.length)}) are cited by a requirement.`,
		'',
		'| ID | Priority | Status | Real / Cited |',
		'| --- | --- | --- | --- |',
		...classifiedRequirements.map(
			({klass, realCount, requirement}) =>
				`| ${requirement.id} | ${requirement.priority} | ` +
				`${REQUIREMENT_MARK[klass]} | ${realCount}/` +
				`${requirement.verifiedBy.length} |`
		),
		''
	);

	for (const file of files) {
		const inFile = classified.filter((entry) => entry.item.file === file);

		if (!inFile.length) {
			continue;
		}

		lines.push(`## ${file.replace(/\.md$/, '')}`, '');
		lines.push('| ID | Priority | Status | Covered by | Requirements |');
		lines.push('| --- | --- | --- | --- | --- |');

		for (const {entries, item, klass} of inFile) {
			const covered = entries.length
				? entries
						.map(
							(entry) => entry.file + (entry.inferred ? ' *' : '')
						)
						.join('<br>')
				: '—';

			const requirementIds = requirementIndex.get(item.id);

			lines.push(
				`| ${item.id} | ${item.priority} | ${MARK[klass]} | ${covered} | ` +
					`${requirementIds ? requirementIds.join('<br>') : '—'} |`
			);
		}

		lines.push('');
	}

	fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
	fs.writeFileSync(OUTPUT, lines.join('\n') + '\n');

	console.log(`\nFull report: ${path.relative(WORKSPACE_ROOT, OUTPUT)}`);
}

main();
