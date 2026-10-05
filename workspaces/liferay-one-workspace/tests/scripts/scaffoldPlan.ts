/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/* eslint-disable no-console -- CLI script; console output is its user interface */

import * as fs from 'fs';
import * as path from 'path';

import {PLAN_DIR, parsePlan} from './lib/plan.ts';
import {enumerateSurface} from './lib/surface.ts';

import type {ISurfaceGroup} from './lib/surface.ts';

interface IFileSpec {
	description: string;
	file: string;
	prefixes: string[];
	title: string;
}

const FILES: IFileSpec[] = [
	{
		description:
			'Every SPA route in the custom element. The `route` attribute of the host widget selects one of nine page group routers. Eight of them carry nested route tables, listed below. The ninth, account-selector, is a single page with no nested routes. A unit test proves a static route table when it asserts the declared paths, elements, and titles. A route group with conditional wiring (for example, the free and paid steps of ProductPurchase) also needs an e2e test. The test loads the route and asserts that it renders for the correct persona. The `*Router.tsx` files also declare routes inline, outside the static table: the MyAccount account guard, the project layout, and the ProductPurchase completion pages. These routes render only behind entitlement or commerce state, so they are e2e or deferred. The flows in flows.md exercise them.',
		file: 'routes.md',
		prefixes: ['route'],
		title: 'Routes',
	},
	{
		description:
			'Every liferay-one-etc-spring-boot REST endpoint. A unit test at the controller level (JUnit MockMvc) covers the contract, status codes, validation, and error handling of each endpoint. The plan tracks real integration coverage as journeys in flows.md. These journeys run through the OAuth2 proxy and against external systems.',
		file: 'rest.md',
		prefixes: ['rest'],
		title: 'REST Endpoints',
	},
	{
		description:
			'Every scheduled background task in liferay-one-etc-spring-boot. A unit test at the handler level (JUnit + Mockito) covers each task, including idempotency. The plan tracks real integration coverage as journeys in flows.md.',
		file: 'crons.md',
		prefixes: ['cron'],
		title: 'Crons',
	},
	{
		description:
			'Every async Pub/Sub subscriber in liferay-one-etc-spring-boot. A unit test at the message handler level (JUnit + Mockito) covers each subscriber, including dedupe and idempotency. The plan tracks real integration coverage as a journey in flows.md.',
		file: 'subscribers.md',
		prefixes: ['subscriber'],
		title: 'Subscribers',
	},
	{
		description:
			'Every Spring service in liferay-one-etc-spring-boot. A service with branching logic (dedupe guards, validation, null and error fallbacks) is `planned`, and a JUnit + Mockito unit test covers it. The logic that the controllers delegate to lives in these services. A thin HTTP CRUD wrapper with no branch worth proving is kept `n/a`. The plan lists it so the list of the surface stays complete, but the go live denominator excludes it.',
		file: 'services.md',
		prefixes: ['service'],
		title: 'Services',
	},
	{
		description:
			'Every DTO/model converter in liferay-one-etc-spring-boot. Each converter is a pure transform from input to output. Each is `planned`, and a JUnit test exercises it directly.',
		file: 'converters.md',
		prefixes: ['converter'],
		title: 'Converters',
	},
	{
		description:
			'Every class in the `jira/synchronizer` package of liferay-one-etc-spring-boot: the synchronizers that push accounts, organizations, users, and role assignments to Jira Service Management, the reconciler that removes orphaned assignments, and the sync models that assemble each asset. A JUnit + Mockito unit test covers each synchronizer, including the rule that an unknown (null) value never overwrites the value in JSM. A plain data holder with no branch is kept `n/a`.',
		file: 'synchronizers.md',
		prefixes: ['synchronizer'],
		title: 'Synchronizers',
	},
	{
		description:
			'Every permission checker in liferay-one-etc-spring-boot. The REST endpoints call these classes to decide 403 versus allow, so each one is `planned`, and a JUnit + Mockito unit test proves both the allow and the deny branches.',
		file: 'permissions.md',
		prefixes: ['permission'],
		title: 'Permissions',
	},
	{
		description:
			'Every `@EventListener` method in liferay-one-etc-spring-boot. These methods run once when the application is ready, outside any request, so a failure shows only in the startup log. A JUnit + Mockito unit test calls the method directly and proves that it does its work and that a failure is logged without stopping the application.',
		file: 'listeners.md',
		prefixes: ['listener'],
		title: 'Listeners',
	},
	{
		description:
			'Every other class in liferay-one-etc-spring-boot that the groups above do not claim: utils, license key generation and parsing, usage strategies, Pub/Sub clients and publishers, the XML reader, base classes, and the models. A class with logic worth proving is `planned`, and a JUnit test exercises it directly. A plain data holder (getters, setters, and a builder with no branch) is kept `n/a`. The plan lists it so the list of the surface stays complete, but the go live denominator excludes it. Exceptions, constants, and the Spring application and cache configuration classes are not listed.',
		file: 'classes.md',
		prefixes: ['class'],
		title: 'Classes',
	},
	{
		description:
			'Every React hook in the custom element, in `src/hooks` and in the `hooks` folders under `src/pages` and `src/components`. A hook with branching logic (derived state, permission checks, error and empty fallbacks) is `planned`, and a Vitest test covers it with `renderHook` against mocked services. A hook that only forwards one fetch to SWR with no branch is kept `n/a`.',
		file: 'hooks.md',
		prefixes: ['hook'],
		title: 'Hooks',
	},
	{
		description:
			'Every API client and data model under `src/services` in the custom element. A client that builds a request (URL, filter, body) or maps a response with branches is `planned`, and a Vitest test covers it with a mocked `fetch`. A client method that only forwards to `fetcher` with a fixed URL is kept `n/a`. The integration tier covers the real endpoints behind these clients through the REST rows.',
		file: 'clients.md',
		prefixes: ['client'],
		title: 'Clients',
	},
	{
		description:
			'Every React context provider and every logic module (utils, schemas, and resolvers) in the custom element. A provider or module with logic worth proving is `planned`, and a Vitest test covers it next to the source file. A module that only holds a static table is kept `n/a`. Components and pages are not listed here: the route rows in routes.md and the journeys in flows.md cover them.',
		file: 'modules.md',
		prefixes: ['context', 'module'],
		title: 'Modules',
	},
];

