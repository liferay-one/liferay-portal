/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	CUSTOM_ELEMENT_SRC,
	WORKSPACE_ROOT,
	enumerateClasses,
	enumerateClients,
	enumerateContexts,
	enumerateConverters,
	enumerateHooks,
	enumerateListeners,
	enumerateModules,
	enumeratePermissions,
	enumerateRestEndpointDetails,
	enumerateRouteDeclarations,
	enumerateServices,
	enumerateSubscribers,
	enumerateSynchronizers,
	walk,
} from './surface.ts';

import type {IPlanItem} from './plan.ts';
import type {IRouteDeclaration} from './surface.ts';

interface ITestRoot {
	dir: string;
	match: (file: string) => boolean;
}

const SPRING_BOOT_TEST_JAVA = path.join(
	WORKSPACE_ROOT,
	'client-extensions/liferay-one-etc-spring-boot/src/test'
);

const TEST_ROOTS: ITestRoot[] = [
	{
		dir: path.join(WORKSPACE_ROOT, 'tests'),
		match: (file) => file.endsWith('.spec.ts'),
	},
	{
		dir: CUSTOM_ELEMENT_SRC,
		match: (file) => /\.(test|spec)\.tsx?$/.test(file),
	},
	{
		dir: SPRING_BOOT_TEST_JAVA,
		match: (file) => file.endsWith('.java'),
	},
];

export interface ICoverageEntry {
	file: string;
	inferred: boolean;
}

const ID_PATTERN = /[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+/g;

function addCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	id: string,
	file: string,
	inferred: boolean
): void {
	const entries = coverage.get(id) ?? [];
	const existing = entries.find((entry) => entry.file === file);

	if (existing) {
		existing.inferred = existing.inferred && inferred;
	}
	else {
		entries.push({file, inferred});
	}

	coverage.set(id, entries);
}

function indexExplicitTags(
	coverage: Map<string, ICoverageEntry[]>,
	knownIds: Set<string>
): void {
	for (const root of TEST_ROOTS) {
		for (const file of walk(root.dir, root.match)) {
			const source = fs.readFileSync(file, 'utf8');
			const relative = path.relative(WORKSPACE_ROOT, file);

			for (const match of source.matchAll(ID_PATTERN)) {
				if (!knownIds.has(match[0])) {
					continue;
				}

				addCoverage(coverage, match[0], relative, false);
			}
		}
	}
}

interface IJavaClassKind {
	anchorPrefix: string;
	names: string[];
	suffix: string;
}

function javaClassKinds(): IJavaClassKind[] {
	const names = (anchors: string[]) =>
		anchors.map((anchor) => anchor.slice(anchor.indexOf(':') + 1));

	return [
		{
			anchorPrefix: 'converter',
			names: names(enumerateConverters()),
			suffix: 'Converter',
		},
		{
			anchorPrefix: 'service',
			names: names(enumerateServices()),
			suffix: 'Service',
		},
		{
			anchorPrefix: 'subscriber',
			names: names(enumerateSubscribers()),
			suffix: 'Subscriber',
		},
	];
}

function resolveJavaClassAnchor(
	candidate: string,
	kind: IJavaClassKind,
	source: string
): string | null {
	if (kind.names.includes(candidate)) {
		return `${kind.anchorPrefix}:${candidate}`;
	}

	const tailMatches = kind.names.filter((name) => name.endsWith(candidate));

	if (
		tailMatches.length === 1 &&
		new RegExp(`\\b${tailMatches[0]}\\b`).test(source)
	) {
		return `${kind.anchorPrefix}:${tailMatches[0]}`;
	}

	return null;
}

function inferJavaClassCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	idBySource: Map<string, string>
): void {
	const kinds = javaClassKinds();

	for (const file of walk(SPRING_BOOT_TEST_JAVA, (candidate) =>
		candidate.endsWith('Test.java')
	)) {
		const candidate = path.basename(file, '.java').replace(/Test$/, '');
		const kind = kinds.find((entry) => candidate.endsWith(entry.suffix));

		if (!kind) {
			continue;
		}

		const source = fs.readFileSync(file, 'utf8');
		const anchor = resolveJavaClassAnchor(candidate, kind, source);
		const id = anchor ? idBySource.get(anchor) : undefined;

		if (id) {
			addCoverage(
				coverage,
				id,
				path.relative(WORKSPACE_ROOT, file),
				true
			);
		}
	}
}

function inferJavaExactClassCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	idBySource: Map<string, string>
): void {
	const anchorByName = new Map<string, string>();

	for (const anchor of [
		...enumerateClasses(),
		...enumeratePermissions(),
		...enumerateSynchronizers(),
	]) {
		anchorByName.set(anchor.slice(anchor.indexOf(':') + 1), anchor);
	}

	const listenersByClass = new Map<string, string[]>();

	for (const anchor of enumerateListeners()) {
		const [className, methodName] = anchor
			.slice(anchor.indexOf(':') + 1)
			.split('#');
		const methodNames = listenersByClass.get(className) ?? [];

		methodNames.push(methodName);
		listenersByClass.set(className, methodNames);
	}

	for (const file of walk(SPRING_BOOT_TEST_JAVA, (candidate) =>
		candidate.endsWith('Test.java')
	)) {
		const candidate = path.basename(file, '.java').replace(/Test$/, '');
		const relative = path.relative(WORKSPACE_ROOT, file);

		const anchor = anchorByName.get(candidate);
		const id = anchor ? idBySource.get(anchor) : undefined;

		if (id) {
			addCoverage(coverage, id, relative, true);
		}

		const methodNames = listenersByClass.get(candidate);

		if (!methodNames) {
			continue;
		}

		const source = fs.readFileSync(file, 'utf8');

		for (const methodName of methodNames) {
			if (!new RegExp(`\\.${methodName}\\s*\\(`).test(source)) {
				continue;
			}

			const listenerId = idBySource.get(
				`listener:${candidate}#${methodName}`
			);

			if (listenerId) {
				addCoverage(coverage, listenerId, relative, true);
			}
		}
	}
}

function inferModuleCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	idBySource: Map<string, string>
): void {
	const anchorByPath = new Map<string, string>();

	for (const anchor of [
		...enumerateClients(),
		...enumerateContexts(),
		...enumerateHooks(),
		...enumerateModules(),
	]) {
		anchorByPath.set(anchor.slice(anchor.indexOf(':') + 1), anchor);
	}

	for (const file of walk(CUSTOM_ELEMENT_SRC, (candidate) =>
		/\.(test|spec)\.tsx?$/.test(candidate)
	)) {
		const modulePath = path
			.relative(CUSTOM_ELEMENT_SRC, file)
			.split(path.sep)
			.join('/')
			.replace(/\.(test|spec)\.tsx?$/, '');

		const anchor = anchorByPath.get(modulePath);
		const id = anchor ? idBySource.get(anchor) : undefined;

		if (id) {
			addCoverage(
				coverage,
				id,
				path.relative(WORKSPACE_ROOT, file),
				true
			);
		}
	}
}

function inferRestControllerCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	idBySource: Map<string, string>
): void {
	const controllers = new Map<string, Map<string, string[]>>();

	for (const endpoint of enumerateRestEndpointDetails()) {
		if (!endpoint.methodName) {
			continue;
		}

		const controller = path.basename(endpoint.file, '.java');
		const byMethodName =
			controllers.get(controller) ?? new Map<string, string[]>();
		const anchors = byMethodName.get(endpoint.methodName) ?? [];

		anchors.push(endpoint.anchor);
		byMethodName.set(endpoint.methodName, anchors);
		controllers.set(controller, byMethodName);
	}

	for (const file of walk(SPRING_BOOT_TEST_JAVA, (candidate) =>
		candidate.endsWith('Test.java')
	)) {
		const candidate = path.basename(file, '.java').replace(/Test$/, '');
		const source = fs.readFileSync(file, 'utf8');

		for (const [controller, byMethodName] of controllers) {
			if (!candidate.startsWith(controller)) {
				continue;
			}

			const receiver =
				controller.charAt(0).toLowerCase() + controller.slice(1);
			const calls = new Set(
				[
					...source.matchAll(
						new RegExp(
							`(?:^|[^\\w.])_?${receiver}\\.(\\w+)\\s*\\(`,
							'g'
						)
					),
				].map((match) => match[1])
			);

			for (const [methodName, anchors] of byMethodName) {
				if (anchors.length !== 1 || !calls.has(methodName)) {
					continue;
				}

				const id = idBySource.get(anchors[0]);

				if (id) {
					addCoverage(
						coverage,
						id,
						path.relative(WORKSPACE_ROOT, file),
						true
					);
				}
			}
		}
	}
}

