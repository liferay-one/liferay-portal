/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

export const WORKSPACE_ROOT = path.resolve(
	import.meta.dirname,
	'..',
	'..',
	'..'
);

export const CUSTOM_ELEMENT_SRC = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-custom-element/src'
);
const SPRING_BOOT_JAVA = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-etc-spring-boot/src/main/java'
);

export interface ISurfaceGroup {
	anchors: string[];
	description: string;
	prefix: string;
	title: string;
}

export function walk(dir: string, filter: (file: string) => boolean): string[] {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const out: string[] = [];

	for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			if (entry.name === 'node_modules' || entry.name === 'build') {
				continue;
			}

			out.push(...walk(full, filter));
		}
		else if (filter(full)) {
			out.push(full);
		}
	}

	return out;
}

function joinLiterals(concatenation: string | undefined): string {
	if (!concatenation) {
		return '';
	}

	return [...concatenation.matchAll(/"([^"]*)"/g)]
		.map((match) => match[1])
		.join('');
}

function kebab(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/-([A-Z])([A-Z][a-z])/g, '-$1-$2')
		.replace(/_/g, '-')
		.toLowerCase();
}

export interface IRouteDeclaration {
	anchor: string;
	file: string;
	path: string;
}

export function enumerateRouteDeclarations(): IRouteDeclaration[] {
	const files = walk(
		CUSTOM_ELEMENT_SRC,
		(file) =>
			(file.endsWith('Routes.tsx') || file.endsWith('Router.tsx')) &&
			!file.includes('.test.')
	);

	const declarations: IRouteDeclaration[] = [];

	for (const file of files) {
		const group = kebab(
			path.basename(file).replace(/Router?(s)?\.tsx$/, '')
		);
		const source = fs.readFileSync(file, 'utf8');

		const matches = source.matchAll(/\bpath(?::\s*|=)['"]([^'"]+)['"]/g);

		for (const match of matches) {
			const routePath = match[1];

			if (
				routePath === '*' ||
				routePath === '/' ||
				routePath.endsWith('/*')
			) {
				continue;
			}

			declarations.push({
				anchor: `route:${group}:${routePath}`,
				file,
				path: routePath,
			});
		}
	}

	return declarations;
}

export function enumerateRoutes(): string[] {
	return unique(
		enumerateRouteDeclarations().map((declaration) => declaration.anchor)
	);
}

export interface IRestEndpoint {
	anchor: string;
	file: string;
	methodName: string;
}

