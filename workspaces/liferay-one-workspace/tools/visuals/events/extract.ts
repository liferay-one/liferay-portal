/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	SITE_INITIALIZER_DIR,
	SPRING_BOOT_DIR,
	WORKSPACE_ROOT,
	batchItems,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';

import type {IExtraction} from '../lib.ts';

interface IEndpoint {
	className: string;
	file: string;
	line: number;
	method: string;
	methodName: string;
	path: string;
}

interface IHandler {
	calls: string[];
	ceEntry?: null | string;
	condition?: null | string;
	enabledProperty?: string;
	executor?: string;
	id: string;
	kind: 'action' | 'cron' | 'subscriber';
	location?: ILocation;
	name: string;
	notes: string[];
	object?: string;
	objectLabel?: string;
	reads: ITouch[];
	resourcePath?: null | string;
	schedule?: string;
	source: string;
	status: 'broken' | 'disabled' | 'notification' | 'ok' | 'other';
	trigger?: string;
	writes: ITouch[];
}

interface IJavaClass {
	extendsName: null | string;
	fields: Map<string, string>;
	file: string;
	header: string;
	methods: Map<string, IJavaMethod>;
	name: string;
}

interface IJavaMethod {
	annotations: string;
	body: string;
	line: number;
	name: string;
}

interface ILocation {
	file: string;
	line: number;
	symbol: string;
}

interface ITouch {
	erc: string;
	via: string;
}

const JAVA_DIR = path.join(SPRING_BOOT_DIR, 'src/main/java');

const READ_VERB = /^_?(count|exists|fetch|find|get|has|is|list|read|search)/;

const WRITE_VERB =
	/^_?(add|complete|create|delete|generate|patch|post|provision|put|reconcile|remove|set|sync|update|upsert)/;

/**
 * Liferay system objects and the names that the sidecar's service classes
 * and the site initializer tokens use for them.
 */
const SYSTEM_OBJECTS: Record<string, {aliases: string[]; label: string}> = {
	L_ACCOUNT: {aliases: ['Account', 'AccountEntry'], label: 'Account'},
	L_COMMERCE_ORDER: {aliases: ['CommerceOrder'], label: 'Commerce Order'},
	L_COMMERCE_ORDER_ITEM: {
		aliases: ['CommerceOrderItem'],
		label: 'Commerce Order Item',
	},
	L_COMMERCE_PRODUCT_DEFINITION: {
		aliases: ['CPDefinition', 'CommerceProduct'],
		label: 'Commerce Product',
	},
	L_ORGANIZATION: {aliases: ['Organization'], label: 'Organization'},
	L_POSTAL_ADDRESS: {aliases: ['PostalAddress'], label: 'Postal Address'},
	L_USER: {aliases: ['User', 'UserAccount'], label: 'User'},
	X_CP_INSTANCE: {aliases: ['CommerceSku'], label: 'Commerce SKU'},
};

const EXPANDO_MODELS: Record<string, string> = {
	AccountEntry: 'L_ACCOUNT',
	CommerceOrder: 'L_COMMERCE_ORDER',
	CommerceOrderItem: 'L_COMMERCE_ORDER_ITEM',
	Organization: 'L_ORGANIZATION',
	User: 'L_USER',
};

