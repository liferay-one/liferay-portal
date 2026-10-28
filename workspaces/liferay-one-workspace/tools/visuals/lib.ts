/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * The workspace that the extractors read. VIZ_WORKSPACE_ROOT points them at
 * another checkout, which is how diff.ts reads the base branch.
 */
export const WORKSPACE_ROOT =
	process.env.VIZ_WORKSPACE_ROOT ??
	path.resolve(import.meta.dirname, '..', '..');

export const BATCH_DIR = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-batch/batch'
);

/**
 * The batch file of the system objects. A base branch from before the file
 * moved after the custom objects still has it as 02.
 */
export const SYSTEM_OBJECT_FIELD_FILE =
	[
		'03-system-object-field.batch-engine-data.json',
		'02-system-object-field.batch-engine-data.json',
	].find((fileName) => fs.existsSync(path.join(BATCH_DIR, fileName))) ??
	'03-system-object-field.batch-engine-data.json';

export const CUSTOM_ELEMENT_DIR = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-custom-element'
);

export const SITE_INITIALIZER_DIR = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-site-initializer/site-initializer'
);

export const SPRING_BOOT_DIR = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-etc-spring-boot'
);

/**
 * Something to act on. A visual page shows the current state only. What
 * needs attention goes to the Actions tab of workspace-health instead: each
 * problem and known defect that the build finds, and each action that an
 * extractor returns, such as an audit finding or a risky grant.
 */
export interface IAction {
	detail?: string;
	kind: 'defect' | 'finding' | 'problem';

	/**
	 * The layer the action belongs to: model, view, controller, or
	 * workspace. The build fills it from the page that shows the visual, and
	 * an extractor sets it when one visual spans layers.
	 */
	layer: string;
	severity: 'critical' | 'high' | 'info' | 'low' | 'medium';

	/**
	 * The id of the section, inside the visual's tab, that shows the item.
	 * A link to the action opens the tab and scrolls to it.
	 */
	anchor?: string;

	/**
	 * The text that names the item inside the section, such as an endpoint,
	 * a variable, or an object. A link to the action highlights the element
	 * that shows it.
	 */
	item?: string;

	/**
	 * The section of the Workspace tab that shows the action: bundle, tests,
	 * or specs. An action with no section shows under Actions.
	 */
	section?: string;

	/**
	 * Where the action names code: a workspace path, with an optional line.
	 */
	source?: string;
	title: string;

	/**
	 * Where the team tracks the action, such as a ticket or an audit ID. An
	 * untracked action is in the triage queue.
	 */
	tracked: null | string;
	visual: string;
}

/**
 * What an extractor returns. The build inlines `data` into the template.
 * Each entry in `problems` is a sentence that says what in the source no
 * longer matches the visual's own configuration, such as a finding that
 * names an object that was removed. `yarn viz:check` fails on any problem.
 * Each entry in `actions` is something to act on that the page itself does
 * not show. The build adds the visual's name.
 */
export interface IExtraction<T = unknown> {
	actions?: (Omit<IAction, 'kind' | 'layer' | 'tracked' | 'visual'> & {
		layer?: string;
		tracked?: null | string;
	})[];
	data: T;
	problems: string[];
}

/**
 * One item of a visual that a comparison can find added, changed, or
 * removed, such as an object, an endpoint, or a grant. A visual lists its
 * items in <visual>/changes.ts. The key names the same item at both refs,
 * so it holds no line number. The value is what the comparison checks: two
 * values that differ make the item changed.
 */
export interface IChangeItem {
	key: string;
	kind: string;
	label: string;

	/**
	 * The layers whose tab shows the item, for a visual that shows in a tab
	 * of each layer. The change bar of a tab counts only the items of its
	 * layer. An item with no layers counts in every tab.
	 */
	layers?: string[];
	value: unknown;
}

/**
 * What a comparison found in one visual. The build puts it into the
 * visual's data as __changes, and only in a comparison, so a template that
 * finds no __changes shows a point in time.
 */
export interface IChanges {
	counts: {added: number; changed: number; removed: number};

	/**
	 * Each added or changed item. A changed item names the top-level fields
	 * of its value that differ.
	 */
	items: Record<
		string,
		{
			fields?: string[];
			kind: string;
			layers?: string[];
			status: 'added' | 'changed';
		}
	>;

	/**
	 * The counts of each kind of item, such as endpoints and routes.
	 */
	kinds: Record<string, {added: number; changed: number; removed: number}>;

	/**
	 * The items that only the base has. The head cannot show them, so the
	 * section lists them.
	 */
	removed: {key: string; kind: string; label: string; layers?: string[]}[];
}

/**
 * The two refs of a comparison.
 */
export interface IComparison {
	base: {ref: string; sha: string};

	/**
	 * The commit that the comparison starts from: the merge base of the base
	 * and the head.
	 */
	mergeBase: string;
}

/**
 * What the build passes to an extractor. Only workspace-health reads it.
 */
export interface IExtractContext {
	actions: IAction[];

	/**
	 * The base of a comparison: its actions and the data of each visual at
	 * the merge base. Null at a point in time.
	 */
	base?: {
		actions: IAction[];
		data: Record<string, unknown>;
	} | null;

	/**
	 * What the comparison found in each visual that lists its items.
	 */
	changes?: Record<string, IChanges | null>;

	comparison?: IComparison | null;

	/**
	 * Where each visual shows: its page, its tab, its layer, and its title.
	 */
	places: Record<
		string,
		{layer: string; page: string; tab: null | string; title: string}
	>;

	/**
	 * Each page, with its layer and title.
	 */
	visuals: Record<string, {layer: string; title: string}>;
}

/**
 * The same action at two refs has the same visual and title, apart from the
 * numbers in the title, so a count that grows is not a new action.
 */
export function actionKey(action: {title: string; visual: string}): string {
	return `${action.visual}\u0000${action.title.replace(/\d+/g, '#')}`;
}

export function batchItems<T = any>(fileName: string): T[] {
	return readJSON<{items: T[]}>(path.join(BATCH_DIR, fileName)).items;
}

/**
 * Returns every relationship of the batch: the ones that a system object
 * holds in its own item, and the ones in the relationship file.
 */
export function batchRelationships<T = any>(): T[] {
	return [
		...batchItems(SYSTEM_OBJECT_FIELD_FILE).flatMap(
			(item) => item.objectRelationships ?? []
		),
		...batchItems<T>('04-object-relationship.batch-engine-data.json'),
	];
}

/**
 * Returns the hand-maintained input of a visual, such as its config.json or
 * findings.json, from the workspace that the extractors read. A report at a
 * ref then checks that ref's code against that ref's own input. The input
 * of the current checkout is the fallback, for a ref that predates the file.
 */
export function inputFile(dir: string, fileName: string): string {
	const filePath = path.join(dir, fileName);

	const refFilePath = path.join(
		WORKSPACE_ROOT,
		'tools/visuals',
		path.relative(import.meta.dirname, filePath)
	);

	return fs.existsSync(refFilePath) ? refFilePath : filePath;
}

export function listFiles(
	dir: string,
	predicate: (filePath: string) => boolean
): string[] {
	const files: string[] = [];

	if (!fs.existsSync(dir)) {
		return files;
	}

	for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
		const filePath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			if (entry.name !== 'node_modules' && entry.name !== 'build') {
				files.push(...listFiles(filePath, predicate));
			}
		}
		else if (predicate(filePath)) {
			files.push(filePath);
		}
	}

	return files.sort();
}

export function readJSON<T = any>(filePath: string): T {
	return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function relative(filePath: string): string {
	return path.relative(WORKSPACE_ROOT, filePath);
}
