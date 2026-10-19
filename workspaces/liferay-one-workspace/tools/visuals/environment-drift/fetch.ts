/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

/**
 * Reads the object model of a running environment and writes it to
 * snapshots/<name>.json, which the environment-drift extractor compares with
 * liferay-one-batch. The build itself never calls an environment, so
 * `yarn viz:check` still needs no running portal.
 *
 * Usage:
 *
 *   node tools/visuals/environment-drift/fetch.ts <name> [<name> ...]
 *   node tools/visuals/environment-drift/fetch.ts <name>=<url>
 *
 * A name in environments.json uses the URL and the authentication there.
 * <name>=<url> reads any other instance, such as a worktree instance, with
 * basic authentication.
 *
 * Basic authentication reads LIFERAY_USER and LIFERAY_PASSWORD, which default
 * to test@liferay.com and test. OAuth reads the client credentials from the
 * variables that the environment names in clientIdVariable and
 * clientSecretVariable, which default to LIFERAY_OAUTH_CLIENT_ID and
 * LIFERAY_OAUTH_CLIENT_SECRET. The workspace .env file fills a variable that
 * the shell does not set.
 */

import * as fs from 'fs';
import * as path from 'path';

import {WORKSPACE_ROOT, readJSON} from '../lib.ts';

interface IEnvironment {
	auth: 'basic' | 'oauth';
	clientIdVariable?: string;
	clientSecretVariable?: string;
	url: string;
}

const SCOPES = [
	'Liferay.Headless.Admin.List.Type.everything',
	'Liferay.Object.Admin.REST.everything',
];

const SNAPSHOTS_DIR = path.join(import.meta.dirname, 'snapshots');

const environments = readJSON<Record<string, IEnvironment>>(
	path.join(import.meta.dirname, 'environments.json')
);

const args = process.argv.slice(2);

if (!args.length) {
	console.error(
		`Name an environment: ${Object.keys(environments).join(', ')}, or <name>=<url>.`
	);

	process.exit(1);
}

_loadDotEnv();

fs.mkdirSync(SNAPSHOTS_DIR, {recursive: true});

let failed = false;

for (const arg of args) {
	const [name, url] = arg.split('=');

	const environment: IEnvironment | undefined = url
		? {auth: 'basic', url}
		: environments[name];

	if (!environment) {
		console.error(`No environment named ${name} in environments.json.`);

		failed = true;

		continue;
	}

	try {
		const snapshot = await _snapshot(environment);

		fs.writeFileSync(
			path.join(SNAPSHOTS_DIR, `${name}.json`),
			JSON.stringify(snapshot, null, '\t')
		);

		console.log(
			`${name.padEnd(12)} ${snapshot.objectDefinitions.length} object definitions, ${snapshot.listTypeDefinitions.length} picklists from ${environment.url}`
		);
	}
	catch (error) {
		failed = true;

		console.error(`${name}: unable to read ${environment.url}`);
		console.error(
			error instanceof Error
				? [error.message, (error.cause as Error | undefined)?.message]
						.filter(Boolean)
						.join(': ')
				: error
		);
	}
}

if (failed) {
	process.exit(1);
}

async function _authorization(environment: IEnvironment): Promise<string> {
	if (environment.auth === 'basic') {
		const user = process.env.LIFERAY_USER ?? 'test@liferay.com';
		const password = process.env.LIFERAY_PASSWORD ?? 'test';

		return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
	}

	const clientIdVariable =
		environment.clientIdVariable ?? 'LIFERAY_OAUTH_CLIENT_ID';
	const clientSecretVariable =
		environment.clientSecretVariable ?? 'LIFERAY_OAUTH_CLIENT_SECRET';

	const clientId = process.env[clientIdVariable];
	const clientSecret = process.env[clientSecretVariable];

	if (!clientId || !clientSecret) {
		throw new Error(
			`Set ${clientIdVariable} and ${clientSecretVariable} to read an OAuth environment.`
		);
	}

	// Ask for the two scopes only. A token with every granted scope is larger
	// than the 8 KB header limit of Tomcat.

	const response = await fetch(`${environment.url}/o/oauth2/token`, {
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'client_credentials',
			scope: SCOPES.join(' '),
		}),
		method: 'POST',
	});

	if (!response.ok) {
		throw new Error(`The token request returned ${response.status}.`);
	}

	const {access_token} = (await response.json()) as {access_token: string};

	return `Bearer ${access_token}`;
}

