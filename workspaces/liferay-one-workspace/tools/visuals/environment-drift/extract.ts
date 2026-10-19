/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Compares the object model that liferay-one-batch defines with the snapshot
 * of each environment in snapshots/, which `yarn viz:env <name>` writes.
 *
 * The comparison reads a fixed set of attributes, not every attribute that
 * the object-admin API returns, because the server adds many attributes that
 * the batch never sends. A difference that every environment shares is shown
 * as such, because it usually means that the batch file and the server
 * disagree, not that one environment drifted.
 *
 * A drift row is data for the page, not a problem: the state of an
 * environment is not in the control of a pull request. The problems are
 * entries in accepted.json that no longer match a drift row.
 */

import * as fs from 'fs';
import * as path from 'path';

import {batchItems, readJSON} from '../lib.ts';
import {readConfig} from './config.ts';

import type {IExtraction} from '../lib.ts';

interface IAccepted {
	environment: string;
	id: string;
	reason: string;
}

interface IDrift {
	attribute: string;
	expected: null | string;
	id: string;
	kind: 'field' | 'object' | 'picklist' | 'relationship';
	note: null | string;
	owner: string;
	subject: string;
	type: 'collision' | 'extra' | 'missing' | 'value';
	values: Record<string, null | string>;
}

interface ISnapshot {
	fetched: string;
	listTypeDefinitions: any[];
	objectDefinitions: any[];
	url: string;
}

const IMMUTABLE: Record<string, string> = {
	'field.businessType':
		'The server keeps the old type on an update. Only a delete and a new field change it, and the delete removes the column data.',
	'field.name':
		'The server does not rename a field, so a batch import collides on the external reference code.',
	'object.className':
		'The class name is fixed when the object is created. Resource permissions and page templates that name the class resolve differently here.',
	'object.name': 'The name is fixed after the object is published.',
};

const SNAPSHOTS_DIR = path.join(import.meta.dirname, 'snapshots');

