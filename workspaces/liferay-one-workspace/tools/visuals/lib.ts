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
 * What the build passes to an extractor. Only workspace-health reads it.
 */
export interface IExtractContext {
	actions: IAction[];

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

export function batchItems<T = any>(fileName: string): T[] {
	return readJSON<{items: T[]}>(path.join(BATCH_DIR, fileName)).items;
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
