/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Scans the code for the workspace rules in .agents/rules that a pattern can
 * find. Each check is a heuristic: it reports a place to read, not a proven
 * defect. The page lists every hit by rule, and each rule with hits becomes
 * one action in workspace-health.
 *
 * The model rules read the batch client extension instead of code. They
 * check the object definitions against the naming rules and against the
 * constraints that Liferay enforces only when the batch is imported, so a
 * violation shows here before it aborts an import.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	BATCH_DIR,
	CUSTOM_ELEMENT_DIR,
	SPRING_BOOT_DIR,
	batchItems,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';

type Layer = 'controller' | 'model' | 'view';

interface IHit {
	file: string;
	layer: Layer;
	line: number;
	text: string;
}

interface IRule {
	description: string;

	/**
	 * The layers whose code the rule can apply to: the batch client extension
	 * is the model, the custom element is the view, and the sidecar is the
	 * controller.
	 */
	layers: Layer[];
	hits: IHit[];
	id: string;
	rule: string;
	severity: 'high' | 'low' | 'medium';
	title: string;

	/**
	 * The go-live audit finding that the rule checks for, when there is one.
	 */
	tracked?: string;
}

const JAVA_FILES = listFiles(
	path.join(SPRING_BOOT_DIR, 'src/main/java'),
	(file) => file.endsWith('.java')
).filter((file) => !file.includes('liferay-release-tool-ee'));

const SPRING_BEAN =
	/^@(Component|Configuration|Controller|Repository|RestController|Service)\b/m;

const TS_FILES = listFiles(path.join(CUSTOM_ELEMENT_DIR, 'src'), (file) =>
	/\.tsx?$/.test(file)
).filter((file) => !/\.test\.tsx?$|\.d\.ts$|testSetup\.ts$/.test(file));

/**
 * The custom field names that Liferay rejects with
 * ObjectFieldNameException.MustNotBeReserved. The list is _reservedNames in
 * ObjectFieldLocalServiceImpl, and the check ignores case.
 */
const RESERVED_FIELD_NAMES = new Set([
	'actions',
	'companyid',
	'createdate',
	'creator',
	'currentdate',
	'datecreated',
	'datemodified',
	'displaydate',
	'expirationdate',
	'externalreferencecode',
	'groupid',
	'id',
	'keywords',
	'lastpublishdate',
	'modifieddate',
	'reviewdate',
	'status',
	'statusbyuserid',
	'statusbyusername',
	'statusdate',
	'taxonomycategoryids',
	'userid',
	'username',
]);

