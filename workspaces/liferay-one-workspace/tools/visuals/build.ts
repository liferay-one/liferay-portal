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
 *   node tools/visuals/build.ts [--check] [--data <file>] [--ref <ref>]
 *       [--base <ref>] [page ...]
 *
 * A problem is either hand-maintained input in tools/visuals/<visual>/ that
 * no longer matches the code, or a defect in the code that an extractor can
 * see. The build prints problems as warnings and still writes every page.
 *
 * --check runs the extractors only and exits 1 on a problem that
 * known-defects.json does not list, or on an entry in known-defects.json that
 * no longer matches a problem, because the defect it records is fixed.
 *
 * --data runs every extractor and writes their data and actions to a JSON
 * file, and writes no page. A comparison uses it to read its base.
 *
 * --ref reads the workspace at a branch, a tag, or a commit hash instead of
 * the working tree. The current extractors and templates read that ref's
 * source and its own hand-maintained input.
 *
 * Without --base, the build shows a point in time: the workspace as it is
 * at the head. With --base, it shows a comparison: what the head adds to the
 * base, from their merge base, as on a GitHub compare page. The build reads
 * the merge base with --data, and gives each visual that lists its items in
 * <visual>/changes.ts the items that the head adds, changes, and removes.
 * workspace-health then shows the Lifecycle tab and the new and resolved
 * actions.
 */

import {execFileSync, spawnSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {compareItems} from './changes.ts';
import {resolveBase, resolveCommit, withCheckout} from './checkout.ts';
import {embed, fill} from './compose.ts';
import {WORKSPACE_ROOT, inputFile, readJSON} from './lib.ts';

import type {
	IAction,
	IChangeItem,
	IChanges,
	IComparison,
	IExtractContext,
	IExtraction,
} from './lib.ts';

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

/**
 * A page of its own, or, with page set, a layer whose tabs show inside that
 * page.
 */
interface IPage {
	description: string;
	icon?: string;
	layer?: string;
	page?: string;
	tabs?: ITab[];
	title: string;
	url?: null | string;
}

const VISUALS_DIR = import.meta.dirname;

/**
 * VIZ_BUILD_DIR writes the pages somewhere else, so that two builds can run
 * at the same time.
 */
const BUILD_DIR = process.env.VIZ_BUILD_DIR ?? path.join(VISUALS_DIR, 'build');

const HEALTH = 'workspace-health';

/**
 * The tab icon of each page: a mark on a color, so the open tabs are easy to
 * tell apart.
 */
const ICONS: Record<string, {color: string; mark: string}> = {
	'index': {color: '#16202a', mark: '≡'},
	'workspace-health': {color: '#7a4fb0', mark: 'H'},
};

const SKELETON_TAIL = '</body></html>\n';

const THEME = `<style>\n${fs.readFileSync(path.join(VISUALS_DIR, 'theme.css'), 'utf8')}</style>\n<script>\n${fs.readFileSync(path.join(VISUALS_DIR, 'highlight.js'), 'utf8')}</script>\n`;

const args = process.argv.slice(2);

const check = args.includes('--check');

const VALUE_OPTIONS = ['--base', '--data', '--ref'];

const option = (name: string) =>
	args.includes(name) ? args[args.indexOf(name) + 1] : null;

const dataFile = option('--data');

const base = option('--base');

const ref = option('--ref');

if (base) {
	resolveCommit(base);
}

// A ref is read from its own checkout. The build runs again with
// VIZ_WORKSPACE_ROOT set to that checkout, because every extractor reads the
// root when it loads.

if (ref && !process.env.VIZ_WORKSPACE_ROOT) {
	const commit = resolveCommit(ref);

	const status = withCheckout(
		commit,
		(root) =>
			spawnSync(
				process.execPath,
				[
					import.meta.filename,
					...args.filter(
						(arg, index) =>
							arg !== '--ref' && args[index - 1] !== '--ref'
					),
				],
				{
					env: {
						...process.env,
						VIZ_REF: ref,
						VIZ_WORKSPACE_ROOT: root,
					},
					stdio: 'inherit',
				}
			).status
	);

	process.exit(status ?? 1);
}

const comparison = base ? _comparison(base) : null;

const baseExtraction = comparison ? _baseExtraction(comparison) : null;

const registry = readJSON<Record<string, IPage>>(
	path.join(VISUALS_DIR, 'visuals.json')
);

const knownDefects = readJSON<IKnownDefect[]>(
	inputFile(VISUALS_DIR, 'known-defects.json')
);

// A layer or a section that shows inside a page builds that page.

const requested = args
	.filter(
		(arg, index) =>
			!arg.startsWith('--') && !VALUE_OPTIONS.includes(args[index - 1])
	)
	.map((name) => registry[name]?.page ?? name);

for (const name of requested) {
	if (!registry[name]) {
		console.error(`No page named ${name} in visuals.json`);

		process.exit(1);
	}
}

const pageNames = Object.keys(registry).filter(
	(name) =>
		!registry[name].page && (!requested.length || requested.includes(name))
);

/**
 * The layers that show inside each page.
 */
const layersOf = (name: string) =>
	Object.values(registry).filter((page) => page.page === name);

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
				page: page.page ?? name,
				tab: tab.id || null,
				title: page.tabs ? `${page.title} · ${tab.label}` : page.title,
			});
		}
	}
}