export function extract(): IExtraction {
	const problems: string[] = [];

	const objects = _objects();
	const javaClasses = _javaClasses();
	const properties = _properties();
	const ceEntries = _clientExtensionEntries();
	const endpoints = _endpoints(javaClasses);

	const handlers: IHandler[] = [];

	for (const action of _objectActions(objects, problems)) {
		const handler: IHandler = {
			calls: [],
			condition: action.condition || null,
			executor: action.executor,
			id: `action:${action.objectERC}:${action.name}`,
			kind: 'action',
			name: action.name,
			notes: [],
			object: action.objectERC,
			objectLabel:
				objects.labels.get(action.objectERC) ?? action.objectERC,
			reads: [],
			source: action.source,
			status: 'other',
			trigger: action.trigger,
			writes: [],
		};

		if (action.executor === 'notification') {
			handler.status = 'notification';

			if (action.template) {
				handler.notes.push(`Notification template ${action.template}`);
			}
		}
		else if (action.executor.startsWith('function#')) {
			const entryName = action.executor.slice('function#'.length);
			const entry = ceEntries.get(entryName);

			handler.ceEntry = entryName;
			handler.resourcePath = entry?.resourcePath ?? null;

			if (!entry) {
				handler.status = 'broken';
				handler.notes.push(
					`No client-extension.yaml in this workspace declares ${entryName}.`
				);

				problems.push(
					`Object action ${action.name} on ${action.objectERC} calls ${entryName}, which no client-extension.yaml declares.`
				);
			}
			else {
				const endpoint = endpoints.find(
					(candidate) =>
						candidate.path === _normalizePath(entry.resourcePath) &&
						(candidate.method === 'POST' ||
							candidate.method === 'ANY')
				);

				if (!endpoint) {
					handler.status = 'broken';
					handler.notes.push(
						`No controller handles POST ${entry.resourcePath}.`
					);

					problems.push(
						`Object action ${action.name} posts to ${entry.resourcePath}, which no spring-boot controller handles.`
					);
				}
				else {
					handler.status = 'ok';
					handler.location = {
						file: endpoint.file,
						line: endpoint.line,
						symbol: `${endpoint.className}.${endpoint.methodName}`,
					};

					_trace(
						handler,
						javaClasses,
						objects,
						endpoint.className,
						endpoint.methodName
					);
				}
			}
		}

		handlers.push(handler);
	}

	for (const javaClass of javaClasses.values()) {
		for (const method of javaClass.methods.values()) {
			const scheduled = /@Scheduled\s*\(([\s\S]*?)\)\s*$/m.exec(
				method.annotations
			);

			if (!scheduled) {
				continue;
			}

			const cron = /cron\s*=\s*"([^"]+)"/.exec(scheduled[1])?.[1] ?? '';
			const zone = /zone\s*=\s*"([^"]+)"/.exec(scheduled[1])?.[1];

			const resolved = _resolveProperty(cron, properties);

			const handler: IHandler = {
				calls: [],
				id: `cron:${javaClass.name}.${method.name}`,
				kind: 'cron',
				location: {
					file: javaClass.file,
					line: method.line,
					symbol: `${javaClass.name}.${method.name}`,
				},
				name: `${javaClass.name}.${method.name}`,
				notes: cron !== resolved ? [`Configured by ${cron}`] : [],
				reads: [],
				schedule: resolved + (zone ? ` (${zone})` : ''),
				source: 'spring-boot @Scheduled',
				status: 'ok',
				writes: [],
			};

			_trace(handler, javaClasses, objects, javaClass.name, method.name);

			handlers.push(handler);
		}
	}

	for (const javaClass of javaClasses.values()) {
		if (
			!_extendsFrom(javaClass, 'BasePubsubSubscriber', javaClasses) ||
			/\babstract\s+class\b/.test(javaClass.header)
		) {
			continue;
		}

		let entryClass: IJavaClass | undefined = javaClass;
		let entry: IJavaMethod | null = null;

		while (entryClass && !entry) {
			entry =
				entryClass.methods.get('receive') ??
				entryClass.methods.get('onDeadLetter') ??
				null;

			if (!entry) {
				entryClass = entryClass.extendsName
					? javaClasses.get(entryClass.extendsName)
					: undefined;
			}
		}

		const enabledProperty =
			/@ConditionalOnProperty\s*\(([\s\S]*?)\)/.exec(
				javaClass.header
			)?.[1] ?? '';

		const propertyName = /name\s*=\s*"([^"]+)"/.exec(enabledProperty)?.[1];

		const handler: IHandler = {
			calls: [],
			enabledProperty: propertyName,
			id: `subscriber:${javaClass.name}`,
			kind: 'subscriber',
			location: {
				file: (entryClass ?? javaClass).file,
				line: entry?.line ?? 1,
				symbol: `${(entryClass ?? javaClass).name}.${entry?.name ?? ''}`,
			},
			name: javaClass.name,
			notes: [],
			reads: [],
			source: 'Google Pub/Sub',
			status: 'ok',
			writes: [],
		};

		if (propertyName) {
			const value = properties.get(propertyName) ?? '';

			const environment = /^\$\{(\w+)(?::([^}]*))?\}$/.exec(value);

			if (environment && environment[2] === undefined) {
				handler.notes.push(
					`Enabled when the ${environment[1]} environment variable is true. No default.`
				);
			}
			else {
				const enabled = environment ? environment[2] : value;

				handler.notes.push(
					environment
						? `Enabled by the ${environment[1]} environment variable, which defaults to ${enabled}.`
						: `Enabled by ${propertyName}, which is ${enabled || 'not set'}.`
				);

				if (enabled !== 'true') {
					handler.status = 'disabled';
				}
			}
		}

		if (entry && entryClass) {
			_trace(handler, javaClasses, objects, entryClass.name, entry.name);
		}

		handlers.push(handler);
	}

	const usedEntries = new Set(handlers.map((handler) => handler.ceEntry));

	const unusedEntries = [...ceEntries.entries()]
		.filter(
			([name, entry]) =>
				entry.type === 'objectAction' && !usedEntries.has(name)
		)
		.map(([name]) => name);

	const order = {action: 0, cron: 1, subscriber: 2};

	handlers.sort(
		(a, b) =>
			order[a.kind] - order[b.kind] ||
			(a.object ?? '').localeCompare(b.object ?? '') ||
			a.name.localeCompare(b.name)
	);

	return {
		data: {
			generated: new Date().toISOString().slice(0, 10),
			handlers,
			unusedEntries,
		},
		problems,
	};
}