function inferRouteCoverage(
	coverage: Map<string, ICoverageEntry[]>,
	idBySource: Map<string, string>
): void {
	const declarationsByFile = new Map<string, IRouteDeclaration[]>();

	for (const declaration of enumerateRouteDeclarations()) {
		const declarations = declarationsByFile.get(declaration.file) ?? [];

		declarations.push(declaration);
		declarationsByFile.set(declaration.file, declarations);
	}

	for (const file of walk(CUSTOM_ELEMENT_SRC, (candidate) =>
		/\.(test|spec)\.tsx?$/.test(candidate)
	)) {
		const source = fs.readFileSync(file, 'utf8');

		for (const routesFile of importedRouteFiles(
			file,
			source,
			declarationsByFile
		)) {
			for (const declaration of declarationsByFile.get(routesFile) ??
				[]) {
				if (
					!source.includes(`'${declaration.path}'`) &&
					!source.includes(`"${declaration.path}"`)
				) {
					continue;
				}

				const id = idBySource.get(declaration.anchor);

				if (id) {
					addCoverage(
						coverage,
						id,
						path.relative(WORKSPACE_ROOT, file),
						true
					);
				}
			}
		}
	}
}

function importedRouteFiles(
	file: string,
	source: string,
	declarationsByFile: Map<string, IRouteDeclaration[]>
): string[] {
	const files = new Set<string>();

	for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
		const specifier = match[1];

		let resolved = null;

		if (specifier.startsWith('.')) {
			resolved = path.resolve(path.dirname(file), specifier);
		}
		else if (specifier.startsWith('~/')) {
			resolved = path.join(CUSTOM_ELEMENT_SRC, specifier.slice(2));
		}

		if (resolved && declarationsByFile.has(`${resolved}.tsx`)) {
			files.add(`${resolved}.tsx`);
		}
	}

	return [...files].sort();
}

export function indexTests(items: IPlanItem[]): Map<string, ICoverageEntry[]> {
	const coverage = new Map<string, ICoverageEntry[]>();

	const idBySource = new Map(items.map((item) => [item.source, item.id]));

	inferJavaClassCoverage(coverage, idBySource);
	inferJavaExactClassCoverage(coverage, idBySource);
	inferModuleCoverage(coverage, idBySource);
	inferRestControllerCoverage(coverage, idBySource);
	inferRouteCoverage(coverage, idBySource);

	indexExplicitTags(coverage, new Set(items.map((item) => item.id)));

	return coverage;
}

export interface IOrphanTag {
	file: string;
	id: string;
}

export function findOrphanTags(knownIds: Set<string>): IOrphanTag[] {
	const knownPrefixes = new Set<string>();

	for (const id of knownIds) {
		knownPrefixes.add(id.split('-')[0]);
	}

	const orphans: IOrphanTag[] = [];
	const seen = new Set<string>();

	for (const root of TEST_ROOTS) {
		for (const file of walk(root.dir, root.match)) {
			const source = fs.readFileSync(file, 'utf8');
			const relative = path.relative(WORKSPACE_ROOT, file);

			for (const match of source.matchAll(ID_PATTERN)) {
				const id = match[0];

				if (knownIds.has(id) || !knownPrefixes.has(id.split('-')[0])) {
					continue;
				}

				const key = `${relative}::${id}`;

				if (seen.has(key)) {
					continue;
				}

				seen.add(key);

				orphans.push({file: relative, id});
			}
		}
	}

	return orphans;
}