const visualsOf = (name: string) => [
	...(registry[name].tabs ?? [{visual: name}]).map((tab) => tab.visual),
	...layersOf(name).flatMap((layer) => layer.tabs!.map((tab) => tab.visual)),
];

// workspace-health shows the actions of every visual, so it runs last, and
// building it runs every extractor even when its page was not requested.

const extractVisuals = [
	...new Set(
		pageNames.includes(HEALTH) || dataFile
			? [...places.keys()]
			: pageNames.flatMap(visualsOf)
	),
].sort((a, b) => Number(a === HEALTH) - Number(b === HEALTH));

const loudVisuals = new Set(pageNames.flatMap(visualsOf));

const writePages = !check && !dataFile;

if (writePages) {
	fs.mkdirSync(path.join(BUILD_DIR, 'artifact'), {recursive: true});

	// A page or a visual that visuals.json no longer lists stays in build/
	// and can be linked to or read by mistake, so remove it.

	for (const dir of [BUILD_DIR, path.join(BUILD_DIR, 'artifact')]) {
		for (const file of fs.readdirSync(dir)) {
			if (
				(file.endsWith('.html') &&
					file !== 'index.html' &&
					!pageNames.includes(file.replace(/\.html$/, '')) &&
					(!registry[file.replace(/\.html$/, '')] ||
						registry[file.replace(/\.html$/, '')].page)) ||
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

const changes: Record<string, IChanges | null> = {};

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
			base: baseExtraction,
			changes,
			comparison,
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

	if (comparison && fs.existsSync(path.join(visualDir, 'changes.ts'))) {
		changes[visual] = await _changes(extraction.data, visual);

		(extraction.data as Record<string, unknown>).__changes =
			changes[visual];
	}

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

if (dataFile) {
	fs.writeFileSync(
		dataFile,
		JSON.stringify({
			actions,
			data: Object.fromEntries(
				[...extractions].map(([visual, extraction]) => [
					visual,
					extraction.data,
				])
			),
		})
	);
}

if (writePages) {
	for (const name of pageNames) {
		const page = registry[name];

		let html = _theme(fill(_template(name), extractions.get(name)?.data));

		if (layersOf(name).length) {
			html = embed(
				html,
				Object.fromEntries(
					layersOf(name).map((layer) => [
						layer.layer!,
						layer.tabs!.map((tab) => ({
							data: extractions.get(tab.visual)?.data,
							id: `${layer.layer}-${tab.id}`,
							label: tab.label,
							params: tab.params,
							template: _template(tab.visual),
						})),
					])
				)
			);
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
			`${name.padEnd(24)} ${(html.length / 1024).toFixed(0).padStart(5)} KB  ${path.relative(process.cwd(), path.join(BUILD_DIR, `${name}.html`))}`
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

/**
 * Reads every visual at the merge base of a comparison. A build of that
 * commit with --data runs the current extractors against it.
 */
function _baseExtraction(comparison: IComparison): {
	actions: IAction[];
	data: Record<string, unknown>;
} {
	const file = path.join(
		fs.mkdtempSync(path.join(os.tmpdir(), 'viz-base-')),
		'base.json'
	);

	const env: NodeJS.ProcessEnv = {...process.env};

	delete env.VIZ_REF;
	delete env.VIZ_WORKSPACE_ROOT;

	try {
		const result = spawnSync(
			process.execPath,
			[
				import.meta.filename,
				'--data',
				file,
				'--ref',
				comparison.mergeBase,
			],
			{encoding: 'utf8', env}
		);

		if (!fs.existsSync(file)) {
			console.error(
				`Unable to read the base ${comparison.base.ref}:\n${result.stderr}`
			);

			process.exit(1);
		}

		return readJSON(file);
	}
	finally {
		fs.rmSync(path.dirname(file), {force: true, recursive: true});
	}
}

/**
 * Compares the items of a visual at the merge base and at the head. Null
 * means that the base has no data for the visual, because its extractor
 * failed there, or that the base data has a shape that changes.ts cannot
 * read.
 */
async function _changes(
	data: unknown,
	visual: string
): Promise<IChanges | null> {
	const baseData = baseExtraction?.data[visual];

	if (baseData === undefined) {
		return null;
	}

	const {changeItems} = (await import(
		path.join(VISUALS_DIR, visual, 'changes.ts')
	)) as {changeItems: (data: any) => IChangeItem[]};

	try {
		return compareItems(changeItems(baseData), changeItems(data));
	}
	catch (error) {
		console.error(`${visual}: unable to compare with the base: ${error}`);

		return null;
	}
}

function _comparison(base: string): IComparison {
	const head = execFileSync('git', ['rev-parse', 'HEAD'], {
		cwd: WORKSPACE_ROOT,
		encoding: 'utf8',
	}).trim();

	return {
		base: {ref: base, sha: resolveCommit(base)},
		mergeBase: resolveBase(base, head)!.sha,
	};
}

function _index(): string {
	const rows = Object.entries(registry)
		.filter(([, page]) => !page.page)
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
