/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Reads the configuration that the workspace needs and where the repository
 * sets it: the environment variables that the sidecar reads, the portal
 * properties and feature flags in configs/, and the OSGi configuration files.
 *
 * Only the names of variables are read from .env and .env.local, never the
 * values. UAT and production set their variables in the Liferay Cloud
 * console, which the repository cannot see, so a required variable that no
 * file in the repository sets must be set there.
 */

import * as fs from 'fs';
import * as path from 'path';

import {SPRING_BOOT_DIR, WORKSPACE_ROOT, listFiles, relative} from '../lib.ts';

export interface IVariable {
	default: null | string;
	property: string;
	required: boolean;
	setIn: string[];
	used: boolean;
	variable: string;
}

const CONFIGS_DIR = path.join(WORKSPACE_ROOT, 'configs');

/**
 * A property that the client extension library reads, not the sidecar code.
 */
const LIBRARY_PROPERTY = /\.oauth2\./;

const PLACEHOLDER = /^([\w.-]+)=\$\{(\w+)(?::([^}]*))?\}\s*$/;

export function readConfig() {
	const sources = _variableSources();

	// A property is used when the code injects it with ${...} or names it in
	// a string, such as @ConditionalOnProperty(name = "...").

	const injected = new Set<string>();

	let javaText = '';

	for (const file of listFiles(
		path.join(SPRING_BOOT_DIR, 'src/main/java'),
		(name) => name.endsWith('.java')
	)) {
		const text = fs.readFileSync(file, 'utf8');

		javaText += text;

		for (const match of text.matchAll(/\$\{([\w.-]+)(?::[^}]*)?\}/g)) {
			injected.add(match[1]);
		}
	}

	// @ConfigurationProperties binds every property under its prefix.

	const prefixes = [
		...javaText.matchAll(
			/@ConfigurationProperties\(\s*(?:prefix\s*=\s*)?"([\w.-]+)"/g
		),
	].map((match) => match[1]);

	const variables: IVariable[] = [];

	for (const file of listFiles(
		path.join(SPRING_BOOT_DIR, 'src/main/resources'),
		(name) => /application[\w-]*\.properties$/.test(name)
	)) {
		for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
			const match = PLACEHOLDER.exec(line.trim());

			if (!match) {
				continue;
			}

			variables.push({
				default: match[3] ?? null,
				property: match[1],
				required: match[3] === undefined,
				setIn: Object.entries(sources)
					.filter(([, names]) => names.has(match[2]))
					.map(([source]) => source),
				used:
					injected.has(match[1]) ||
					javaText.includes(`"${match[1]}"`) ||
					prefixes.some((prefix) =>
						match[1].startsWith(`${prefix}.`)
					) ||
					LIBRARY_PROPERTY.test(match[1]),
				variable: match[2],
			});
		}
	}

	return {
		crossEnvironment: _crossEnvironmentHosts(),
		flags: _propertySources(/^feature\.flag\./),
		osgi: _osgiConfigs(),
		properties: _propertySources(/^(?!feature\.flag\.)/),
		localEnv: fs.existsSync(path.join(WORKSPACE_ROOT, '.env')),
		sources: Object.keys(sources),
		variables: variables.sort((a, b) =>
			a.variable.localeCompare(b.variable)
		),
	};
}

function _keys(file: string): Set<string> {
	const keys = new Set<string>();

	if (!fs.existsSync(file)) {
		return keys;
	}

	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		const match = /^\s*(?:export\s+)?([A-Za-z_][\w.-]*)\s*=/.exec(line);

		if (match) {
			keys.add(match[1]);
		}
	}

	return keys;
}

/**
 * Lists each OSGi configuration file by the configs folder that holds it.
 */
function _osgiConfigs() {
	return fs.existsSync(CONFIGS_DIR)
		? listFiles(CONFIGS_DIR, (file) => /\.(cfg|config)$/.test(file)).map(
				(file) => ({
					file: relative(file),
					folder: path.relative(CONFIGS_DIR, file).split(path.sep)[0],
					pid: path.basename(file).replace(/\.(cfg|config)$/, ''),
				})
			)
		: [];
}

/**
 * Returns each portal property that matches `pattern`, with the configs
 * folders that set it. Only configs/common reaches every environment.
 */
function _propertySources(pattern: RegExp) {
	const properties = new Map<string, string[]>();

	if (!fs.existsSync(CONFIGS_DIR)) {
		return [];
	}

	for (const file of listFiles(CONFIGS_DIR, (name) =>
		/portal-[\w-]+\.properties$/.test(name)
	)) {
		const folder = path.relative(CONFIGS_DIR, file).split(path.sep)[0];

		for (const key of _keys(file)) {
			if (!pattern.test(key)) {
				continue;
			}

			properties.set(key, [...(properties.get(key) ?? []), folder]);
		}
	}

	return [...properties.entries()]
		.map(([key, folders]) => ({folders: [...new Set(folders)].sort(), key}))
		.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Returns the names of the variables that each source in the repository
 * sets for the sidecar.
 */
function _variableSources(): Record<string, Set<string>> {
	const compose = new Set<string>();

	const composeFile = path.join(WORKSPACE_ROOT, 'docker-compose.yaml');

	if (fs.existsSync(composeFile)) {
		for (const match of fs
			.readFileSync(composeFile, 'utf8')
			.matchAll(/^\s{12}([A-Z][A-Z0-9_]+):/gm)) {
			compose.add(match[1]);
		}
	}

	const lcp = new Set<string>();

	const lcpFile = path.join(SPRING_BOOT_DIR, 'LCP.json');

	if (fs.existsSync(lcpFile)) {
		const json = JSON.parse(fs.readFileSync(lcpFile, 'utf8'));

		for (const key of Object.keys(json.env ?? {})) {
			lcp.add(key);
		}

		for (const environment of Object.values<any>(json.environments ?? {})) {
			for (const key of Object.keys(environment.env ?? {})) {
				lcp.add(key);
			}
		}
	}

	return {
		'.env': _keys(path.join(WORKSPACE_ROOT, '.env')),
		'.env.local': _keys(path.join(WORKSPACE_ROOT, '.env.local')),
		'LCP.json': lcp,
		'docker-compose.yaml': compose,
	};
}

/**
 * Finds the UAT hosts in the configuration of each client extension that
 * LCP.json deploys to production. A production service that names a UAT host
 * sends production traffic to UAT.
 */
function _crossEnvironmentHosts() {
	const hits: {file: string; host: string; line: number}[] = [];

	for (const lcpFile of listFiles(
		path.join(WORKSPACE_ROOT, 'client-extensions'),
		(name) => path.basename(name) === 'LCP.json'
	)) {
		const environments = Object.keys(
			JSON.parse(fs.readFileSync(lcpFile, 'utf8')).environments ?? {}
		);

		if (!environments.some((name) => /prd|prod/.test(name))) {
			continue;
		}

		for (const file of listFiles(
			path.dirname(lcpFile),
			(name) =>
				/\.(conf|json|properties|ya?ml)$/.test(name) &&
				!name.endsWith('LCP.json') &&
				!name.endsWith('client-extension.yaml')
		)) {
			fs.readFileSync(file, 'utf8')
				.split('\n')
				.forEach((line, index) => {
					for (const match of line.matchAll(
						/https?:\/\/([\w.-]*uat[\w.-]*)/gi
					)) {
						hits.push({
							file: relative(file),
							host: match[1],
							line: index + 1,
						});
					}
				});
		}
	}

	return hits;
}