export function extract() {
	const model = _model();

	const rules: IRule[] = [
		{
			description:
				'An object ERC is C_ and uppercase words, 40 characters or fewer. Its className is com.liferay.object.model.ObjectDefinition#<ERC>, its name is PascalCase, and its scope is company. A field name is camelCase and shorter than 41 characters, and a field ERC is the object ERC followed by the field name in uppercase words, 75 characters or fewer.',
			hits: model.naming,
			id: 'model-object-naming',
			layers: ['model'],
			rule: 'object-naming.md',
			severity: 'low',
			title: 'Object naming',
		},
		{
			description:
				'Liferay rejects a custom field whose name is reserved, such as status, id, creator, or keywords. The rejection aborts the whole object import, and the instance keeps broken draft definitions.',
			hits: model.reserved,
			id: 'model-reserved-field-name',
			layers: ['model'],
			rule: 'site-initializer-format.md',
			severity: 'high',
			title: 'Reserved field name',
		},
		{
			description:
				'The import matches a relationship by its ERC only. A relationship without one is added again on the next import and fails as a duplicate.',
			hits: model.relationshipERC,
			id: 'model-relationship-erc',
			layers: ['model'],
			rule: 'site-initializer-format.md',
			severity: 'medium',
			title: 'Relationship without an ERC',
		},
		{
			description:
				'An account restricted object needs the field that its Account relationship adds, named r_<relationship>_accountEntryId, and that relationship cannot be disassociate. Liferay refuses the restriction otherwise, so the import fails.',
			hits: model.restrictedLink,
			id: 'model-restricted-account-link',
			layers: ['model'],
			rule: 'guest-access.md',
			severity: 'high',
			title: 'Account restriction that Liferay refuses',
		},
		{
			description:
				'An object that is a child of Account holds the data of one account. Unless it is account restricted, a user who can view one entry can view the entries of every account. Restrict it in batch 05, or record why it is shared in rules/config.json.',
			hits: model.unrestricted,
			id: 'model-account-child-restricted',
			layers: ['model'],
			rule: 'Go-Live Tasks audit',
			severity: 'medium',
			title: 'Account child that is not restricted',
			tracked: 'Go-Live Tasks D7',
		},
		{
			description:
				'A loop that calls a service per item turns one round trip into one per item. Fetch the set with one filtered call, or use a batch endpoint.',
			hits: [
				..._loopCalls(TS_FILES, 'ts'),
				..._loopCalls(JAVA_FILES, 'java'),
			],
			id: 'service-call-in-loop',
			layers: ['controller', 'view'],
			rule: 'data-access.md',
			severity: 'medium',
			title: 'Service call inside a loop',
		},
		{
			description:
				"pageSize=-1 is correct for a small, bounded set such as countries or an account's roles. On accounts, orders, license keys, or tickets the request grows with the data. Confirm that each hit reads a bounded set.",
			hits: _matches(
				[...TS_FILES, ...JAVA_FILES],
				/pageSize["']?\s*[:=,]\s*["']?-1\b/g
			),
			id: 'unbounded-page-size',
			layers: ['controller', 'view'],
			rule: 'data-access.md',
			severity: 'low',
			title: 'Unbounded page size',
		},
		{
			description:
				'One instance of a Spring bean serves every request, cron, and subscriber at once. A field that a method writes is shared state: make it volatile with an idempotent recompute, guard it with a lock, or use a concurrent type.',
			hits: _mutableFields(),
			id: 'mutable-singleton-field',
			layers: ['controller'],
			rule: 'concurrency.md',
			severity: 'medium',
			title: 'Mutable field on a Spring singleton',
		},
		{
			description:
				'SimpleDateFormat, DateFormat, and NumberFormat keep parse state, so two threads that share one give wrong results. Declare them in the method, or use DateTimeFormatter.',
			hits: _matches(
				JAVA_FILES,
				/^\t(?:private|protected|public)\s+(?:static\s+)?(?:final\s+)?(?:Simple)?(?:Date|Number|Decimal)Format\s+\w+/gm
			),
			id: 'shared-formatter',
			layers: ['controller'],
			rule: 'concurrency.md',
			severity: 'medium',
			title: 'Formatter held in a field',
		},
		{
			description:
				'An effect that starts an async call can resolve after the component unmounts, or after a newer call for other parameters. Return a cleanup that cancels or ignores the stale result.',
			hits: _effectsWithoutCleanup(),
			id: 'effect-without-cleanup',
			layers: ['view'],
			rule: 'concurrency.md',
			severity: 'low',
			title: 'Async effect without cleanup',
		},
		{
			description:
				'A value quoted into an OData filter without escaping lets a caller close the quote and widen the filter, as the Cloud Native activation code does. Build the filter with a helper that escapes the value, or escape the quote.',
			hits: _filterConcatenations(),
			id: 'hand-built-filter',
			layers: ['controller'],
			rule: 'data-access.md',
			severity: 'high',
			title: 'Unescaped value in a filter',
			tracked: 'Go-Live Tasks S1',
		},
		{
			description:
				'An OR appended to a JQL query without parentheses applies to the whole query, so it widens every clause before it. A ticket search can then return tickets of any project.',
			hits: _matches(
				JAVA_FILES.filter((file) =>
					file.includes(`${path.sep}jira${path.sep}`)
				),
				/append\(\s*" or /gi
			),
			id: 'unparenthesized-or',
			layers: ['controller'],
			rule: 'Go-Live Tasks audit',
			severity: 'high',
			title: 'OR without parentheses in a query',
			tracked: 'Go-Live Tasks S5',
		},
		{
			description:
				'An HTTP client with no connect or read timeout holds a sidecar thread for as long as the other system takes. The clients that the client extension library builds for BaseService are not in this repository, so the scan sees only the clients that the sidecar builds itself.',
			hits: _clientsWithoutTimeout(),
			id: 'http-client-timeout',
			layers: ['controller'],
			rule: 'Go-Live Tasks audit',
			severity: 'medium',
			title: 'HTTP client without a timeout',
			tracked: 'Go-Live Tasks I7',
		},
		{
			description:
				'A log message says "Unable to <verb>", not "Error <verb>ing", "Failed to", or "Cannot".',
			hits: _matches(
				JAVA_FILES,
				/_log\.(?:debug|error|info|warn)\(\s*(?:StringBundler\.concat\(\s*)?"(?:Error\b|Failed to\b|Cannot\b)[^"]*"/g
			),
			id: 'log-message-form',
			layers: ['controller'],
			rule: 'code-style.md',
			severity: 'low',
			title: 'Log message form',
		},
	];

	return {
		actions: rules.flatMap((rule) =>
			rule.layers
				.map((layer) => ({
					hits: rule.hits.filter((hit) => hit.layer === layer),
					layer,
				}))
				.filter(({hits}) => hits.length)
				.map(({hits, layer}) => ({
					anchor: `rule-${rule.id}`,
					detail: `${rule.description} ${hits.length} place(s) in ${new Set(hits.map((hit) => hit.file)).size} file(s), most in ${_topFiles(
						hits
					)}. The rule is ${rule.rule.endsWith('.md') ? `.agents/rules/${rule.rule}` : rule.rule}.`,
					layer,
					severity: rule.severity,
					source: `${hits[0].file}:${hits[0].line}`,
					title: `${rule.title}: ${hits.length}`,
					tracked: rule.tracked ?? null,
				}))
		),
		data: {
			generated: new Date().toISOString().slice(0, 10),
			rules,
		},
		problems: model.problems,
	};
}

/**
 * Names the three files with the most hits, so that an action starts with
 * the place that clears the most of it.
 */
function _topFiles(hits: IHit[]): string {
	const counts = new Map<string, number>();

	for (const hit of hits) {
		counts.set(hit.file, (counts.get(hit.file) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, 3)
		.map(([file, count]) => `${path.basename(file)} (${count})`)
		.join(', ');
}

/**
 * Returns the index after the bracket that closes the one at `open`, in text
 * whose literals are masked.
 */
function _close(masked: string, open: number): number {
	const opening = masked[open];
	const closing = {'(': ')', '[': ']', '{': '}'}[opening]!;

	let depth = 0;

	for (let i = open; i < masked.length; i++) {
		if (masked[i] === opening) {
			depth++;
		}
		else if (masked[i] === closing && !--depth) {
			return i + 1;
		}
	}

	return masked.length;
}

function _effectsWithoutCleanup(): IHit[] {
	const hits: IHit[] = [];

	for (const file of TS_FILES) {
		const text = fs.readFileSync(file, 'utf8');
		const masked = _mask(text);

		for (const match of masked.matchAll(
			/\buseEffect\(\s*(?:async\s*)?\(\)\s*=>\s*\{/g
		)) {
			const open = match.index + match[0].length - 1;
			const body = masked.slice(open, _close(masked, open));

			const async = /\.then\(|\bawait\b|\bfetch\(/.test(body);
			const cleanup =
				/\breturn\s*\(\)\s*=>|\breturn\s+\w+\s*;|AbortController/.test(
					body
				);

			if (async && !cleanup) {
				hits.push(_hit(file, text, match.index));
			}
		}
	}

	return hits;
}

function _hit(file: string, text: string, index: number): IHit {
	const line = text.slice(0, index).split('\n').length;

	return {
		file: relative(file),
		layer: file.endsWith('.java')
			? 'controller'
			: file.startsWith(BATCH_DIR)
				? 'model'
				: 'view',
		line,
		text: text.split('\n')[line - 1].trim().slice(0, 160),
	};
}

/**
 * Finds the calls to a service inside the body of a loop: a for or while
 * statement, or the callback of forEach, map, or flatMap.
 */
function _loopCalls(files: string[], language: 'java' | 'ts'): IHit[] {
	const hits: IHit[] = [];

	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');
		const masked = _mask(text);

		const services =
			language === 'ts'
				? [
						...text.matchAll(
							/import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+'~\/services\//g
						),
					]
						.flatMap((match) =>
							(match[1] ?? match[2]).split(',').map(
								(name) =>
									name
										.trim()
										.split(/\s+as\s+/)
										.pop()!
							)
						)
						.filter(Boolean)
				: [];

		// A Java call counts only when the method it calls reaches a remote
		// system, so a call to an in-memory helper such as
		// LicenseKeyTypeService.isAdminType is not a round trip.

		const fieldTypes =
			language === 'java'
				? _classFieldTypes(text)
				: new Map<string, string>();

		const call =
			language === 'ts'
				? services.length
					? new RegExp(
							String.raw`\bawait\s+(?:${services.join('|')})\.\w+\(`,
							'g'
						)
					: null
				: fieldTypes.size
					? /\b(_\w+)\.(\w+)\(/g
					: null;

		if (!call) {
			continue;
		}

		const seen = new Set<number>();

		for (const match of masked.matchAll(
			/\b(?:for|while)\s*\(|\.(?:flatMap|forEach|map)\(/g
		)) {
			const open = match.index + match[0].length - 1;

			let start = open;
			let end = _close(masked, open);

			if (!match[0].startsWith('.')) {
				const brace = masked.slice(end).search(/\S/);

				if (masked[end + brace] !== '{') {
					continue;
				}

				start = end + brace;
				end = _close(masked, start);
			}

			call.lastIndex = 0;

			const body = masked.slice(start, end);

			// A loop that walks the pages of one query makes one call per page,
			// which the rule allows.

			if (
				/\b(cursor|nextPage|page)\b/.test(
					masked.slice(match.index, start)
				) ||
				/\b(page|currentPage)\s*(\+\+|\+=|=\s*\w*page)|\bnextPage\b|\bcursor\b/i.test(
					body
				)
			) {
				continue;
			}

			for (const found of body.matchAll(call)) {
				if (
					language === 'java' &&
					!_isRemoteCall(fieldTypes.get(found[1]), found[2])
				) {
					continue;
				}

				const index = start + found.index;

				if (!seen.has(index)) {
					seen.add(index);
					hits.push(_hit(file, text, index));
				}
			}
		}
	}

	return hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/**
 * The methods that reach a remote system, as Class#method, found once for
 * every sidecar class.
 */
let classFieldTypes: Map<string, Map<string, string>> | undefined;
let remoteMethods: Set<string> | undefined;

/**
 * Returns the type of each field that a Java class declares or inherits from
 * a class in this repository, by field name. A controller can call a remote
 * service through a field of its parent class.
 */
function _classFieldTypes(text: string): Map<string, string> {
	if (!remoteMethods) {
		remoteMethods = _remoteMethods();
	}

	const name = /\bclass\s+(\w+)/.exec(_mask(text))?.[1];

	return (name && classFieldTypes!.get(name)) || _fieldTypes(text);
}

/**
 * Returns the type of each field that a Java class declares, by field name.
 */
function _fieldTypes(text: string): Map<string, string> {
	return new Map(
		[
			...text.matchAll(
				/^\t(?:private|protected)\s+(?:static\s+)?(?:final\s+)?(\w+)\s+(_\w+)\s*;/gm
			),
		].map((match) => [match[2], match[1]])
	);
}

/**
 * Returns whether calling a method on a field of a type reaches a remote
 * system. A generated headless client or an HTTP client always does. A
 * sidecar method does when its body makes an HTTP call, calls an inherited
 * method of BaseService, or calls another method that reaches a remote
 * system. A method name counts as remote when any of its overloads does. A
 * @Cacheable method makes its round trip once for each cache entry, not once
 * for each call, so it does not count.
 */
function _isRemoteCall(type: string | undefined, method: string): boolean {
	if (!type) {
		return false;
	}

	if (/(?:Client|Resource)$/.test(type)) {
		return true;
	}

	if (!remoteMethods) {
		remoteMethods = _remoteMethods();
	}

	return remoteMethods.has(`${type}#${method}`);
}

function _remoteMethods(): Set<string> {
	const classes = new Map<
		string,
		{
			fieldTypes: Map<string, string>;
			methods: Map<string, string[]>;
			parent?: string;
		}
	>();

	const cached = new Set<string>();

	for (const file of JAVA_FILES) {
		const text = fs.readFileSync(file, 'utf8');
		const masked = _mask(text);

		const name = /\bclass\s+(\w+)/.exec(masked)?.[1];

		if (!name) {
			continue;
		}

		const methods = new Map<string, string[]>();

		for (const match of masked.matchAll(
			/^\t(?:@\w+\s+)*(?:(?:public|protected|private|static|final|synchronized|abstract)\s+)+[\w<>,.?[\]\s]+?\s(\w+)\s*\(/gm
		)) {
			const open = match.index + match[0].length - 1;
			const end = _close(masked, open);
			const brace = masked.slice(end).search(/[{;]/);

			if (brace < 0 || masked[end + brace] !== '{') {
				continue;
			}

			const start = end + brace;

			const annotations = masked.slice(
				Math.max(
					masked.lastIndexOf('}', match.index),
					masked.lastIndexOf(';', match.index),
					masked.lastIndexOf('{', match.index)
				) + 1,
				match.index
			);

			if (annotations.includes('@Cacheable')) {
				cached.add(`${name}#${match[1]}`);
			}

			methods.set(match[1], [
				...(methods.get(match[1]) ?? []),
				masked.slice(start, _close(masked, start)),
			]);
		}

		classes.set(name, {
			fieldTypes: _fieldTypes(text),
			methods,
			parent: /\bclass\s+\w+(?:<[^{]*?>)?\s+extends\s+(\w+)/.exec(
				masked
			)?.[1],
		});
	}

	// Walks a class and the classes it extends in this repository. A chain
	// that leaves the repository at BaseService inherits its HTTP methods.

	const chain = (name: string) => {
		const names: string[] = [];

		let current: string | undefined = name;

		while (current && classes.has(current) && !names.includes(current)) {
			names.push(current);
			current = classes.get(current)!.parent;
		}

		return {baseService: current === 'BaseService', names};
	};

	const declares = (name: string, method: string) =>
		chain(name).names.find((link) =>
			classes.get(link)!.methods.has(method)
		);

	const remote = new Set<string>();

	// A call through a subclass reaches the methods that it inherits, so a
	// method counts as remote where the class or a parent declares it.

	const reaches = (type: string, method: string) => {
		const declaring = classes.has(type)
			? declares(type, method)
			: undefined;

		return remote.has(`${declaring ?? type}#${method}`);
	};

	const isRemote = (owner: string, body: string) => {
		if (
			/\b(?:HttpClient|HttpRequest|RestTemplate|WebClient)\b/.test(body)
		) {
			return true;
		}

		const {fieldTypes} = classes.get(owner)!;

		for (const match of body.matchAll(/\b(_\w+)\.(\w+)\(/g)) {
			const type =
				chain(owner)
					.names.map((link) =>
						classes.get(link)!.fieldTypes.get(match[1])
					)
					.find(Boolean) ?? fieldTypes.get(match[1]);

			if (
				type &&
				(/(?:Client|Resource)$/.test(type) || reaches(type, match[2]))
			) {
				return true;
			}
		}

		for (const match of body.matchAll(/(?<![\w.])(\w+)\s*\(/g)) {
			if (
				/^(?:catch|for|if|new|return|super|switch|synchronized|this|while)$/.test(
					match[1]
				)
			) {
				continue;
			}

			const declaring = declares(owner, match[1]);

			if (declaring) {
				if (remote.has(`${declaring}#${match[1]}`)) {
					return true;
				}
			}
			else if (chain(owner).baseService && /^[a-z]/.test(match[1])) {
				return true;
			}
		}

		return false;
	};

	let grew = true;

	while (grew) {
		grew = false;

		for (const [name, javaClass] of classes) {
			for (const [method, bodies] of javaClass.methods) {
				const key = `${name}#${method}`;

				if (
					!cached.has(key) &&
					!remote.has(key) &&
					bodies.some((body) => isRemote(name, body))
				) {
					remote.add(key);
					grew = true;
				}
			}
		}
	}

	// A call through a subclass reaches the methods that it inherits.

	for (const name of classes.keys()) {
		for (const link of chain(name).names.slice(1)) {
			for (const method of classes.get(link)!.methods.keys()) {
				if (remote.has(`${link}#${method}`)) {
					remote.add(`${name}#${method}`);
				}
			}
		}
	}

	classFieldTypes = new Map(
		[...classes.keys()].map((name) => [
			name,
			new Map(
				chain(name)
					.names.reverse()
					.flatMap((link) => [...classes.get(link)!.fieldTypes])
			),
		])
	);

	return remote;
}

/**
 * Replaces the content of every comment and string literal with spaces, so
 * that brackets inside them do not count and every index still points at
 * the same place in the source.
 */
function _mask(text: string): string {
	return text.replace(
		/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g,
		(literal) => literal.replace(/[^\n]/g, ' ')
	);
}

function _matches(files: string[], pattern: RegExp): IHit[] {
	const hits: IHit[] = [];

	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');

		for (const match of text.matchAll(pattern)) {
			hits.push(_hit(file, text, match.index));
		}
	}

	return hits;
}

/**
 * Finds the instance fields of a Spring bean that a method assigns, unless
 * the field is volatile or of an atomic or concurrent type.
 */
function _mutableFields(): IHit[] {
	const hits: IHit[] = [];

	for (const file of JAVA_FILES) {
		const text = fs.readFileSync(file, 'utf8');

		if (!SPRING_BEAN.test(text)) {
			continue;
		}

		const fieldPattern =
			/^\t(?:private|protected|public)\s+(?!static\b)(?!final\b)(?!volatile\b)([\w<>,?\s[\]]+?)\s+(_\w+)\s*(?:=[^;]*)?;/gm;

		for (const match of text.matchAll(fieldPattern)) {
			const before = text.slice(0, match.index).trimEnd();

			if (/@(Autowired|Inject|Resource|Value)\b[^\n]*$/.test(before)) {
				continue;
			}

			if (
				/^(Atomic|Concurrent|ThreadLocal|LongAdder)/.test(
					match[1].trim()
				)
			) {
				continue;
			}

			const assignment = new RegExp(
				String.raw`\b${match[2]}\s*=(?!=)`,
				'g'
			);

			const assigned = [...text.matchAll(assignment)].some(
				(found) => found.index !== text.indexOf(match[2], match.index)
			);

			if (assigned) {
				hits.push(_hit(file, text, match.index));
			}
		}
	}

	return hits;
}

/**
 * Finds the HTTP clients that the sidecar builds in a file that sets no
 * timeout anywhere.
 */
function _clientsWithoutTimeout(): IHit[] {
	const hits: IHit[] = [];

	for (const file of JAVA_FILES) {
		const text = fs.readFileSync(file, 'utf8');

		if (/timeout/i.test(text)) {
			continue;
		}

		for (const match of text.matchAll(
			/\b(?:HttpClient\.(?:newBuilder|newHttpClient)|WebClient\.(?:builder|create)|_webClientBuilder\.\w+)\(/g
		)) {
			hits.push(_hit(file, text, match.index));
		}
	}

	return hits;
}

/**
 * Finds a value that the code quotes into an OData filter without escaping
 * it. A constant, a numeric ID, and a value passed through an escape helper
 * are safe.
 */
function _filterConcatenations(): IHit[] {
	const hits: IHit[] = [];

	const safe =
		/^(?:_?escape\w*\(|StringUtil\.replace\(|String\.valueOf\(|[A-Z][A-Z0-9_]*\b|[\w.]+\.[A-Z][A-Z0-9_]+\b|[\w.]+\.getId\(\)|\w*Id\b|"|\d)/;

	for (const file of JAVA_FILES) {
		const text = fs.readFileSync(file, 'utf8');

		for (const match of text.matchAll(
			/\beq '"\s*(?:\+|,|\);\s*sb\.append\()\s*([^,+;\n]+)/g
		)) {
			if (!safe.test(match[1].trim())) {
				hits.push(_hit(file, text, match.index));
			}
		}
	}

	return hits;
}

/**
 * Checks the object definitions, relationships, and account restrictions in
 * the batch client extension. A hit points at the line of the item's ERC.
 */
function _model() {
	const definitionsFile = path.join(
		BATCH_DIR,
		'03-object-definition.batch-engine-data.json'
	);
	const relationshipsFile = path.join(
		BATCH_DIR,
		'04-object-relationship.batch-engine-data.json'
	);
	const restrictionsFile = path.join(
		BATCH_DIR,
		'05-object-definition-account-entry-restricted.batch-engine-data.json'
	);
	const systemFieldsFile = path.join(
		BATCH_DIR,
		'02-system-object-field.batch-engine-data.json'
	);

	const config = readJSON<{
		accountChildrenShared: {
			externalReferenceCode: string;
			reason: string;
		}[];
	}>(path.join(import.meta.dirname, 'config.json'));

	const definitions = batchItems(path.basename(definitionsFile));
	const relationships = batchItems(path.basename(relationshipsFile));
	const restrictions = batchItems(path.basename(restrictionsFile));
	const systemDefinitions = batchItems(path.basename(systemFieldsFile));

	const naming: IHit[] = [];
	const problems: string[] = [];
	const relationshipERC: IHit[] = [];
	const reserved: IHit[] = [];
	const restrictedLink: IHit[] = [];
	const unrestricted: IHit[] = [];

	// A field name such as status repeats across objects, so a search can
	// start after the object that holds the field.

	const at = (
		file: string,
		search: string,
		text: string,
		after?: string
	): IHit => {
		const source = fs.readFileSync(file, 'utf8');
		const index = source.indexOf(
			search,
			after ? Math.max(source.indexOf(after), 0) : 0
		);

		return {
			..._hit(file, source, Math.max(index, 0)),
			text,
		};
	};

	const ercAt = (file: string, erc: string, text: string) =>
		at(file, `"externalReferenceCode": "${erc}"`, text);

	const upperWords = (name: string) =>
		name
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
			.toUpperCase();

	for (const definition of definitions) {
		const erc: string = definition.externalReferenceCode ?? '';

		const issues: string[] = [];

		if (!/^C_[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(erc) || erc.length > 40) {
			issues.push(`ERC ${erc || '(none)'}`);
		}

		if (
			definition.className &&
			definition.className !==
				`com.liferay.object.model.ObjectDefinition#${erc}`
		) {
			issues.push(`className ${definition.className}`);
		}

		if (!/^[A-Z][A-Za-z0-9]*$/.test(definition.name ?? '')) {
			issues.push(`name ${definition.name}`);
		}

		if (definition.scope && definition.scope !== 'company') {
			issues.push(`scope ${definition.scope}`);
		}

		if (issues.length) {
			naming.push(
				ercAt(definitionsFile, erc, `${erc}: ${issues.join(', ')}`)
			);
		}

		for (const field of definition.objectFields ?? []) {
			if (field.system) {
				continue;
			}

			const name: string = field.name ?? '';

			if (RESERVED_FIELD_NAMES.has(name.toLowerCase())) {
				reserved.push(
					at(
						definitionsFile,
						`"name": "${name}"`,
						`${erc}.${name} is a reserved field name`,
						`"externalReferenceCode": "${erc}"`
					)
				);
			}

			const fieldIssues: string[] = [];

			if (!/^[a-z][A-Za-z0-9]*$/.test(name) || name.length > 40) {
				fieldIssues.push('name');
			}

			const fieldERC: string | undefined = field.externalReferenceCode;

			if (
				fieldERC &&
				(fieldERC.length > 75 ||
					!fieldERC.startsWith(`${erc}_`) ||
					fieldERC !== `${erc}_${upperWords(name)}`)
			) {
				fieldIssues.push(`ERC ${fieldERC}`);
			}

			if (fieldIssues.length) {
				naming.push(
					ercAt(
						definitionsFile,
						fieldERC ?? erc,
						`${erc}.${name}: ${fieldIssues.join(', ')}`
					)
				);
			}
		}
	}

	for (const definition of systemDefinitions) {
		for (const field of definition.objectFields ?? []) {
			if (
				!field.system &&
				RESERVED_FIELD_NAMES.has(String(field.name).toLowerCase())
			) {
				reserved.push(
					at(
						systemFieldsFile,
						`"name": "${field.name}"`,
						`${definition.externalReferenceCode}.${field.name} is a reserved field name`,
						`"externalReferenceCode": "${definition.externalReferenceCode}"`
					)
				);
			}
		}
	}

	for (const relationship of relationships) {
		if (!relationship.externalReferenceCode) {
			relationshipERC.push(
				at(
					relationshipsFile,
					`"name": "${relationship.name}"`,
					`${relationship.name} has no externalReferenceCode`
				)
			);
		}
	}

	const accountRelationships = relationships.filter(
		(relationship) =>
			relationship.objectDefinitionExternalReferenceCode1 ===
				'L_ACCOUNT' && relationship.type === 'oneToMany'
	);

	const restricted = new Map<string, any>(
		restrictions
			.filter((restriction) => restriction.accountEntryRestricted)
			.map((restriction) => [
				restriction.externalReferenceCode,
				restriction,
			])
	);

	for (const [erc, restriction] of restricted) {
		const fieldName: string =
			restriction.accountEntryRestrictedObjectFieldName ?? '';

		const relationship = accountRelationships.find(
			(accountRelationship) =>
				accountRelationship.objectDefinitionExternalReferenceCode2 ===
					erc &&
				fieldName === `r_${accountRelationship.name}_accountEntryId`
		);

		if (!relationship) {
			restrictedLink.push(
				ercAt(
					restrictionsFile,
					erc,
					`${erc} is restricted by ${fieldName || '(no field)'}, which no Account relationship adds`
				)
			);
		}
		else if (relationship.deletionType === 'disassociate') {
			restrictedLink.push(
				ercAt(
					relationshipsFile,
					relationship.externalReferenceCode,
					`${relationship.name} is disassociate, but ${erc} is restricted by it`
				)
			);
		}
	}

	const shared = new Map(
		config.accountChildrenShared.map((entry) => [
			entry.externalReferenceCode,
			entry.reason,
		])
	);

	const children = new Set<string>();

	for (const relationship of accountRelationships) {
		const child: string =
			relationship.objectDefinitionExternalReferenceCode2;

		if (!child.startsWith('C_') || children.has(child)) {
			continue;
		}

		children.add(child);

		if (!restricted.has(child) && !shared.has(child)) {
			unrestricted.push(
				ercAt(
					relationshipsFile,
					relationship.externalReferenceCode,
					`${child} is a child of Account through ${relationship.name} and is not account restricted`
				)
			);
		}
	}

	for (const erc of shared.keys()) {
		if (!children.has(erc)) {
			problems.push(
				`rules/config.json lists ${erc} as a shared account child, but no Account relationship has it as a child. Remove the entry.`
			);
		}
		else if (restricted.has(erc)) {
			problems.push(
				`rules/config.json lists ${erc} as a shared account child, but batch 05 restricts it. Remove the entry.`
			);
		}
	}

	return {
		naming,
		problems,
		relationshipERC,
		reserved,
		restrictedLink,
		unrestricted,
	};
}