export function enumerateRestEndpointDetails(): IRestEndpoint[] {
	const files = walk(SPRING_BOOT_JAVA, (file) =>
		file.endsWith('RestController.java')
	);

	const methodRegex =
		/@(Get|Post|Put|Delete|Patch)Mapping\b(?:\(\s*(?:(?:value|path)\s*=\s*)?("[^"]*"(?:\s*\+\s*"[^"]*")*))?/g;
	const methodNameRegex =
		/(?:public|protected|private)\s+[\w<>,\s[\].?]+?\s+(\w+)\s*\(/;

	const endpoints: IRestEndpoint[] = [];

	for (const file of files) {
		const source = fs.readFileSync(file, 'utf8');

		const baseMatch = source.match(
			/@RequestMapping\(\s*(?:(?:value|path)\s*=\s*)?("[^"]*"(?:\s*\+\s*"[^"]*")*)/
		);
		const base = joinLiterals(baseMatch?.[1]);

		for (const match of source.matchAll(methodRegex)) {
			const method = match[1].toUpperCase();
			const methodPath = joinLiterals(match[2]);

			const full = `${base}${
				methodPath && !methodPath.startsWith('/') ? '/' : ''
			}${methodPath}`.replace(/\/{2,}/g, '/');

			const nameMatch = source
				.slice((match.index ?? 0) + match[0].length)
				.match(methodNameRegex);

			endpoints.push({
				anchor: `rest:${method}:${full || '/'}`,
				file,
				methodName: nameMatch ? nameMatch[1] : '',
			});
		}
	}

	return endpoints;
}

export function enumerateRestEndpoints(): string[] {
	return unique(
		enumerateRestEndpointDetails().map((endpoint) => endpoint.anchor)
	);
}

export function enumerateCrons(): string[] {
	const files = walk(SPRING_BOOT_JAVA, (file) => file.endsWith('.java'));

	const anchors: string[] = [];

	for (const file of files) {
		const source = fs.readFileSync(file, 'utf8');

		const matches = source.matchAll(
			/@Scheduled\([^)]*\)\s*(?:public|protected|private)\s+[\w<>,\s[\]]+?\s+(\w+)\s*\(/g
		);

		for (const match of matches) {
			anchors.push(`cron:${match[1]}`);
		}
	}

	return unique(anchors);
}

export function enumerateSubscribers(): string[] {
	const files = walk(
		SPRING_BOOT_JAVA,
		(file) =>
			file.endsWith('Subscriber.java') &&
			!path.basename(file).startsWith('Base')
	);

	return unique(
		files.map((file) => `subscriber:${path.basename(file, '.java')}`)
	);
}

export function enumerateServices(): string[] {
	const files = walk(
		SPRING_BOOT_JAVA,
		(file) =>
			file.endsWith('Service.java') &&
			!path.basename(file).includes('Base')
	);

	return unique(
		files.map((file) => `service:${path.basename(file, '.java')}`)
	);
}

export function enumerateConverters(): string[] {
	const files = walk(
		SPRING_BOOT_JAVA,
		(file) =>
			file.endsWith('Converter.java') &&
			!path.basename(file).includes('Base')
	);

	return unique(
		files.map((file) => `converter:${path.basename(file, '.java')}`)
	);
}

function javaClassName(file: string): string {
	return path.basename(file, '.java');
}

function isJavaPackage(file: string, name: string): boolean {
	return file.includes(`${path.sep}${name}${path.sep}`);
}

export function enumerateSynchronizers(): string[] {
	return unique(
		walk(
			SPRING_BOOT_JAVA,
			(file) =>
				file.endsWith('.java') && isJavaPackage(file, 'synchronizer')
		).map((file) => `synchronizer:${javaClassName(file)}`)
	);
}

export function enumeratePermissions(): string[] {
	return unique(
		walk(
			SPRING_BOOT_JAVA,
			(file) =>
				file.endsWith('Permission.java') &&
				isJavaPackage(file, 'permission')
		).map((file) => `permission:${javaClassName(file)}`)
	);
}

export function enumerateListeners(): string[] {
	const anchors: string[] = [];

	for (const file of walk(SPRING_BOOT_JAVA, (file) =>
		file.endsWith('.java')
	)) {
		const source = fs.readFileSync(file, 'utf8');

		const matches = source.matchAll(
			/@EventListener\b(?:\([^)]*\))?\s*(?:public|protected|private)?\s*[\w<>,\s[\]]+?\s+(\w+)\s*\(/g
		);

		for (const match of matches) {
			anchors.push(`listener:${javaClassName(file)}#${match[1]}`);
		}
	}

	return unique(anchors);
}

export function enumerateClasses(): string[] {
	const claimed = new Set(
		[
			...enumerateConverters(),
			...enumeratePermissions(),
			...enumerateServices(),
			...enumerateSubscribers(),
			...enumerateSynchronizers(),
		].map((anchor) => anchor.slice(anchor.indexOf(':') + 1))
	);

	const files = walk(SPRING_BOOT_JAVA, (file) => {
		const name = path.basename(file);

		return (
			name.endsWith('.java') &&
			!name.endsWith('Constants.java') &&
			!name.endsWith('Exception.java') &&
			!name.endsWith('RestController.java') &&
			!isJavaPackage(file, 'constants') &&
			name !== 'CacheConfiguration.java' &&
			name !== 'OneSpringBootApplication.java'
		);
	});

	return unique(
		files
			.map((file) => javaClassName(file))
			.filter((name) => !claimed.has(name))
			.map((name) => `class:${name}`)
	);
}

function moduleAnchor(prefix: string, file: string): string {
	return `${prefix}:${path
		.relative(CUSTOM_ELEMENT_SRC, file)
		.split(path.sep)
		.join('/')
		.replace(/\.tsx?$/, '')}`;
}

function isBarrel(file: string): boolean {
	return fs
		.readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.every((line) => /^export\s.*\sfrom\s/.test(line));
}

function isHookFile(file: string): boolean {
	return /^use[A-Z]\w*\.tsx?$/.test(path.basename(file));
}

function isModuleFile(file: string): boolean {
	const name = path.basename(file);
	const relative = path.relative(CUSTOM_ELEMENT_SRC, file);
	const topDir = relative.split(path.sep)[0];

	if (
		!/\.tsx?$/.test(name) ||
		/\.(test|spec)\.tsx?$/.test(name) ||
		name.endsWith('.d.ts') ||
		['enums', 'i18n', 'types'].includes(topDir) ||
		['main.tsx', 'testSetup.ts', 'types.ts'].includes(name) ||
		name === 'appConstants.ts' ||
		/^constants\.tsx?$/i.test(name) ||
		/Constants\.ts$/.test(name) ||
		file.includes(`${path.sep}constants${path.sep}`)
	) {
		return false;
	}

	if (topDir === 'context') {
		return true;
	}

	if (name.endsWith('.tsx')) {
		return false;
	}

	return !(name === 'index.ts' && isBarrel(file));
}

function customElementFiles(): string[] {
	return walk(CUSTOM_ELEMENT_SRC, (file) => /\.tsx?$/.test(file));
}

export function enumerateHooks(): string[] {
	return unique(
		customElementFiles()
			.filter(
				(file) =>
					isHookFile(file) &&
					!/\.(test|spec)\.tsx?$/.test(file) &&
					!path
						.relative(CUSTOM_ELEMENT_SRC, file)
						.startsWith('context')
			)
			.map((file) => moduleAnchor('hook', file))
	);
}

export function enumerateClients(): string[] {
	return unique(
		customElementFiles()
			.filter(
				(file) =>
					path
						.relative(CUSTOM_ELEMENT_SRC, file)
						.startsWith(`services${path.sep}`) &&
					!isHookFile(file) &&
					isModuleFile(file)
			)
			.map((file) => moduleAnchor('client', file))
	);
}

export function enumerateContexts(): string[] {
	return unique(
		customElementFiles()
			.filter(
				(file) =>
					path
						.relative(CUSTOM_ELEMENT_SRC, file)
						.startsWith(`context${path.sep}`) && isModuleFile(file)
			)
			.map((file) => moduleAnchor('context', file))
	);
}

export function enumerateModules(): string[] {
	return unique(
		customElementFiles()
			.filter((file) => {
				const relative = path.relative(CUSTOM_ELEMENT_SRC, file);

				return (
					!relative.startsWith(`context${path.sep}`) &&
					!relative.startsWith(`services${path.sep}`) &&
					!isHookFile(file) &&
					!/(Routes?|Router)\.tsx$/.test(file) &&
					isModuleFile(file)
				);
			})
			.map((file) => moduleAnchor('module', file))
	);
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values)).sort();
}

