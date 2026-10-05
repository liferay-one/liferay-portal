/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {VALID_PRIORITIES} from './plan.ts';
import {WORKSPACE_ROOT} from './surface.ts';

import type {IPlanItem} from './plan.ts';

export const SPECS_DIR = path.join(WORKSPACE_ROOT, 'specs');

const ID_PREFIXES: Record<string, string> = {
	business: 'REQ',
	technical: 'TECH',
};

export interface IRequirement {
	area: string;
	file: string;
	id: string;
	line: number;
	priority: string;
	requirement: string;
	tickets: string;
	verifiedBy: string[];
}

const HEADER_CELLS = [
	'ID',
	'Requirement',
	'Priority',
	'Tickets',
	'Verified By',
];

const ID_PATTERN = /^(REQ|TECH)-([A-Z][A-Z0-9]*)-(\d{3})$/;

const QUOTED_PATTERN = /`([^`]+)`/g;

function isSeparator(cells: string[]): boolean {
	return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function requirementFiles(): string[] {
	return Object.keys(ID_PREFIXES)
		.filter((directory) => fs.existsSync(path.join(SPECS_DIR, directory)))
		.flatMap((directory) =>
			fs
				.readdirSync(path.join(SPECS_DIR, directory), {recursive: true})
				.map((file) => path.join(directory, String(file)))
		)
		.filter(
			(file) =>
				file.endsWith('.md') && path.basename(file) !== 'README.md'
		)
		.sort();
}

function splitRow(line: string): string[] {
	const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');

	return trimmed
		.split(/(?<!\\)\|/)
		.map((cell) => cell.replace(/\\\|/g, '|').trim());
}

interface IRequirementRow {
	cells: string[];
	file: string;
	line: number;
}

function readRequirementRows(): IRequirementRow[] {
	const rows: IRequirementRow[] = [];

	for (const file of requirementFiles()) {
		const lines = fs
			.readFileSync(path.join(SPECS_DIR, file), 'utf8')
			.split('\n');

		let inTable = false;

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];

			if (!line.trim().startsWith('|')) {
				inTable = false;

				continue;
			}

			const cells = splitRow(line);

			if (cells[0] === 'ID' && cells[1] === 'Requirement') {
				inTable = true;

				continue;
			}

			if (!inTable || isSeparator(cells)) {
				continue;
			}

			rows.push({cells, file, line: index + 1});
		}
	}

	return rows;
}

export function parseRequirements(): IRequirement[] {
	return readRequirementRows()
		.filter((row) => row.cells.length === HEADER_CELLS.length)
		.map(({cells, file, line}) => ({
			area: ID_PATTERN.exec(cells[0])?.[2] ?? '',
			file,
			id: cells[0],
			line,
			priority: cells[2],
			requirement: cells[1],
			tickets: cells[3],
			verifiedBy: [...cells[4].matchAll(QUOTED_PATTERN)].map(
				(match) => match[1]
			),
		}));
}

export function validateRequirements(
	requirements: IRequirement[],
	planItems: IPlanItem[]
): string[] {
	const errors: string[] = [];

	for (const row of readRequirementRows()) {
		if (row.cells.length !== HEADER_CELLS.length) {
			errors.push(
				`${row.file}:${row.line}: row has ${row.cells.length} cells, ` +
					`expected ${HEADER_CELLS.length} (escape a literal | as \\|)`
			);
		}
	}

	const areaFiles = new Map<string, string>();
	const fileAreas = new Map<string, string>();
	const planItemsById = new Map(planItems.map((item) => [item.id, item]));
	const seen = new Map<string, IRequirement>();

	for (const requirement of requirements) {
		const where = `${requirement.file}:${requirement.line}`;

		if (!requirement.area) {
			errors.push(
				`${where}: invalid ID "${requirement.id}", expected ` +
					'REQ-<AREA>-<NNN> or TECH-<AREA>-<NNN>'
			);

			continue;
		}

		const prefix = ID_PREFIXES[requirement.file.split(path.sep)[0]];

		if (!requirement.id.startsWith(`${prefix}-`)) {
			errors.push(
				`${where}: ${requirement.id} must use the ${prefix} prefix in ` +
					requirement.file.split(path.sep)[0]
			);
		}

		const previous = seen.get(requirement.id);

		if (previous) {
			errors.push(
				`${where}: duplicate ID "${requirement.id}" ` +
					`(also ${previous.file}:${previous.line})`
			);
		}
		else {
			seen.set(requirement.id, requirement);
		}

		const fileArea = fileAreas.get(requirement.file);

		if (!fileArea) {
			fileAreas.set(requirement.file, requirement.area);
		}
		else if (fileArea !== requirement.area) {
			errors.push(
				`${where}: ${requirement.id} uses area ${requirement.area}, but ` +
					`${requirement.file} uses ${fileArea}`
			);
		}

		const areaFile = areaFiles.get(requirement.area);

		if (!areaFile) {
			areaFiles.set(requirement.area, requirement.file);
		}
		else if (areaFile !== requirement.file) {
			errors.push(
				`${where}: area ${requirement.area} already belongs to ${areaFile}`
			);
		}

		if (!VALID_PRIORITIES.includes(requirement.priority)) {
			errors.push(
				`${where}: invalid Priority "${requirement.priority}" for ` +
					requirement.id
			);
		}

		for (const planId of requirement.verifiedBy) {
			const planItem = planItemsById.get(planId);

			if (!planItem) {
				errors.push(
					`${where}: ${requirement.id} cites ${planId}, which matches ` +
						'no plan item'
				);
			}
			else if (!isTraceable(planItem)) {
				errors.push(
					`${where}: ${requirement.id} cites ${planId}, an n/a plan ` +
						'item that no test proves'
				);
			}
		}
	}

	return errors;
}

export function isTraceable(item: IPlanItem): boolean {
	return item.status !== 'n/a';
}

export function indexRequirements(
	requirements: IRequirement[]
): Map<string, string[]> {
	const index = new Map<string, string[]>();

	for (const requirement of requirements) {
		for (const planId of requirement.verifiedBy) {
			const requirementIds = index.get(planId) ?? [];

			if (!requirementIds.includes(requirement.id)) {
				requirementIds.push(requirement.id);
			}

			index.set(planId, requirementIds);
		}
	}

	return index;
}

export function parseMinTraced(args: string[]): null | number | undefined {
	let argument: string | undefined;

	const index = args.findIndex(
		(arg) => arg === '--min-traced' || arg.startsWith('--min-traced=')
	);

	if (index < 0) {
		return null;
	}

	if (args[index] === '--min-traced') {
		argument = args[index + 1];
	}
	else {
		argument = args[index].slice('--min-traced='.length);
	}

	const value = Number(argument);

	if (
		argument === undefined ||
		!argument.trim() ||
		Number.isNaN(value) ||
		value < 0 ||
		value > 100
	) {
		return undefined;
	}

	return value;
}
