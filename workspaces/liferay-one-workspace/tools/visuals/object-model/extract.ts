/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {BATCH_DIR, SITE_INITIALIZER_DIR, batchItems, readJSON} from '../lib.ts';

import type {IExtraction} from '../lib.ts';

interface IAction {
	executor: string;
	name: string;
	trigger: string;
}

interface IConfig {
	domains: IDomain[];
	softLinks: {
		duplicates?: string;
		field: string;
		from: string;
		note: string;
		to: string;
	}[];
}

interface IDomain {
	id: string;
	label: string;
	members: string[];
}

interface IEdge {
	deletion?: string;
	duplicates: null | string;
	from: string;
	id: string;
	kind: 'relationship' | 'soft';
	name: string;
	note?: string;
	to: string;
	type?: string;
}

interface IField {
	name: string;
	origin?: string;
	picklist: null | string;
	required: boolean;
	state?: boolean;
	type: string;
}

interface IFinding {
	body: string;
	edges: string[];
	nodes: string[];
	sev: 'fixed' | 'high' | 'low' | 'medium';
	title: string;

	/**
	 * Relationship deletion types that the fix sets. The check reports a
	 * fixed finding whose batch file disagrees, and an open finding whose
	 * batch file already agrees.
	 */
	verify?: {
		deletion: Record<string, string>;
	};
}

interface INode {
	actions: IAction[];
	domain: string;
	erc: string;
	fields: IField[];
	folder?: string;
	kind: 'custom' | 'system' | 'virtual';
	label: string;
	name: string;
	plural?: string;
	restricted: null | string;
	separator?: string;
	title?: string;
}

const EXPANDO_DATA_TYPES: Record<number, string> = {
	1: 'Boolean',
	3: 'Date',
	5: 'Double',
	9: 'Integer',
	11: 'Long',
	15: 'Text',
	16: 'Text[]',
};

const EXPANDO_MODELS: Record<string, string> = {
	AccountEntry: 'L_ACCOUNT',
	CPInstance: 'X_CP_INSTANCE',
	CommerceOrder: 'L_COMMERCE_ORDER',
	CommerceOrderItem: 'L_COMMERCE_ORDER_ITEM',
	Organization: 'L_ORGANIZATION',
	User: 'L_USER',
};

const SPRING_BOOT_EXECUTOR_PREFIX =
	'function#liferay-one-etc-spring-boot-object-action-';

/**
 * Liferay entities that the batch files reference but do not define. An X_
 * entity has no object definition, so no object can hold a relationship to
 * it.
 */
const SYSTEM_OBJECTS: Record<string, {label: string; name: string}> = {
	L_ACCOUNT: {label: 'Account', name: 'AccountEntry'},
	L_COMMERCE_ORDER: {label: 'Commerce Order', name: 'CommerceOrder'},
	L_COMMERCE_ORDER_ITEM: {
		label: 'Commerce Order Item',
		name: 'CommerceOrderItem',
	},
	L_COMMERCE_PRODUCT_DEFINITION: {
		label: 'Commerce Product',
		name: 'CPDefinition',
	},
	L_ORGANIZATION: {label: 'Organization', name: 'Organization'},
	L_POSTAL_ADDRESS: {label: 'Postal Address', name: 'Address'},
	L_USER: {label: 'User', name: 'User'},
	X_CP_INSTANCE: {label: 'Commerce SKU', name: 'CPInstance'},
	X_ROLE: {label: 'Role', name: 'Role'},
};