export function enumerateSurface(): ISurfaceGroup[] {
	return [
		{
			anchors: enumerateRoutes(),
			description: 'Custom-element SPA routes across all page groups',
			prefix: 'route',
			title: 'Routes',
		},
		{
			anchors: enumerateRestEndpoints(),
			description: 'liferay-one-etc-spring-boot REST endpoints',
			prefix: 'rest',
			title: 'REST',
		},
		{
			anchors: enumerateCrons(),
			description: 'Scheduled background tasks',
			prefix: 'cron',
			title: 'Crons',
		},
		{
			anchors: enumerateSubscribers(),
			description: 'Async Pub/Sub subscribers',
			prefix: 'subscriber',
			title: 'Subscribers',
		},
		{
			anchors: enumerateServices(),
			description: 'Spring services holding branching logic',
			prefix: 'service',
			title: 'Services',
		},
		{
			anchors: enumerateConverters(),
			description: 'DTO/model converters',
			prefix: 'converter',
			title: 'Converters',
		},
		{
			anchors: enumerateSynchronizers(),
			description:
				'Jira Service Management synchronizers and sync models',
			prefix: 'synchronizer',
			title: 'Synchronizers',
		},
		{
			anchors: enumeratePermissions(),
			description: 'Permission checkers guarding the REST endpoints',
			prefix: 'permission',
			title: 'Permissions',
		},
		{
			anchors: enumerateListeners(),
			description: 'Application event listeners that run at startup',
			prefix: 'listener',
			title: 'Listeners',
		},
		{
			anchors: enumerateClasses(),
			description:
				'Every other Spring Boot class: utils, license, usage strategies, Pub/Sub, XML, and models',
			prefix: 'class',
			title: 'Classes',
		},
		{
			anchors: enumerateHooks(),
			description: 'Custom-element React hooks',
			prefix: 'hook',
			title: 'Hooks',
		},
		{
			anchors: enumerateClients(),
			description: 'Custom-element API clients and data models',
			prefix: 'client',
			title: 'Clients',
		},
		{
			anchors: enumerateContexts(),
			description: 'Custom-element React context providers',
			prefix: 'context',
			title: 'Contexts',
		},
		{
			anchors: enumerateModules(),
			description: 'Custom-element utils, schemas, and logic modules',
			prefix: 'module',
			title: 'Modules',
		},
	];
}

export const ENUMERABLE_PREFIXES = enumerateSurface().map(
	(group) => group.prefix
);