export function extract(): IExtraction {
	const accepted = readJSON<IAccepted[]>(
		path.join(import.meta.dirname, 'accepted.json')
	);

	const environments = Object.keys(
		readJSON(path.join(import.meta.dirname, 'environments.json'))
	);

	const problems: string[] = [];

	const snapshots: Record<string, ISnapshot> = {};

	if (fs.existsSync(SNAPSHOTS_DIR)) {
		for (const fileName of fs.readdirSync(SNAPSHOTS_DIR).sort()) {
			if (fileName.endsWith('.json')) {
				snapshots[fileName.replace(/\.json$/, '')] = readJSON(
					path.join(SNAPSHOTS_DIR, fileName)
				);
			}
		}
	}

	const drifts = new Map<string, IDrift>();

	for (const [environment, snapshot] of Object.entries(snapshots)) {
		for (const drift of _compare(snapshot)) {
			const row = drifts.get(drift.id) ?? {...drift, values: {}};

			row.values[environment] = drift.values.actual;

			drifts.set(drift.id, row);
		}
	}

	for (const entry of accepted) {
		if (!environments.includes(entry.environment)) {
			problems.push(
				`environment-drift/accepted.json names the environment ${entry.environment}, which environments.json does not list.`
			);

			continue;
		}

		if (!snapshots[entry.environment]) {
			continue;
		}

		const row = drifts.get(entry.id);

		if (!row || !(entry.environment in row.values)) {
			problems.push(
				`environment-drift/accepted.json accepts ${entry.id} on ${entry.environment}, which no longer drifts in the ${entry.environment} snapshot. Remove the entry.`
			);
		}
	}

	const config = readConfig();

	const unusedVariables = config.variables.filter(
		(variable) => !variable.used
	);
	const localFlags = config.flags.filter(
		(flag) => !flag.folders.includes('common')
	);
	const unsetVariables = config.localEnv
		? config.variables.filter(
				(variable) => variable.required && !variable.setIn.length
			)
		: [];

	// Each check below records a finding of the go-live audit, so its action
	// is tracked under that ID.

	const secretDefaults = config.variables.filter(
		(variable) =>
			/secret|password|token/i.test(variable.property) && variable.default
	);
	const deadLetters = config.variables.filter(
		(variable) =>
			/dead\.letter.*enabled$/.test(variable.property) &&
			variable.default === 'false'
	);

	const configActions = [
		...secretDefaults.map((variable) => ({
			anchor: 'variables-card',
			detail: `${variable.property} falls back to a value in application-default.properties when ${variable.variable} is not set, so an environment that forgets the variable runs with a secret that is in the repository. Remove the default, so the sidecar fails to start without it.`,
			item: variable.variable,
			severity: 'high' as const,
			source: 'client-extensions/liferay-one-etc-spring-boot/src/main/resources/application-default.properties',
			title: `${variable.variable} has a default secret`,
			tracked: 'Go-Live Tasks S8',
		})),
		...deadLetters.map((variable) => ({
			anchor: 'variables-card',
			detail: `${variable.property} defaults to false, so a failed message on this subscription is dropped unless each environment sets ${variable.variable}.`,
			item: variable.variable,
			severity: 'medium' as const,
			source: 'client-extensions/liferay-one-etc-spring-boot/src/main/resources/application-default.properties',
			title: `${variable.variable} is off by default`,
			tracked: 'Go-Live Tasks I4',
		})),
		...config.crossEnvironment.map((hit) => ({
			anchor: 'config-section',
			detail: `LCP.json deploys this client extension to production, and its configuration names the UAT host ${hit.host}. Production traffic goes to UAT. Make the host environment specific.`,
			item: hit.host,
			severity: 'high' as const,
			source: `${hit.file}:${hit.line}`,
			title: `Production configuration names ${hit.host}`,
			tracked: 'Go-Live Tasks I1',
		})),
		...unusedVariables.map((variable) => ({
			anchor: 'variables-card',
			detail: `application-default.properties maps ${variable.variable} to ${variable.property}, and no sidecar code reads the property. Remove both, or wire the property in.`,
			item: variable.variable,
			severity: 'low' as const,
			source: variable.property,
			title: `${variable.variable} is unused`,
		})),
		...(localFlags.length
			? [
					{
						anchor: 'properties-card',
						detail: `Only configs/local sets ${localFlags.map((flag) => flag.key.replace('feature.flag.', '')).join(', ')}. UAT and production do not get them from the repository, so confirm that each environment sets the flags it needs.`,
						severity: 'info' as const,
						source: 'configs/local',
						title: `${localFlags.length} feature flags are enabled only locally`,
					},
				]
			: []),
		...unsetVariables.map((variable) => ({
			anchor: 'variables-card',
			detail: `The sidecar requires ${variable.variable}, and neither .env, .env.local, docker-compose.yaml, nor LCP.json sets it in this checkout. Run /one-env-pull, or add it to .env.local.`,
			item: variable.variable,
			severity: 'medium' as const,
			source: variable.property,
			title: `${variable.variable} is not set locally`,
		})),
	];

	return {
		actions: configActions,
		data: {
			accepted,
			config,
			drifts: [...drifts.values()].sort(
				(a, b) =>
					a.owner.localeCompare(b.owner) ||
					a.kind.localeCompare(b.kind) ||
					a.subject.localeCompare(b.subject) ||
					a.attribute.localeCompare(b.attribute)
			),
			environments: Object.entries(snapshots).map(([name, snapshot]) => ({
				fetched: snapshot.fetched,
				name,
				objects: snapshot.objectDefinitions.length,
				picklists: snapshot.listTypeDefinitions.length,
				url: snapshot.url,
			})),
			generated: new Date().toISOString().slice(0, 10),
			known: environments,
		},
		problems,
	};
}

/**
 * Returns each difference between the batch and one snapshot. The value in
 * the snapshot is in values.actual.
 */