const ID_PREFIX: Record<string, string> = {
	class: 'CLS',
	client: 'CLIENT',
	context: 'CTX',
	converter: 'CONV',
	cron: 'CRON',
	hook: 'HOOK',
	listener: 'LSN',
	module: 'MOD',
	permission: 'PERM',
	rest: 'REST',
	route: 'ROUTE',
	service: 'SVC',
	subscriber: 'SUB',
	synchronizer: 'SYNC',
};

const DEFAULT_TYPE: Record<string, string> = {
	class: 'unit',
	client: 'unit',
	context: 'unit',
	converter: 'unit',
	cron: 'unit',
	hook: 'unit',
	listener: 'unit',
	module: 'unit',
	permission: 'unit',
	rest: 'unit',
	route: 'unit',
	service: 'unit',
	subscriber: 'unit',
	synchronizer: 'unit',
};

const MODULE_PREFIXES = new Set(['client', 'context', 'hook', 'module']);

const MODULE_PATH_NOISE = new Set([
	'components',
	'context',
	'hooks',
	'pages',
	'services',
	'utils',
]);

const P0_ANCHORS = new Set([
	'route:product-purchase:summary',
	'route:my-account:orders',
	'rest:POST:/entitlements/generate',
	'rest:POST:/ticket-attachments/initiate-upload',
	'service:EntitlementService',
	'subscriber:SalesforceObjectPubsubSubscriber',
]);

function anchorToId(anchor: string): string {
	const [prefix, ...rest] = anchor.split(':');

	let detail = rest.join(':');

	if (MODULE_PREFIXES.has(prefix)) {
		detail = detail
			.split('/')
			.filter((segment) => !MODULE_PATH_NOISE.has(segment))
			.join('/');
	}

	detail = detail
		.toUpperCase()
		.replace(/\?/g, '-OPTIONAL')
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return `${ID_PREFIX[prefix]}-${detail}`;
}

