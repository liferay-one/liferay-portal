/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

const SPRING_BOOT_ROOT = path.resolve(
	__dirname,
	'../../../client-extensions/liferay-one-etc-spring-boot'
);

const SPRING_BOOT_JAVA = path.join(SPRING_BOOT_ROOT, 'src/main/java');

const SPRING_BOOT_PROPERTIES = path.join(
	SPRING_BOOT_ROOT,
	'src/main/resources/application-default.properties'
);

export type HTTPMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export const HTTP_METHODS: HTTPMethod[] = [
	'PATCH',
	'PUT',
	'DELETE',
	'POST',
	'GET',
];

export interface ISpringBootRoute {
	methods: HTTPMethod[];
	path: string;
	url: string;
}

function joinLiterals(concatenation: string | undefined): string {
	if (!concatenation) {
		return '';
	}

	return [...concatenation.matchAll(/"([^"]*)"/g)]
		.map((match) => match[1])
		.join('');
}

function walk(dir: string): string[] {
	const files: string[] = [];

	for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...walk(full));
		}
		else if (entry.name.endsWith('RestController.java')) {
			files.push(full);
		}
	}

	return files;
}

export function enumerateSpringBootRoutes(): ISpringBootRoute[] {
	const routes = new Map<string, Set<HTTPMethod>>();

	for (const file of walk(SPRING_BOOT_JAVA)) {
		const source = fs.readFileSync(file, 'utf8');

		const base = joinLiterals(
			source.match(
				/@RequestMapping\(\s*(?:(?:value|path)\s*=\s*)?("[^"]*"(?:\s*\+\s*"[^"]*")*)/
			)?.[1]
		);

		const mappings = source.matchAll(
			/@(Get|Post|Put|Delete|Patch)Mapping\b(?:\(\s*(?:(?:value|path)\s*=\s*)?("[^"]*"(?:\s*\+\s*"[^"]*")*))?/g
		);

		for (const mapping of mappings) {
			const methodPath = joinLiterals(mapping[2]);

			const routePath =
				`${base}${methodPath && !methodPath.startsWith('/') ? '/' : ''}${methodPath}`.replace(
					/\/{2,}/g,
					'/'
				) || '/';

			const methods = routes.get(routePath) ?? new Set<HTTPMethod>();

			methods.add(mapping[1].toUpperCase() as HTTPMethod);

			routes.set(routePath, methods);
		}
	}

	return [...routes.entries()]
		.map(([routePath, methods]) => ({
			methods: [...methods].sort(),
			path: routePath,
			url: routePath.replace(/\{[^}]+\}/g, '0'),
		}))
		.sort((route1, route2) => route1.path.localeCompare(route2.path));
}

export function getMatchingMethods(
	route: ISpringBootRoute,
	routes: ISpringBootRoute[]
): HTTPMethod[] {
	const methods = new Set<HTTPMethod>();

	for (const candidate of routes) {
		const pattern = new RegExp(
			`^${candidate.path
				.split(/\{[^}]+\}/)
				.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
				.join('[^/]+')}$`
		);

		if (pattern.test(route.url)) {
			candidate.methods.forEach((method) => methods.add(method));
		}
	}

	return [...methods].sort();
}

export function getUnmappedMethod(
	methods: HTTPMethod[],
	routePath: string
): HTTPMethod {
	const method = HTTP_METHODS.find(
		(httpMethod) => !methods.includes(httpMethod)
	);

	if (!method) {
		throw new Error(`Every HTTP method is mapped on ${routePath}`);
	}

	return method;
}

export function readExcludedURLPatterns(): string[] {
	const source = fs
		.readFileSync(SPRING_BOOT_PROPERTIES, 'utf8')
		.replace(/\\\r?\n\s*/g, '');

	const match = source.match(/^liferay\.oauth\.urls\.excludes=(.*)$/m);

	if (!match) {
		throw new Error(
			`No liferay.oauth.urls.excludes property in ${SPRING_BOOT_PROPERTIES}`
		);
	}

	return match[1]
		.split(',')
		.map((pattern) => pattern.replace(/\\\//g, '/').trim())
		.filter(Boolean);
}

export function isExcluded(routeURL: string, patterns: string[]): boolean {
	return patterns.some((pattern) =>
		new RegExp(
			`^${pattern
				.split('*')
				.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
				.join('[^/]+')}$`
		).test(routeURL)
	);
}