async function _get(
	authorization: string,
	environment: IEnvironment,
	urlPath: string
): Promise<any> {
	const response = await fetch(`${environment.url}${urlPath}`, {
		headers: {Accept: 'application/json', Authorization: authorization},
	});

	if (!response.ok) {
		throw new Error(`GET ${urlPath} returned ${response.status}.`);
	}

	return response.json();
}

function _loadDotEnv() {
	const dotEnv = path.join(WORKSPACE_ROOT, '.env');

	if (!fs.existsSync(dotEnv)) {
		return;
	}

	for (const line of fs.readFileSync(dotEnv, 'utf8').split('\n')) {
		const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);

		if (match && process.env[match[1]] === undefined) {
			process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
		}
	}
}

/**
 * Keeps only the attributes that the extractor compares, so that a snapshot
 * holds the schema and no record data.
 */
async function _snapshot(environment: IEnvironment) {
	const authorization = await _authorization(environment);

	const objectDefinitions = await _get(
		authorization,
		environment,
		'/o/object-admin/v1.0/object-definitions?pageSize=-1'
	);

	const listTypeDefinitions = await _get(
		authorization,
		environment,
		'/o/headless-admin-list-type/v1.0/list-type-definitions?pageSize=-1'
	);

	const picklists = [];

	// The nested listTypeEntries of the collection repeat one definition's
	// entries on some environments, so read the entries of each definition.

	for (const definition of listTypeDefinitions.items) {
		const entries = await _get(
			authorization,
			environment,
			`/o/headless-admin-list-type/v1.0/list-type-definitions/${definition.id}/list-type-entries?pageSize=-1`
		);

		picklists.push({
			externalReferenceCode: definition.externalReferenceCode,
			keys: entries.items.map((entry: any) => entry.key).sort(),
			name: definition.name,
			system: definition.system,
		});
	}

	return {
		fetched: new Date().toISOString(),
		listTypeDefinitions: picklists,
		objectDefinitions: objectDefinitions.items.map((definition: any) => ({
			accountEntryRestricted: definition.accountEntryRestricted,
			accountEntryRestrictedObjectFieldName:
				definition.accountEntryRestrictedObjectFieldName ?? '',
			active: definition.active,
			className: definition.className,
			externalReferenceCode: definition.externalReferenceCode,
			name: definition.name,
			objectFields: definition.objectFields.map((field: any) => ({
				businessType: field.businessType,
				externalReferenceCode: field.externalReferenceCode,
				listTypeDefinitionExternalReferenceCode:
					field.listTypeDefinitionExternalReferenceCode ?? '',
				name: field.name,
				required: field.required,
				state: field.state,
				system: field.system,
			})),
			objectRelationships: definition.objectRelationships.map(
				(relationship: any) => ({
					deletionType: relationship.deletionType,
					externalReferenceCode: relationship.externalReferenceCode,
					name: relationship.name,
					objectDefinitionExternalReferenceCode1:
						relationship.objectDefinitionExternalReferenceCode1,
					objectDefinitionExternalReferenceCode2:
						relationship.objectDefinitionExternalReferenceCode2,
					reverse: relationship.reverse,
					type: relationship.type,
				})
			),
			scope: definition.scope,
			status: definition.status?.label ?? '',
			system: definition.system,
			titleObjectFieldName: definition.titleObjectFieldName ?? '',
		})),
		url: environment.url,
	};
}