function _compare(snapshot: ISnapshot): IDrift[] {
	const drifts: IDrift[] = [];

	const add = (
		drift: Omit<IDrift, 'note' | 'values'> & {actual: null | string}
	) => {
		const {actual, ...rest} = drift;

		drifts.push({
			...rest,
			note: IMMUTABLE[`${drift.kind}.${drift.attribute}`] ?? null,
			values: {actual},
		});
	};

	const compare = (
		base: Omit<
			IDrift,
			'attribute' | 'expected' | 'note' | 'type' | 'values'
		>,
		attributes: Record<string, [unknown, unknown]>
	) => {
		for (const [attribute, [expected, actual]] of Object.entries(
			attributes
		)) {

			// The batch leaves some attributes to the server. Compare only the
			// attributes that it sets.

			if (expected !== undefined && String(expected) !== String(actual)) {
				add({
					...base,
					actual: String(actual),
					attribute,
					expected: String(expected),
					id: `${base.id}:${attribute}`,
					type: 'value',
				});
			}
		}
	};

	const restrictions = new Map(
		batchItems(
			'05-object-definition-account-entry-restricted.batch-engine-data.json'
		).map((item) => [item.externalReferenceCode, item])
	);

	const live = new Map<string, any>(
		snapshot.objectDefinitions.map((definition) => [
			definition.externalReferenceCode,
			definition,
		])
	);

	const customDefinitions = batchItems(
		'03-object-definition.batch-engine-data.json'
	);

	const systemDefinitions = batchItems(
		'02-system-object-field.batch-engine-data.json'
	);

	for (const definition of [...customDefinitions, ...systemDefinitions]) {
		const erc = definition.externalReferenceCode;
		const liveDefinition = live.get(erc);

		if (!liveDefinition) {
			add({
				actual: null,
				attribute: 'missing',
				expected: definition.name,
				id: `object:${erc}`,
				kind: 'object',
				owner: erc,
				subject: definition.name,
				type: 'missing',
			});

			continue;
		}

		if (!definition.system) {
			const restriction = restrictions.get(erc);

			compare(
				{
					id: `object:${erc}`,
					kind: 'object',
					owner: erc,
					subject: definition.name,
				},
				{
					accountEntryRestricted: [
						Boolean(restriction?.accountEntryRestricted),
						liveDefinition.accountEntryRestricted,
					],
					accountEntryRestrictedObjectFieldName: [
						restriction?.accountEntryRestrictedObjectFieldName ??
							'',
						liveDefinition.accountEntryRestrictedObjectFieldName,
					],
					active: [definition.active ?? true, liveDefinition.active],
					className: [definition.className, liveDefinition.className],
					name: [definition.name, liveDefinition.name],
					scope: [definition.scope, liveDefinition.scope],
					status: ['approved', liveDefinition.status],
					titleObjectFieldName: [
						definition.titleObjectFieldName,
						liveDefinition.titleObjectFieldName,
					],
				}
			);
		}

		const batchFields = (definition.objectFields ?? []).filter(
			(field: any) => !_isRelationshipField(field)
		);

		for (const field of batchFields) {
			const byERC = liveDefinition.objectFields.find(
				(liveField: any) =>
					liveField.externalReferenceCode ===
					field.externalReferenceCode
			);
			const byName = liveDefinition.objectFields.find(
				(liveField: any) => liveField.name === field.name
			);

			const base = {
				id: `field:${erc}:${field.externalReferenceCode}`,
				kind: 'field' as const,
				owner: erc,
				subject: field.name,
			};

			if (!byERC && !byName) {
				add({
					...base,
					actual: null,
					attribute: 'missing',
					expected: field.businessType,
					type: 'missing',
				});

				continue;
			}

			if (!byERC || (byName && byName !== byERC)) {
				add({
					...base,
					actual: byName.externalReferenceCode,
					attribute: 'externalReferenceCode',
					expected: field.externalReferenceCode,
					type: 'collision',
				});

				continue;
			}

			if (byERC.name !== field.name) {
				add({
					...base,
					actual: byERC.name,
					attribute: 'name',
					expected: field.name,
					type: 'collision',
				});
			}

			compare(base, {
				businessType: [field.businessType, byERC.businessType],
				listTypeDefinitionExternalReferenceCode: [
					field.listTypeDefinitionExternalReferenceCode ?? '',
					byERC.listTypeDefinitionExternalReferenceCode,
				],
				required: [Boolean(field.required), byERC.required],
				state: [Boolean(field.state), byERC.state],
			});
		}

		for (const liveField of liveDefinition.objectFields) {
			if (
				liveField.system ||
				_isRelationshipField(liveField) ||
				batchFields.some(
					(field: any) =>
						field.externalReferenceCode ===
							liveField.externalReferenceCode ||
						field.name === liveField.name
				)
			) {
				continue;
			}

			add({
				actual: liveField.businessType,
				attribute: 'extra',
				expected: null,
				id: `field:${erc}:${liveField.externalReferenceCode}`,
				kind: 'field',
				owner: erc,
				subject: liveField.name,
				type: 'extra',
			});
		}
	}

	const batchRelationships = batchItems(
		'04-object-relationship.batch-engine-data.json'
	);

	const liveRelationships = snapshot.objectDefinitions.flatMap((definition) =>
		definition.objectRelationships.filter(
			(relationship: any) => !relationship.reverse
		)
	);

	for (const relationship of batchRelationships) {
		const owner = relationship.objectDefinitionExternalReferenceCode1;

		const base = {
			id: `relationship:${owner}:${relationship.name}`,
			kind: 'relationship' as const,
			owner,
			subject: relationship.name,
		};

		const liveRelationship = liveRelationships.find(
			(item: any) =>
				item.objectDefinitionExternalReferenceCode1 === owner &&
				item.name === relationship.name
		);

		if (!liveRelationship) {
			add({
				...base,
				actual: null,
				attribute: 'missing',
				expected: `${relationship.type} to ${relationship.objectDefinitionExternalReferenceCode2}`,
				type: 'missing',
			});

			continue;
		}

		if (
			liveRelationship.externalReferenceCode !==
			relationship.externalReferenceCode
		) {
			add({
				...base,
				actual: liveRelationship.externalReferenceCode,
				attribute: 'externalReferenceCode',
				expected: relationship.externalReferenceCode,
				type: 'collision',
			});
		}

		compare(base, {
			deletionType: [
				relationship.deletionType,
				liveRelationship.deletionType,
			],
			objectDefinitionExternalReferenceCode2: [
				relationship.objectDefinitionExternalReferenceCode2,
				liveRelationship.objectDefinitionExternalReferenceCode2,
			],
			type: [relationship.type, liveRelationship.type],
		});
	}

	const customERCs = new Set(
		customDefinitions.map((definition) => definition.externalReferenceCode)
	);

	for (const liveRelationship of liveRelationships) {
		if (
			!customERCs.has(
				liveRelationship.objectDefinitionExternalReferenceCode1
			) &&
			!customERCs.has(
				liveRelationship.objectDefinitionExternalReferenceCode2
			)
		) {
			continue;
		}

		if (
			batchRelationships.some(
				(relationship) =>
					relationship.objectDefinitionExternalReferenceCode1 ===
						liveRelationship.objectDefinitionExternalReferenceCode1 &&
					relationship.name === liveRelationship.name
			)
		) {
			continue;
		}

		add({
			actual: `${liveRelationship.type} to ${liveRelationship.objectDefinitionExternalReferenceCode2}`,
			attribute: 'extra',
			expected: null,
			id: `relationship:${liveRelationship.objectDefinitionExternalReferenceCode1}:${liveRelationship.name}`,
			kind: 'relationship',
			owner: liveRelationship.objectDefinitionExternalReferenceCode1,
			subject: liveRelationship.name,
			type: 'extra',
		});
	}

	for (const liveDefinition of snapshot.objectDefinitions) {
		if (
			liveDefinition.system ||
			customERCs.has(liveDefinition.externalReferenceCode)
		) {
			continue;
		}

		add({
			actual: liveDefinition.name,
			attribute: 'extra',
			expected: null,
			id: `object:${liveDefinition.externalReferenceCode}`,
			kind: 'object',
			owner: liveDefinition.externalReferenceCode,
			subject: liveDefinition.name,
			type: 'extra',
		});
	}

	const batchPicklists = batchItems(
		'00-list-type-definition.batch-engine-data.json'
	);

	const livePicklists = new Map<string, any>(
		snapshot.listTypeDefinitions.map((picklist) => [
			picklist.externalReferenceCode,
			picklist,
		])
	);

	for (const picklist of batchPicklists) {
		const erc = picklist.externalReferenceCode;
		const livePicklist = livePicklists.get(erc);

		const base = {
			kind: 'picklist' as const,
			owner: erc,
			subject: picklist.name,
		};

		if (!livePicklist) {
			add({
				...base,
				actual: null,
				attribute: 'missing',
				expected: picklist.name,
				id: `picklist:${erc}`,
				type: 'missing',
			});

			continue;
		}

		const keys = (picklist.listTypeEntries ?? []).map(
			(entry: any) => entry.key
		);

		for (const key of keys) {
			if (!livePicklist.keys.includes(key)) {
				add({
					...base,
					actual: null,
					attribute: 'missing',
					expected: key,
					id: `picklist:${erc}:${key}`,
					subject: `${picklist.name} · ${key}`,
					type: 'missing',
				});
			}
		}

		// A picklist with no entries in the batch gets its entries from
		// somewhere else, so only a picklist that lists entries has extras.

		if (!keys.length) {
			continue;
		}

		for (const key of livePicklist.keys) {
			if (!keys.includes(key)) {
				add({
					...base,
					actual: key,
					attribute: 'extra',
					expected: null,
					id: `picklist:${erc}:${key}`,
					subject: `${picklist.name} · ${key}`,
					type: 'extra',
				});
			}
		}
	}

	return drifts;
}

function _isRelationshipField(field: any): boolean {
	return field.businessType === 'Relationship' || field.name.startsWith('r_');
}