function _clientExtensionEntries() {
	const entries = new Map<string, {resourcePath: string; type: string}>();

	for (const file of listFiles(
		path.join(WORKSPACE_ROOT, 'client-extensions'),
		(filePath) => path.basename(filePath) === 'client-extension.yaml'
	)) {
		let current: null | string = null;
		const values: Record<string, Record<string, string>> = {};

		for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
			const top = /^([\w.-]+):\s*$/.exec(line);

			if (top) {
				current = top[1];
				values[current] = {};

				continue;
			}

			const property = /^ {4}(\w+):\s*(.+)$/.exec(line);

			if (current && property) {
				values[current][property[1]] = property[2].trim();
			}
		}

		for (const [name, value] of Object.entries(values)) {
			if (value.type) {
				entries.set(name, {
					resourcePath: value.resourcePath ?? '',
					type: value.type,
				});
			}
		}
	}

	return entries;
}

function _endpoints(javaClasses: Map<string, IJavaClass>): IEndpoint[] {
	const endpoints: IEndpoint[] = [];

	for (const javaClass of javaClasses.values()) {
		const base = _mapping(javaClass.header);

		if (!base && !/@RestController/.test(javaClass.header)) {
			continue;
		}

		for (const method of javaClass.methods.values()) {
			const mapping = _mapping(method.annotations);

			if (!mapping) {
				continue;
			}

			endpoints.push({
				className: javaClass.name,
				file: javaClass.file,
				line: method.line,
				method: mapping.method,
				methodName: method.name,
				path: _normalizePath(`${base?.path ?? ''}/${mapping.path}`),
			});
		}
	}

	return endpoints;
}

function _extendsFrom(
	javaClass: IJavaClass,
	ancestor: string,
	javaClasses: Map<string, IJavaClass>
): boolean {
	let current: IJavaClass | undefined = javaClass;

	for (let i = 0; current && i < 10; i++) {
		if (current.extendsName === ancestor) {
			return true;
		}

		current = current.extendsName
			? javaClasses.get(current.extendsName)
			: undefined;
	}

	return false;
}