function defaultRequirement(anchor: string): string {
	const [prefix, ...rest] = anchor.split(':');
	const detail = rest.join(':');

	switch (prefix) {
		case 'route':
			return `Route table declares the expected path, element, and title: ${detail}`;
		case 'rest': {
			const [method, ...pathParts] = detail.split(':');

			return `${method} ${pathParts.join(':')} honors its contract, auth, and error cases`;
		}
		case 'cron':
			return `Scheduled task runs correctly and is idempotent: ${detail}`;
		case 'subscriber':
			return `Async subscriber processes and dedupes messages: ${detail}`;
		case 'service':
			return `Service logic (validation, dedupe, null/error fallbacks) is proven in isolation: ${detail}`;
		case 'converter':
			return `Converter maps input to output across its branches: ${detail}`;
		case 'synchronizer':
			return `Synchronizer pushes the expected JSM changes and never overwrites a value with an unknown one: ${detail}`;
		case 'permission':
			return `Permission checker allows the right callers and denies the rest: ${detail}`;
		case 'listener':
			return `Startup listener does its work and logs a failure without stopping the application: ${detail}`;
		case 'class':
			return `Class logic is proven in isolation: ${detail}`;
		case 'hook':
			return `Hook derives the expected state across its loading, empty, and error branches: ${detail}`;
		case 'client':
			return `Client builds the expected request and maps the response: ${detail}`;
		case 'context':
			return `Context provider exposes the expected value to its consumers: ${detail}`;
		case 'module':
			return `Module logic is proven in isolation: ${detail}`;
		default:
			return detail;
	}
}

interface ICurated {
	id: string;
	priority: string;
	requirement: string;
	status: string;
	type: string;
}

function buildTable(
	group: ISurfaceGroup,
	curated: Map<string, ICurated>
): string {
	const rowFor = (anchor: string) => {
		const existing = curated.get(anchor);

		const id = existing?.id ?? anchorToId(anchor);

		const requirement = (
			existing?.requirement ?? defaultRequirement(anchor)
		).replace(/\|/g, '\\|');
		const type = existing?.type ?? DEFAULT_TYPE[group.prefix];
		const priority =
			existing?.priority ?? (P0_ANCHORS.has(anchor) ? 'P0' : 'P1');
		const status = existing?.status ?? 'planned';

		return `| ${id} | ${requirement} | ${type} | ${priority} | ${status} | ${anchor} |`;
	};

	const enumerated = new Set(group.anchors);

	const stale = [...curated.keys()]
		.filter(
			(source) =>
				source.split(':', 1)[0] === group.prefix &&
				!enumerated.has(source)
		)
		.sort();

	for (const source of stale) {
		console.log(
			`kept stale row ${curated.get(source)?.id} (${source}). Edit its ` +
				'Source to the renamed anchor, or delete the row if the code is gone.'
		);
	}

	const rows = [...group.anchors, ...stale].map(rowFor);

	return [
		'| ID | Requirement | Type | Priority | Status | Source |',
		'| --- | --- | --- | --- | --- | --- |',
		...rows,
	].join('\n');
}

function main() {
	fs.mkdirSync(PLAN_DIR, {recursive: true});

	const curated = new Map<string, ICurated>();

	for (const item of parsePlan()) {
		const previous = curated.get(item.source);

		if (
			previous &&
			previous.requirement !== defaultRequirement(item.source)
		) {
			console.log(
				`merged duplicate rows for ${item.source}: kept ${previous.id}, ` +
					`dropped ${item.id}`
			);

			continue;
		}

		if (previous) {
			console.log(
				`merged duplicate rows for ${item.source}: kept ${item.id}, ` +
					`dropped ${previous.id}`
			);
		}

		curated.set(item.source, {
			id: item.id,
			priority: item.priority,
			requirement: item.requirement,
			status: item.status,
			type: item.type,
		});
	}

	const surface = enumerateSurface();
	const byPrefix = new Map<string, ISurfaceGroup>();

	for (const group of surface) {
		byPrefix.set(group.prefix, group);
	}

	for (const spec of FILES) {
		const groups = spec.prefixes
			.map((prefix) => byPrefix.get(prefix))
			.filter((group): group is ISurfaceGroup => Boolean(group));

		const total = groups.reduce(
			(sum, group) => sum + group.anchors.length,
			0
		);

		const sections = groups.map((group) => {
			const heading =
				spec.prefixes.length > 1 ? `\n### ${group.title}\n\n` : '\n';

			return heading + buildTable(group, curated);
		});

		const body = [
			`# ${spec.title}`,
			'',
			spec.description,
			'',
			`> Autoscaffolded from the code surface (${total} items). Edit the Requirement, Type, Priority, and Status columns freely. \`scaffoldPlan\` preserves them on rerun. Do not edit the ID column. When the code anchor of a row changes, edit its Source column so that the row keeps its ID.`,
			...sections,
		].join('\n');

		fs.writeFileSync(path.join(PLAN_DIR, spec.file), body);

		console.log(`wrote plan/${spec.file} (${total} items)`);
	}
}

main();