export function extract(): IExtraction {
	const config = readJSON<IConfig>(
		path.join(import.meta.dirname, 'config.json')
	);
	const findings = readJSON<IFinding[]>(
		path.join(import.meta.dirname, 'findings.json')
	);

	const problems: string[] = [];

	const definitions = batchItems(
		'03-object-definition.batch-engine-data.json'
	);
	const expandoColumns = readJSON<any[]>(
		path.join(SITE_INITIALIZER_DIR, 'expando-columns.json')
	);
	const listTypeDefinitions = batchItems(
		'00-list-type-definition.batch-engine-data.json'
	);
	const relationships = batchItems(
		'04-object-relationship.batch-engine-data.json'
	);
	const systemDefinitions = new Map(
		batchItems('02-system-object-field.batch-engine-data.json').map(
			(item) => [item.externalReferenceCode, item]
		)
	);

	const restricted = new Map<string, string>(
		batchItems(
			'05-object-definition-account-entry-restricted.batch-engine-data.json'
		)
			.filter((item) => item.accountEntryRestricted)
			.map((item) => [
				item.externalReferenceCode,
				item.accountEntryRestrictedObjectFieldName,
			])
	);

	const nodes: Record<string, INode> = {};

	for (const definition of definitions) {
		const erc = definition.externalReferenceCode;

		nodes[erc] = {
			actions: _actions(definition.objectActions),
			domain: '',
			erc,
			fields: (definition.objectFields ?? [])
				.filter((field: any) => !field.system)
				.map((field: any) => ({
					name: field.name,
					picklist:
						field.listTypeDefinitionExternalReferenceCode ?? null,
					required: Boolean(field.required),
					state: Boolean(field.state),
					type: field.businessType,
				})),
			folder: definition.objectFolderExternalReferenceCode,
			kind: 'custom',
			label: definition.label.en_US,
			name: definition.name,
			plural: definition.pluralLabel?.en_US,
			restricted: restricted.get(erc) ?? null,
			separator: definition.friendlyURLSeparator ?? null,
			title: definition.titleObjectFieldName,
		};
	}

	for (const [erc, {label, name}] of Object.entries(SYSTEM_OBJECTS)) {
		const systemDefinition = systemDefinitions.get(erc);

		const fields: IField[] = (systemDefinition?.objectFields ?? []).map(
			(field: any) => ({
				name: field.name,
				origin: 'object field',
				picklist: field.listTypeDefinitionExternalReferenceCode ?? null,
				required: false,
				type: field.businessType,
			})
		);

		for (const column of expandoColumns) {
			const model = column.modelResource.split('.').pop();

			if (EXPANDO_MODELS[model] === erc) {
				fields.push({
					name: column.name,
					origin: 'custom field',
					picklist: null,
					required: false,
					type:
						EXPANDO_DATA_TYPES[column.dataType] ??
						String(column.dataType),
				});
			}
		}

		nodes[erc] = {
			actions: _actions(systemDefinition?.objectActions),
			domain: '',
			erc,
			fields,
			kind: erc.startsWith('X_') ? 'virtual' : 'system',
			label,
			name,
			restricted: null,
		};
	}

	for (const erc of systemDefinitions.keys()) {
		if (!SYSTEM_OBJECTS[erc]) {
			problems.push(
				`02-system-object-field defines ${erc}, which SYSTEM_OBJECTS in object-model/extract.ts does not list.`
			);
		}
	}

	_addSiteInitializerActions(nodes);

	const domains = config.domains.map((domain) => ({
		...domain,
		members: domain.members.filter((erc) => {
			if (!nodes[erc]) {
				problems.push(
					`config.json puts ${erc} in the ${domain.id} domain, but no object has that ERC.`
				);

				return false;
			}

			nodes[erc].domain = domain.id;

			return true;
		}),
	}));

	const unassigned = Object.keys(nodes).filter((erc) => !nodes[erc].domain);

	if (unassigned.length) {
		problems.push(
			`Add ${unassigned.join(', ')} to a domain in object-model/config.json.`
		);

		domains.push({
			id: 'unassigned',
			label: 'Unassigned',
			members: unassigned,
		});

		for (const erc of unassigned) {
			nodes[erc].domain = 'unassigned';
		}
	}

	const edges: IEdge[] = relationships.map((relationship) => ({
		deletion: relationship.deletionType,
		duplicates: null,
		from: relationship.objectDefinitionExternalReferenceCode1,
		id: relationship.externalReferenceCode,
		kind: 'relationship',
		name: relationship.name,
		to: relationship.objectDefinitionExternalReferenceCode2,
		type: relationship.type,
	}));

	for (const link of config.softLinks) {
		if (!nodes[link.from]?.fields.some(({name}) => name === link.field)) {
			problems.push(
				`config.json has a soft link from ${link.from}.${link.field}, but that field no longer exists.`
			);

			continue;
		}

		edges.push({
			duplicates: link.duplicates ?? null,
			from: link.from,
			id: `SOFT_${link.from}_${link.field}`,
			kind: 'soft',
			name: link.field,
			note: link.note,
			to: link.to,
		});
	}

	const validEdges = edges.filter((edge) => {
		const missing = [edge.from, edge.to].filter((erc) => !nodes[erc]);

		if (missing.length) {
			problems.push(
				`${edge.kind === 'soft' ? 'Soft link' : 'Relationship'} ${edge.name} points to ${missing.join(' and ')}, which the diagram does not know.`
			);
		}

		return !missing.length;
	});

	const edgeNames = new Set(
		validEdges.flatMap((edge) => [edge.id, edge.name])
	);

	const deletionTypes = new Map(
		validEdges
			.filter((edge) => edge.kind === 'relationship')
			.map((edge) => [edge.name, edge.deletion])
	);

	for (const finding of findings) {
		for (const erc of finding.nodes) {
			if (!nodes[erc]) {
				problems.push(
					`Finding "${finding.title}" names ${erc}, which no longer exists.`
				);
			}
		}

		for (const name of finding.edges) {
			if (!edgeNames.has(name)) {
				problems.push(
					`Finding "${finding.title}" names the link ${name}, which no longer exists.`
				);
			}
		}

		if (finding.verify) {
			const mismatches = Object.entries(finding.verify.deletion).filter(
				([name, deletion]) => deletionTypes.get(name) !== deletion
			);

			if (finding.sev === 'fixed' && mismatches.length) {
				const actual = mismatches
					.map(
						([name, deletion]) =>
							`${name} is ${deletionTypes.get(name) ?? 'missing'}, not ${deletion}`
					)
					.join('; ');

				problems.push(
					`Finding "${finding.title}" is marked fixed, but ${actual}.`
				);

				finding.body += ` Marked fixed, but the batch file does not match: ${actual}.`;
				finding.sev = 'high';
			}
			else if (finding.sev !== 'fixed' && !mismatches.length) {
				problems.push(
					`Finding "${finding.title}" now matches its fix in the batch file. Set its sev to fixed in object-model/findings.json.`
				);
			}
		}

		delete finding.verify;
	}

	const usedPicklists = new Set(
		Object.values(nodes).flatMap((node) =>
			node.fields.map((field) => field.picklist).filter(Boolean)
		)
	);

	// A batch file whose update strategy is UPDATE replaces each entity in
	// full. On a system object that sends an empty objectRelationships, which
	// can delete the system relationships on a redeploy.

	const fullReplace =
		readJSON<{configuration: any}>(
			path.join(
				BATCH_DIR,
				'02-system-object-field.batch-engine-data.json'
			)
		).configuration?.parameters?.updateStrategy === 'UPDATE';

	return {
		actions: [
			...findings
				.filter((finding) => finding.sev !== 'fixed')
				.map((finding) => ({
					detail: finding.body,
					severity: finding.sev as 'high' | 'low' | 'medium',
					source: [...finding.nodes, ...finding.edges].join(', '),
					title: finding.title,
				})),
			...(fullReplace
				? [
						{
							detail: 'Batch 02 imports the six system objects with updateStrategy UPDATE, a full replace. Each item sends no objectRelationships, so a redeploy of liferay-one-batch can delete their system relationships. Test a redeploy on a scratch instance, then use PARTIAL_UPDATE if it does.',
							severity: 'medium' as const,
							source: 'client-extensions/liferay-one-batch/batch/02-system-object-field.batch-engine-data.json',
							title: 'Batch 02 replaces the system objects in full',
							tracked: 'Go-Live Tasks D8',
						},
					]
				: []),
		],
		data: {
			domains,
			edges: validEdges,
			generated: new Date().toISOString().slice(0, 10),
			nodes,
			picklists: listTypeDefinitions
				.map((definition) => ({
					erc: definition.externalReferenceCode,
					keys: (definition.listTypeEntries ?? []).map(
						(entry: any) => entry.key
					),
					used: usedPicklists.has(definition.externalReferenceCode),
				}))
				.sort((a, b) => a.erc.localeCompare(b.erc)),
		},
		problems,
	};
}

function _actions(objectActions: any[] | undefined): IAction[] {
	return (objectActions ?? []).map((action) => ({
		executor: action.objectActionExecutorKey.replace(
			SPRING_BOOT_EXECUTOR_PREFIX,
			'spring-boot: '
		),
		name: action.name,
		trigger: action.objectActionTriggerKey,
	}));
}

function _addSiteInitializerActions(nodes: Record<string, INode>) {
	const objectActionsDir = path.join(SITE_INITIALIZER_DIR, 'object-actions');

	if (!fs.existsSync(objectActionsDir)) {
		return;
	}

	for (const fileName of fs.readdirSync(objectActionsDir).sort()) {
		const content = readJSON<any>(path.join(objectActionsDir, fileName));

		const objectName = /OBJECT_DEFINITION_ID:([^$]+)\$/.exec(
			content.objectDefinitionId ?? ''
		)?.[1];

		const node = Object.values(nodes).find(
			(candidate) => candidate.name === objectName
		);

		if (!node) {
			continue;
		}

		for (const action of _actions(content['object-actions'])) {
			node.actions.push({
				...action,
				executor: `${action.executor} (site initializer)`,
			});
		}
	}
}
