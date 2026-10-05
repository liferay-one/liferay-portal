/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {WORKSPACE_ROOT} from './surface.ts';

export const PLAN_DIR = path.join(WORKSPACE_ROOT, 'tests/plan');

export const VALID_TYPES = ['unit', 'integration', 'e2e'];
export const VALID_PRIORITIES = ['P0', 'P1', 'P2'];

export const VALID_STATUSES = ['planned', 'deferred', 'n/a'];

export interface IPlanItem {
	file: string;
	id: string;
	line: number;
	priority: string;
	requirement: string;
	source: string;
	status: string;
	type: string;
}

const HEADER_CELLS = [
	'ID',
	'Requirement',
	'Type',
	'Priority',
	'Status',
	'Source',
];

function splitRow(line: string): string[] {
	const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');

	return trimmed
		.split(/(?<!\\)\|/)
		.map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function isSeparator(cells: string[]): boolean {
	return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function planFiles(): string[] {
	if (!fs.existsSync(PLAN_DIR)) {
		return [];
	}

	return fs
		.readdirSync(PLAN_DIR)
		.filter((file) => file.endsWith('.md') && file !== 'README.md')
		.sort();
}

interface IPlanRow {
	cells: string[];
	file: string;
	line: number;
}

function readPlanRows(): IPlanRow[] {
	const rows: IPlanRow[] = [];

	for (const file of planFiles()) {
		const lines = fs
			.readFileSync(path.join(PLAN_DIR, file), 'utf8')
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
				inTable = cells.length === HEADER_CELLS.length;

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

export function parsePlan(): IPlanItem[] {
	return readPlanRows()
		.filter((row) => row.cells.length === HEADER_CELLS.length)
		.map(({cells, file, line}) => ({
			file,
			id: cells[0],
			line,
			priority: cells[3],
			requirement: cells[1],
			source: cells[5],
			status: cells[4],
			type: cells[2],
		}));
}

export interface IPlanValidation {
	errors: string[];
}

export function validatePlan(items: IPlanItem[]): IPlanValidation {
	const errors: string[] = [];
	const seen = new Map<string, IPlanItem>();
	const seenSources = new Map<string, IPlanItem>();

	for (const row of readPlanRows()) {
		if (row.cells.length !== HEADER_CELLS.length) {
			errors.push(
				`${row.file}:${row.line}: row has ${row.cells.length} cells, ` +
					`expected ${HEADER_CELLS.length} (escape a literal | as \\|)`
			);
		}
	}

	for (const item of items) {
		const where = `${item.file}:${item.line}`;

		if (!/^[A-Z][A-Z0-9-]+$/.test(item.id)) {
			errors.push(`${where}: invalid ID "${item.id}"`);
		}

		const previous = seen.get(item.id);

		if (previous) {
			errors.push(
				`${where}: duplicate ID "${item.id}" (also ${previous.file}:${previous.line})`
			);
		}
		else {
			seen.set(item.id, item);
		}

		if (!VALID_TYPES.includes(item.type)) {
			errors.push(`${where}: invalid Type "${item.type}" for ${item.id}`);
		}

		if (!VALID_PRIORITIES.includes(item.priority)) {
			errors.push(
				`${where}: invalid Priority "${item.priority}" for ${item.id}`
			);
		}

		if (!VALID_STATUSES.includes(item.status)) {
			errors.push(
				`${where}: invalid Status "${item.status}" for ${item.id}`
			);
		}

		if (!item.source) {
			errors.push(`${where}: missing Source for ${item.id}`);
		}

		const previousSource = seenSources.get(item.source);

		if (item.source && previousSource) {
			errors.push(
				`${where}: duplicate Source "${item.source}" for ${item.id} ` +
					`(also ${previousSource.id} at ${previousSource.file}:${previousSource.line}). ` +
					'Run scaffoldPlan to merge the rows.'
			);
		}
		else if (item.source) {
			seenSources.set(item.source, item);
		}
	}

	return {errors};
}

export interface IPlanReference {
	file: string;
	id: string;
	line: number;
}

const QUOTED_PATTERN = /`([^`]+)`/g;

const WHOLE_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;

export function findDanglingReferences(items: IPlanItem[]): IPlanReference[] {
	const idList = items.map((item) => item.id);

	const ids = new Set(idList);
	const prefixes = new Set(idList.map((id) => id.split('-')[0]));

	const references: IPlanReference[] = [];
	const seen = new Set<string>();

	for (const file of planFiles()) {
		const lines = fs
			.readFileSync(path.join(PLAN_DIR, file), 'utf8')
			.split('\n');

		for (let index = 0; index < lines.length; index++) {
			for (const match of lines[index].matchAll(QUOTED_PATTERN)) {
				const id = match[1];

				if (
					!WHOLE_ID_PATTERN.test(id) ||
					!prefixes.has(id.split('-')[0]) ||
					ids.has(id) ||
					idList.some((known) => known.startsWith(`${id}-`))
				) {
					continue;
				}

				const key = `${file}::${id}`;

				if (seen.has(key)) {
					continue;
				}

				seen.add(key);

				references.push({file, id, line: index + 1});
			}
		}
	}

	return references;
}