function _javaClasses(): Map<string, IJavaClass> {
	const javaClasses = new Map<string, IJavaClass>();

	for (const file of listFiles(JAVA_DIR, (filePath) =>
		filePath.endsWith('.java')
	)) {
		const source = fs.readFileSync(file, 'utf8');

		const declaration =
			/^(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+(\w+))?/m.exec(
				source
			);

		if (!declaration) {
			continue;
		}

		const fields = new Map<string, string>();

		for (const match of source.matchAll(
			/^\tprivate\s+(?:static\s+)?(?:final\s+)?([\w.]+)(?:<[^;=]*>)?\s+(_\w+)\s*[;=]/gm
		)) {
			fields.set(match[2], match[1]);
		}

		const methods = new Map<string, IJavaMethod>();
		const lines = source.split('\n');

		let annotationStart = source
			.slice(0, declaration.index)
			.split('\n').length;

		for (let i = annotationStart; i < lines.length; i++) {
			const signature =
				/^\t(?:public|protected|private)\s(?!class\b)[^=;]*?\b(\w+)\s*\(/.exec(
					lines[i]
				);

			if (!signature || /^\t\w[^(]*\s_\w+\s*[;=]/.test(lines[i])) {
				if (
					/^\t}\s*$/.test(lines[i]) ||
					/^\t\S.*;\s*$/.test(lines[i])
				) {
					annotationStart = i + 1;
				}

				continue;
			}

			const offset = lines.slice(0, i).join('\n').length + (i ? 1 : 0);

			const body = _block(source, offset);

			if (!methods.has(signature[1])) {
				methods.set(signature[1], {
					annotations: lines.slice(annotationStart, i).join('\n'),
					body,
					line: i + 1,
					name: signature[1],
				});
			}

			const end = offset + body.length;

			i = source.slice(0, end).split('\n').length - 1;
			annotationStart = i + 1;
		}

		javaClasses.set(declaration[1], {
			extendsName: declaration[2] ?? null,
			fields,
			file: relative(file),
			header: source.slice(0, declaration.index + declaration[0].length),
			methods,
			name: declaration[1],
		});
	}

	return javaClasses;
}

/**
 * Returns the text from `offset` to the brace that closes the first block
 * after it, skipping braces inside string and character literals.
 */
function _block(source: string, offset: number): string {
	const open = source.indexOf('{', offset);
	const semicolon = source.indexOf(';', offset);

	if (open < 0 || (semicolon >= 0 && semicolon < open)) {
		return source.slice(offset, semicolon + 1);
	}

	let depth = 0;

	for (let i = open; i < source.length; i++) {
		const char = source[i];

		if (char === '"' || char === "'") {
			if (source.startsWith('"""', i)) {
				i = source.indexOf('"""', i + 3) + 2;

				continue;
			}

			for (i++; i < source.length && source[i] !== char; i++) {
				if (source[i] === '\\') {
					i++;
				}
			}
		}
		else if (char === '/' && source[i + 1] === '/') {
			i = source.indexOf('\n', i);
		}
		else if (char === '/' && source[i + 1] === '*') {
			i = source.indexOf('*/', i) + 1;
		}
		else if (char === '{') {
			depth++;
		}
		else if (char === '}' && --depth === 0) {
			return source.slice(offset, i + 1);
		}
	}

	return source.slice(offset);
}

function _mapping(annotations: string): null | {method: string; path: string} {
	const match =
		/@(Get|Post|Put|Patch|Delete|Request)Mapping\b(?:\s*\(([\s\S]*?)\)\s*$)?/m.exec(
			annotations
		);

	if (!match) {
		return null;
	}

	let method = match[1].toUpperCase();

	if (method === 'REQUEST') {
		method = /RequestMethod\.(\w+)/.exec(match[2] ?? '')?.[1] ?? 'ANY';
	}

	return {method, path: /"([^"]*)"/.exec(match[2] ?? '')?.[1] ?? ''};
}

