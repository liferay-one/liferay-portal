/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Compares the OAuth2 scopes that each client extension declares with the
 * Liferay APIs that the sidecar calls. A call reaches an API through a path
 * string such as "/o/c/licensekeys" or through a generated headless client
 * such as com.liferay.headless.admin.user.client. The scope of an API is
 * Liferay.<Name>.everything, and the scope of a custom object is
 * c_<name>.everything. A scope that ends in .read covers reads only.
 *
 * The scan cannot tell which token a call uses, so a needed scope counts as
 * covered when any OAuth2 application of the sidecar declares it.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	SPRING_BOOT_DIR,
	WORKSPACE_ROOT,
	batchItems,
	listFiles,
	relative,
} from '../lib.ts';

export interface IScopeApplication {
	file: string;
	name: string;
	scopes: string[];
	type: string;
}

export interface IScopeRow {
	declaredBy: string[];
	files: string[];
	readOnly: boolean;
	scope: string;
	status: 'covered' | 'missing' | 'unused';
}

const API_SCOPES: Record<string, string> = {
	'notification': 'Liferay.Notification.REST',
	'object-admin': 'Liferay.Object.Admin.REST',
};

const CLIENT_PACKAGE = /import com\.liferay\.([a-z.]+)\.client\.resource\./g;

const PATH = /"\/o\/([a-z0-9-]+)\/([a-z0-9]*)/g;

export function readScopes(): {
	applications: IScopeApplication[];
	rows: IScopeRow[];
} {
	const applications = _applications();

	const objectNames = new Map<string, string>(
		batchItems('03-object-definition.batch-engine-data.json').map(
			(definition) => [
				definition.restContextPath.replace('/o/c/', ''),
				definition.name,
			]
		)
	);

	const needed = new Map<string, Set<string>>();

	const need = (scope: string, file: string) => {
		if (!needed.has(scope)) {
			needed.set(scope, new Set());
		}

		needed.get(scope)!.add(relative(file));
	};

	for (const file of listFiles(
		path.join(SPRING_BOOT_DIR, 'src/main/java'),
		(name) => name.endsWith('.java')
	)) {
		const text = fs.readFileSync(file, 'utf8');

		for (const match of text.matchAll(PATH)) {
			if (match[1] === 'c') {
				const name = objectNames.get(match[2]);

				if (name) {
					need(`c_${name.toLowerCase()}`, file);
				}
			}
			else {
				const scope = _apiScope(match[1]);

				if (scope) {
					need(scope, file);
				}
			}
		}

		for (const match of text.matchAll(CLIENT_PACKAGE)) {
			const scope = _apiScope(
				match[1].replace(/\.rest$/, '').replaceAll('.', '-')
			);

			if (scope) {
				need(scope, file);
			}
		}
	}

	const sidecarApplications = applications.filter((application) =>
		application.file.includes('liferay-one-etc-spring-boot')
	);

	const declared = new Map<
		string,
		{applications: string[]; readOnly: boolean}
	>();

	for (const application of sidecarApplications) {
		for (const scope of application.scopes) {
			const base = scope.replace(/\.everything(\.read)?$/, '');
			const entry = declared.get(base) ?? {
				applications: [],
				readOnly: true,
			};

			entry.applications.push(application.name);
			entry.readOnly &&= scope.endsWith('.read');

			declared.set(base, entry);
		}
	}

	const rows: IScopeRow[] = [];

	for (const [scope, files] of needed) {
		const entry = declared.get(scope);

		rows.push({
			declaredBy: entry?.applications ?? [],
			files: [...files].sort(),
			readOnly: entry?.readOnly ?? false,
			scope,
			status: entry ? 'covered' : 'missing',
		});
	}

	for (const [scope, entry] of declared) {
		if (!needed.has(scope)) {
			rows.push({
				declaredBy: entry.applications,
				files: [],
				readOnly: entry.readOnly,
				scope,
				status: 'unused',
			});
		}
	}

	return {
		applications,
		rows: rows.sort((a, b) => a.scope.localeCompare(b.scope)),
	};
}

/**
 * Reads every OAuth2 application in the client-extension.yaml files. The
 * files are flat YAML maps, so a line scan reads them.
 */
function _applications(): IScopeApplication[] {
	const applications: IScopeApplication[] = [];

	for (const file of listFiles(
		path.join(WORKSPACE_ROOT, 'client-extensions'),
		(name) => path.basename(name) === 'client-extension.yaml'
	)) {
		let current: IScopeApplication | null = null;
		let inScopes = false;

		const flush = () => {
			if (current && current.type.startsWith('oAuthApplication')) {
				applications.push(current);
			}
		};

		for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
			const key = /^([\w.-]+):\s*$/.exec(line);

			if (key) {
				flush();

				current = {
					file: relative(file),
					name: key[1],
					scopes: [],
					type: '',
				};
				inScopes = false;

				continue;
			}

			if (!current) {
				continue;
			}

			const type = /^\s+type:\s*(\S+)/.exec(line);

			if (type) {
				current.type = type[1];
			}

			if (/^\s+scopes:\s*$/.test(line)) {
				inScopes = true;

				continue;
			}

			const item = /^\s+-\s+(\S+)/.exec(line);

			if (inScopes && item) {
				current.scopes.push(item[1]);
			}
			else if (!/^\s*$/.test(line)) {
				inScopes = false;
			}
		}

		flush();
	}

	return applications;
}

/**
 * Returns the scope name of a Liferay API path segment, such as
 * Liferay.Headless.Admin.User for headless-admin-user, or null for a path
 * that is not a Liferay REST application.
 */
function _apiScope(segment: string): null | string {
	if (API_SCOPES[segment]) {
		return API_SCOPES[segment];
	}

	if (!segment.startsWith('headless-')) {
		return null;
	}

	return (
		'Liferay.' +
		segment
			.split('-')
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join('.')
	);
}
