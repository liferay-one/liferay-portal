/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Builds the pages in visuals.json. A page is either one visual, or a set of
 * tabs, each of which is a visual. A visual is a directory with an extract.ts
 * that reads the source of truth and a template.html with a __DATA__
 * placeholder. The build puts theme.css and highlight.js right after the
 * <title>, so every page has the same look and the same way to highlight an
 * item, and a template holds only what is specific to it.
 * It writes two files per page:
 *
 *   build/<page>.html           Standalone page. Open it in a browser.
 *   build/artifact/<page>.html  The same page without the document skeleton,
 *                               ready to publish as a claude.ai artifact.
 *
 * Usage:
 *
 *   node tools/visuals/build.ts [--check] [--actions <file>] [page ...]
 *
 * A problem is either hand-maintained input in tools/visuals/<visual>/ that
 * no longer matches the code, or a defect in the code that an extractor can
 * see. The build prints problems as warnings and still writes every page.
 *
 * --check runs the extractors only and exits 1 on a problem that
 * known-defects.json does not list, or on an entry in known-defects.json that
 * no longer matches a problem, because the defect it records is fixed.
 *
 * --actions writes every action of every visual to a JSON file. diff.ts uses
 * it to compare two checkouts.
 */

import * as fs from 'fs';
import * as path from 'path';

import {compose, fill} from './compose.ts';
import {readJSON} from './lib.ts';

import type {IAction, IExtractContext, IExtraction} from './lib.ts';

interface IKnownDefect {
	match: string;
	reason: string;
	visual: string;
}

interface ITab {
	id: string;
	label: string;
	params?: Record<string, unknown>;
	visual: string;
}

interface IPage {
	description: string;
	icon: string;
	layer?: string;
	tabs?: ITab[];
	title: string;
	url: null | string;
}

const VISUALS_DIR = import.meta.dirname;

const BUILD_DIR = path.join(VISUALS_DIR, 'build');

const HEALTH = 'workspace-health';

/**
 * The tab icon of each page: a mark on a color, so the open tabs are easy to
 * tell apart.
 */
const ICONS: Record<string, {color: string; mark: string}> = {
	'controller': {color: '#c2540a', mark: 'C'},
	'index': {color: '#16202a', mark: '≡'},
	'model': {color: '#0d6a6a', mark: 'M'},
	'test-coverage': {color: '#1d7a3e', mark: 'T'},
	'view': {color: '#1f5fbf', mark: 'V'},
	'workspace-health': {color: '#7a4fb0', mark: 'H'},
};

const SKELETON_TAIL = '</body></html>\n';

const THEME = `<style>\n${fs.readFileSync(path.join(VISUALS_DIR, 'theme.css'), 'utf8')}</style>\n<script>\n${fs.readFileSync(path.join(VISUALS_DIR, 'highlight.js'), 'utf8')}</script>\n`;

const args = process.argv.slice(2);

const check = args.includes('--check');

const actionsFile = args.includes('--actions')
	? args[args.indexOf('--actions') + 1]
	: null;

const registry = readJSON<Record<string, IPage>>(
	path.join(VISUALS_DIR, 'visuals.json')
);

const knownDefects = readJSON<IKnownDefect[]>(
	path.join(VISUALS_DIR, 'known-defects.json')
);

const requested = args.filter(
	(arg, index) => !arg.startsWith('--') && args[index - 1] !== '--actions'
);

for (const name of requested) {
	if (!registry[name]) {
		console.error(`No page named ${name} in visuals.json`);

		process.exit(1);
	}
}

const pageNames = Object.keys(registry).filter(
	(name) => !requested.length || requested.includes(name)
);

/**
 * Where each visual shows: its page, its tab, and its layer.
 */
const places = new Map<
	string,
	{layer: string; page: string; tab: null | string; title: string}
>();