function _normalizePath(value: string): string {
	return (
		('/' + value)
			.replace(/\/+/g, '/')
			.replace(/\/$/, '')
			.replace(/\{[^}]+\}/g, '{}') || '/'
	);
}

function _objectActions(
	objects: ReturnType<typeof _objects>,
	problems: string[]
) {
	const actions: {
		condition: null | string;
		executor: string;
		name: string;
		objectERC: string;
		source: string;
		template?: string;
		trigger: string;
	}[] = [];

	const add = (objectERC: string, action: any, source: string) => {
		actions.push({
			condition: action.conditionExpression ?? null,
			executor: action.objectActionExecutorKey,
			name: action.name,
			objectERC,
			source,
			template:
				action.parameters?.notificationTemplateExternalReferenceCode,
			trigger: action.objectActionTriggerKey,
		});
	};

	for (const [fileName, source] of [
		['02-system-object-field.batch-engine-data.json', 'batch 02'],
		['03-object-definition.batch-engine-data.json', 'batch 03'],
	]) {
		for (const item of batchItems(fileName)) {
			for (const action of item.objectActions ?? []) {
				add(item.externalReferenceCode, action, source);
			}
		}
	}

	const siteInitializerFiles = listFiles(SITE_INITIALIZER_DIR, (filePath) =>
		filePath.endsWith('object-actions.json')
	);

	for (const file of siteInitializerFiles) {
		const content = readJSON<any>(file);

		const groups = Array.isArray(content)
			? content.map((action) => ({
					actions: [action],
					objectDefinitionId: action.objectDefinitionId,
				}))
			: [
					{
						actions: content['object-actions'] ?? [],
						objectDefinitionId: content.objectDefinitionId,
					},
				];

		for (const group of groups) {
			const objectName = /OBJECT_DEFINITION_ID:([^$]+)\$/.exec(
				group.objectDefinitionId ?? ''
			)?.[1];

			const erc = objectName ? objects.byName.get(objectName) : undefined;

			if (!erc) {
				problems.push(
					`${relative(file)} names the object ${objectName ?? group.objectDefinitionId}, which no batch file defines.`
				);

				continue;
			}

			for (const action of group.actions) {
				add(
					erc,
					action,
					`site initializer ${path.relative(SITE_INITIALIZER_DIR, path.dirname(file)) || 'object-actions'}`
				);
			}
		}
	}

	return actions;
}

function _objects() {
	const byName = new Map<string, string>();
	const byPlural = new Map<string, string>();
	const labels = new Map<string, string>();

	for (const definition of batchItems(
		'03-object-definition.batch-engine-data.json'
	)) {
		const erc = definition.externalReferenceCode;

		byName.set(definition.name, erc);
		labels.set(erc, definition.label?.en_US ?? definition.name);

		if (definition.pluralLabel?.en_US) {
			byPlural.set(
				definition.pluralLabel.en_US.replace(/\s/g, '').toLowerCase(),
				erc
			);
		}
	}

	for (const [erc, {aliases, label}] of Object.entries(SYSTEM_OBJECTS)) {
		labels.set(erc, label);

		for (const alias of aliases) {
			byName.set(alias, erc);
		}
	}

	return {byName, byPlural, labels};
}

function _objectForClass(
	className: string,
	objects: ReturnType<typeof _objects>
): null | string {
	const stem = className.replace(
		/(Acceptance|Generation|GenerateForm|Email)?(Service|Util)$/,
		''
	);

	if (stem === className) {
		return null;
	}

	if (objects.byName.has(stem)) {
		return objects.byName.get(stem)!;
	}

	let best: null | string = null;

	for (const name of objects.byName.keys()) {
		if (stem.startsWith(name) && (!best || name.length > best.length)) {
			best = name;
		}
	}

	return best ? objects.byName.get(best)! : null;
}

