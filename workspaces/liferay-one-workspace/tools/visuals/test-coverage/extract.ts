/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as path from 'path';

import {parsePlan} from '../../../tests/scripts/lib/plan.ts';
import {
	indexRequirements,
	isTraceable,
	parseRequirements,
} from '../../../tests/scripts/lib/requirements.ts';
import {indexTests} from '../../../tests/scripts/lib/testsIndex.ts';

import type {IExtraction} from '../lib.ts';
import type {IPlanItem} from '../../../tests/scripts/lib/plan.ts';
import type {ICoverageEntry} from '../../../tests/scripts/lib/testsIndex.ts';

type Klass = 'deferred' | 'pending' | 'real' | 'uncovered';

type RequirementKlass = 'partial' | 'unverified' | 'verified';

type Tier = 'e2e' | 'integration' | 'junit' | 'vitest';

const KLASSES: Klass[] = ['real', 'pending', 'uncovered', 'deferred'];

const REQUIREMENT_KLASSES: RequirementKlass[] = [
	'verified',
	'partial',
	'unverified',
];

/**
 * The LPD-87600 epics that tests/plan/flows.md names. An epic not listed here
 * still appears, under its number alone.
 */
const EPIC_NAMES: Record<string, string> = {
	E04: 'Provisioning',
	E05: 'Provisioning',
	E07: 'Trials',
	E09: 'Project management',
	E10: 'Project management',
	E11: 'Salesforce',
	E13: 'Support UI',
	E14: 'Support UI',
	E15: 'Accounts, organizations, identity',
	E16: 'Admin UI',
	E18: 'Marketplace',
	E20: 'Utilization',
	E25: 'Stripe tax',
};

/**
 * Plan files whose unit rows are proven with JUnit in
 * liferay-one-etc-spring-boot. Every other unit row is proven with Vitest in
 * liferay-one-custom-element, except a flows.md unit row that only JUnit
 * tests cover. A unit row never moves to a Playwright tier, so the tier
 * totals add up to the plan's own unit count.
 */
const SPRING_BOOT_PLAN_FILES = new Set([
	'classes.md',
	'converters.md',
	'crons.md',
	'listeners.md',
	'permissions.md',
	'rest.md',
	'services.md',
	'subscribers.md',
	'synchronizers.md',
]);

export function extract(): IExtraction {
	const problems: string[] = [];

	const items = parsePlan();

	if (!items.length) {
		problems.push(
			'tests/plan has no plan items, so the page would be empty.'
		);
	}

	const coverage = indexTests(items);
	const requirements = parseRequirements();
	const requirementIndex = indexRequirements(requirements);

	const classified = items.map((item) => ({
		...classify(item, coverage),
		item,
	}));

	const klassById = new Map(
		classified.map((entry) => [entry.item.id, entry.klass])
	);

	for (const {item, klass} of classified) {
		if (!KLASSES.includes(klass)) {
			problems.push(
				`Plan item ${item.id} has the unknown class ${klass}.`
			);
		}
	}

	return {
		data: {
			generated: new Date().toISOString().slice(0, 10),
			items: classified.map(({entries, item, klass}) => ({
				epics: [
					...new Set(item.requirement.match(/\bE\d\d\b/g) ?? []),
				].sort(),
				file: item.file.replace(/\.md$/, ''),
				id: item.id,
				klass,
				line: item.line,
				priority: item.priority,
				requirement: item.requirement,
				requirements: requirementIndex.get(item.id) ?? [],
				status: item.status,
				tests: entries.map((entry) => ({
					file: entry.file,
					inferred: entry.inferred,
				})),
				tier: _tier(item, entries),
				traceable: isTraceable(item),
				type: item.type,
			})),
			epicNames: EPIC_NAMES,
			requirements: requirements.map((requirement) => {

				// Same rule as planReport: an ID that is not a plan item counts
				// as cited but never as real.

				const real = requirement.verifiedBy.filter(
					(id) => klassById.get(id) === 'real'
				).length;

				let klass: RequirementKlass = 'partial';

				if (!real) {
					klass = 'unverified';
				}
				else if (real === requirement.verifiedBy.length) {
					klass = 'verified';
				}

				if (!REQUIREMENT_KLASSES.includes(klass)) {
					problems.push(
						`Requirement ${requirement.id} has the unknown class ${klass}.`
					);
				}

				return {
					area: requirement.area,
					file: requirement.file,
					id: requirement.id,
					kind: requirement.id.startsWith('TECH-')
						? 'technical'
						: 'business',
					klass,
					priority: requirement.priority,
					real,
					text: requirement.requirement,
					tickets: requirement.tickets,
					verifiedBy: requirement.verifiedBy,
				};
			}),
		},
		problems,
	};
}

/**
 * A copy of classify() in tests/scripts/planReport.ts, which does not export
 * it. Keep the two identical so this page agrees with `yarn plan:report`.
 */
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

function isPendingFile(file: string): boolean {
	const base = path.basename(file);

	return base === 'pending.spec.ts' || base === 'pendingFlows.spec.ts';
}

function _tier(item: IPlanItem, entries: ICoverageEntry[]): Tier {
	if (item.type === 'e2e' || item.type === 'integration') {
		return item.type;
	}

	if (SPRING_BOOT_PLAN_FILES.has(item.file)) {
		return 'junit';
	}

	if (
		item.file === 'flows.md' &&
		entries.length &&
		entries.every((entry) => entry.file.endsWith('.java'))
	) {
		return 'junit';
	}

	return 'vitest';
}