for (const [name, page] of Object.entries(registry)) {
	for (const tab of page.tabs ?? [
		{id: '', label: page.title, visual: name},
	]) {
		if (!places.has(tab.visual)) {
			places.set(tab.visual, {
				layer: page.layer ?? 'workspace',
				page: name,
				tab: tab.id || null,
				title: page.tabs ? `${page.title} · ${tab.label}` : page.title,
			});
		}
	}
}

const visualsOf = (name: string) =>
	(registry[name].tabs ?? [{visual: name}]).map((tab) => tab.visual);

// workspace-health shows the actions of every visual, so it runs last, and
// building it runs every extractor even when its page was not requested.

const extractVisuals = [
	...new Set(
		pageNames.includes(HEALTH) || actionsFile
			? [...places.keys()]
			: pageNames.flatMap(visualsOf)
	),
].sort((a, b) => Number(a === HEALTH) - Number(b === HEALTH));

const loudVisuals = new Set(pageNames.flatMap(visualsOf));

if (!check) {
	fs.mkdirSync(path.join(BUILD_DIR, 'artifact'), {recursive: true});

	// A page or a visual that visuals.json no longer lists stays in build/
	// and can be linked to or read by mistake, so remove it.

	for (const dir of [BUILD_DIR, path.join(BUILD_DIR, 'artifact')]) {
		for (const file of fs.readdirSync(dir)) {
			if (
				(file.endsWith('.html') &&
					file !== 'index.html' &&
					!registry[file.replace(/\.html$/, '')]) ||
				(file.endsWith('.data.json') &&
					!places.has(file.replace(/\.data\.json$/, '')))
			) {
				fs.rmSync(path.join(dir, file));
			}
		}
	}
}

let failed = false;

let warnings = 0;

const matchedDefects = new Set<IKnownDefect>();

const actions: IAction[] = [];

const extractions = new Map<string, IExtraction>();

for (const visual of extractVisuals) {
	const quiet = !loudVisuals.has(visual);

	const visualDir = path.join(VISUALS_DIR, visual);

	const {extract} = (await import(path.join(visualDir, 'extract.ts'))) as {
		extract: (
			context: IExtractContext
		) => IExtraction | Promise<IExtraction>;
	};

	let extraction: IExtraction;

	try {
		extraction = await extract({
			actions,
			places: Object.fromEntries(places),
			visuals: Object.fromEntries(
				Object.entries(registry).map(([name, page]) => [
					name,
					{
						layer: page.layer ?? 'workspace',
						title: page.title,
					},
				])
			),
		});
	}
	catch (error) {
		failed = true;

		console.error(`${visual.padEnd(24)} extractor failed`);
		console.error(error);

		continue;
	}

	extractions.set(visual, extraction);

	const place = places.get(visual)!;

	let unknown = 0;

	for (const problem of extraction.problems) {
		const knownDefect = knownDefects.find(
			(defect) =>
				defect.visual === visual && problem.includes(defect.match)
		);

		actions.push({
			detail: knownDefect?.reason,
			kind: knownDefect ? 'defect' : 'problem',
			layer: place.layer,
			severity: knownDefect ? 'medium' : 'high',
			title: problem,
			tracked: knownDefect?.reason ?? null,
			visual,
		});

		if (quiet) {
			continue;
		}

		if (knownDefect) {
			matchedDefects.add(knownDefect);

			console.log(
				`${visual}: known defect (${knownDefect.reason}): ${problem}`
			);
		}
		else {
			unknown++;

			console.error(`${visual}: ${problem}`);
		}
	}

	for (const action of extraction.actions ?? []) {
		actions.push({
			...action,
			kind: 'finding',
			layer: action.layer ?? place.layer,
			tracked: action.tracked ?? null,
			visual,
		});
	}

	if (!quiet) {
		warnings += unknown;

		if (check) {
			console.log(`${visual.padEnd(24)} ${unknown} problem(s)`);
		}
	}
}

if (actionsFile) {
	fs.writeFileSync(actionsFile, JSON.stringify(actions, null, '\t'));
}