function _properties(): Map<string, string> {
	const properties = new Map<string, string>();
	const file = path.join(
		SPRING_BOOT_DIR,
		'src/main/resources/application-default.properties'
	);

	if (!fs.existsSync(file)) {
		return properties;
	}

	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		const match = /^([\w.-]+)\s*=\s*(.*)$/.exec(line.trim());

		if (match) {
			properties.set(match[1], match[2]);
		}
	}

	return properties;
}

/**
 * Resolves Spring placeholders against application-default.properties. An
 * environment variable placeholder resolves to its default, or stays as
 * $NAME when it has none.
 */
function _resolveProperty(
	value: string,
	properties: Map<string, string>,
	depth = 0
): string {
	const resolved = value.replace(
		/\$\{([^}:]+)(?::([^}]*))?\}/g,
		(match, key, fallback) => properties.get(key) ?? fallback ?? `$${key}`
	);

	return resolved !== value && depth < 3
		? _resolveProperty(resolved, properties, depth + 1)
		: resolved;
}

/**
 * Follows the calls from one method into the sidecar's service classes, two
 * calls deep, and records each object that a called service owns. A call
 * whose method name starts with a write verb counts as a write. The scan is
 * a heuristic: it sees field calls such as `_entitlementService.post(...)`
 * and private helpers of the same class, not calls through local variables.
 */
function _trace(
	handler: IHandler,
	javaClasses: Map<string, IJavaClass>,
	objects: ReturnType<typeof _objects>,
	className: string,
	methodName: string
) {
	const calls = new Set<string>();
	const reads = new Map<string, string>();
	const writes = new Map<string, string>();
	const visited = new Set<string>();

	const visit = (
		currentClass: string,
		currentMethod: string,
		depth: number
	) => {
		const key = `${currentClass}.${currentMethod}`;

		if (visited.has(key) || depth > 2) {
			return;
		}

		visited.add(key);

		const javaClass = javaClasses.get(currentClass);
		const method = javaClass?.methods.get(currentMethod);

		if (!javaClass || !method) {
			return;
		}

		for (const match of method.body.matchAll(/\b(_\w+)\.(\w+)\s*\(/g)) {
			const fieldType = javaClass.fields.get(match[1]);

			if (!fieldType || !javaClasses.has(fieldType)) {
				continue;
			}

			const via = `${fieldType}.${match[2]}`;

			calls.add(via);

			const erc = _objectForClass(fieldType, objects);

			if (erc) {
				if (WRITE_VERB.test(match[2])) {
					if (!writes.has(erc)) {
						writes.set(erc, via);
					}
				}
				else if (READ_VERB.test(match[2]) && !reads.has(erc)) {
					reads.set(erc, via);
				}
			}

			visit(fieldType, match[2], depth + 1);
		}

		const ownObject = _objectForClass(currentClass, objects);

		for (const match of method.body.matchAll(/(?<![.\w])(\w+)\s*\(/g)) {
			if (
				match[1] === currentMethod ||
				!javaClass.methods.has(match[1])
			) {
				continue;
			}

			if (
				ownObject &&
				WRITE_VERB.test(match[1]) &&
				!writes.has(ownObject)
			) {
				writes.set(ownObject, `${currentClass}.${match[1]}`);
			}

			visit(currentClass, match[1], depth);
		}

		for (const match of method.body.matchAll(/\/o\/c\/(\w+)/g)) {
			const erc = objects.byPlural.get(match[1]);

			if (erc && !writes.has(erc) && !reads.has(erc)) {
				reads.set(erc, key);
			}
		}
	};

	visit(className, methodName, 0);

	for (const erc of writes.keys()) {
		reads.delete(erc);
	}

	handler.calls = [...calls].sort();
	handler.reads = [...reads].map(([erc, via]) => ({erc, via})).sort(_byErc);
	handler.writes = [...writes].map(([erc, via]) => ({erc, via})).sort(_byErc);
}

function _byErc(a: ITouch, b: ITouch): number {
	return a.erc.localeCompare(b.erc);
}