if (!check) {
	for (const name of pageNames) {
		const page = registry[name];

		let html: string;

		if (page.tabs) {
			html = compose(
				name,
				page,
				page.tabs.map((tab) => ({
					data: extractions.get(tab.visual)?.data,
					id: tab.id,
					label: tab.label,
					params: tab.params,
					template: _template(tab.visual),
				})),
				THEME
			);
		}
		else {
			html = _theme(fill(_template(name), extractions.get(name)?.data));
		}

		fs.writeFileSync(
			path.join(BUILD_DIR, 'artifact', `${name}.html`),
			html
		);
		fs.writeFileSync(
			path.join(BUILD_DIR, `${name}.html`),
			_skeletonHead(name, page.title) + html + SKELETON_TAIL
		);

		console.log(
			`${name.padEnd(24)} ${(html.length / 1024).toFixed(0).padStart(5)} KB  build/${name}.html`
		);
	}

	for (const [visual, extraction] of extractions) {
		fs.writeFileSync(
			path.join(BUILD_DIR, `${visual}.data.json`),
			JSON.stringify(extraction.data, null, '\t') + '\n'
		);
	}

	fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), _index());
}

for (const defect of knownDefects) {
	if (loudVisuals.has(defect.visual) && !matchedDefects.has(defect)) {
		warnings++;

		console.error(
			`${defect.visual}: known defect "${defect.match}" (${defect.reason}) no longer occurs. Remove it from tools/visuals/known-defects.json.`
		);
	}
}

if (warnings) {
	console.error(
		'\nEach problem above is either configuration in tools/visuals/<visual>/ that no longer matches the code, or a defect in the code itself. Fix the configuration. Add a code defect to tools/visuals/known-defects.json with its ticket or audit ID instead of hiding it.'
	);
}

if (failed || (check && warnings)) {
	process.exit(1);
}

function _index(): string {
	const rows = Object.entries(registry)
		.filter(([name]) => fs.existsSync(path.join(BUILD_DIR, `${name}.html`)))
		.map(
			([name, page]) =>
				`<li><a href="${name}.html"><b>${page.title}</b></a><p>${page.description}</p></li>`
		)
		.join('');

	return `${_skeletonHead('index', 'Workspace Visuals')}${_theme('<title>Workspace Visuals</title>')}<style>:root{--wrap-width:760px}ul{list-style:none;padding:0;margin:0;display:grid;gap:12px}li{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px 16px;display:grid;gap:4px}li a{color:var(--accent)}li p,li small{margin:0;color:var(--muted)}</style><div class="wrap"><header><div class="eyebrow">yarn viz</div><h1>Workspace Visuals</h1><p>Each page is built from the workspace source.</p></header><ul>${rows}</ul></div>${SKELETON_TAIL}`;
}

/**
 * Returns the document head for a standalone page, with an SVG tab icon. A
 * published artifact gets its icon from the Artifact tool instead.
 */
function _skeletonHead(name: string, title: string): string {
	const {color, mark} = ICONS[name] ?? {color: '#5a6672', mark: title[0]};

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="23" fill="#fff" font-family="system-ui,sans-serif" font-size="20" font-weight="700" text-anchor="middle">${mark}</text></svg>`;

	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link href="data:image/svg+xml,${encodeURIComponent(svg)}" rel="icon" type="image/svg+xml"><style>:root{color-scheme:light}body{margin:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;
}

function _template(visual: string): string {
	const template = fs.readFileSync(
		path.join(VISUALS_DIR, visual, 'template.html'),
		'utf8'
	);

	if (!template.includes('__DATA__') || !template.includes('</title>')) {
		throw new Error(
			`${visual}: template.html needs a <title> and a __DATA__ placeholder`
		);
	}

	return template;
}

function _theme(template: string): string {
	const index = template.indexOf('</title>') + '</title>'.length;

	return template.slice(0, index) + THEME + template.slice(index);
}
