/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {SITE_INITIALIZER_DIR, batchItems, readJSON, relative} from '../lib.ts';

import type {IExtraction} from '../lib.ts';

interface IConfig {

	/**
	 * Roles that may hold everything. An object with grants only to these
	 * roles counts as an object with no grants.
	 */
	adminRoles: string[];

	/**
	 * Roles that every visitor or every signed in user holds. Company scope
	 * VIEW for one of these roles on an object that is not account restricted
	 * shows every entry to everybody.
	 */
	broadRoles: string[];

	/**
	 * Liferay roles that exist without a batch file, by role type.
	 */
	builtinRoles: Record<string, RoleType>;

	/**
	 * Objects that every user is meant to read, by object name, with the
	 * reason. Broad VIEW on these shows as intended instead of as a risk.
	 */
	referenceObjects: Record<string, string>;
}

interface IGrant {
	actions: string[];
	id: string;
	primKey: null | string;
	resource: string;
	role: string;
	scope: Scope;
	source: string;
}

interface IObject {
	erc: string;
	label: string;
	name: string;
	restricted: boolean;
}

interface IResource {
	group: string;
	id: string;
	kind: ResourceKind;
	label: string;
	object: null | string;
	raw: string;
}

interface IRisk {
	grant: null | string;
	level: 'high' | 'info' | 'intended' | 'medium';
	object: null | string;
	resource: null | string;
	role: null | string;
	text: string;
	title: string;
	type: 'broad-view' | 'no-grant' | 'template-regular';
}

interface IRole {
	admin: boolean;
	broad: boolean;
	builtin: boolean;
	erc: null | string;
	name: string;
	type: RoleType;
}

type ObjectResourceKind = 'object-admin' | 'object-entry' | 'object-portlet';

type ResourceKind = ObjectResourceKind | 'model' | 'portlet' | 'resource';

type RoleType = 'account' | 'organization' | 'regular' | 'site';

type Scope = '1' | '2' | '3' | '4';

const GROUPS: [RegExp, string][] = [
	[/account/i, 'Accounts'],
	[/commerce/i, 'Commerce'],
	[/document\.library|document_library/i, 'Documents and Media'],
	[/journal|dynamic\.data\.mapping/i, 'Web Content'],
	[/asset/i, 'Categories and Tags'],
	[/layout/i, 'Pages and Templates'],
	[/template/i, 'Pages and Templates'],
	[/depot/i, 'Asset Libraries'],
	[/expando/i, 'Custom Fields'],
	[/oauth2/i, 'OAuth2'],
];

const SCOPES: Scope[] = ['1', '2', '3', '4'];

export function extract(): IExtraction {
	const config = readJSON<IConfig>(
		path.join(import.meta.dirname, 'config.json')
	);

	const problems: string[] = [];

	const restricted = new Set<string>(
		batchItems(
			'05-object-definition-account-entry-restricted.batch-engine-data.json'
		)
			.filter((item) => item.accountEntryRestricted)
			.map((item) => item.externalReferenceCode)
	);

	const objects = new Map<string, IObject>(
		batchItems('03-object-definition.batch-engine-data.json').map(
			(definition) => [
				definition.name,
				{
					erc: definition.externalReferenceCode,
					label: definition.label.en_US,
					name: definition.name,
					restricted: restricted.has(
						definition.externalReferenceCode
					),
				},
			]
		)
	);

	const roles = new Map<string, IRole>();

	for (const role of batchItems('13-role.batch-engine-data.json')) {
		roles.set(role.name, {
			admin: config.adminRoles.includes(role.name),
			broad: config.broadRoles.includes(role.name),
			builtin: role.externalReferenceCode.startsWith('L_'),
			erc: role.externalReferenceCode,
			name: role.name,
			type: role.roleType,
		});
	}

	const rawGrants = _rawGrants();

	for (const {grant} of rawGrants) {
		const name = grant.roleName;

		if (roles.has(name)) {
			continue;
		}

		const type = config.builtinRoles[name];

		if (type) {
			roles.set(name, {
				admin: config.adminRoles.includes(name),
				broad: config.broadRoles.includes(name),
				builtin: true,
				erc: null,
				name,
				type,
			});
		}
	}

	const resources = new Map<string, IResource>();
	const grants: IGrant[] = [];

	rawGrants.forEach(({grant, source}, index) => {
		const where = `${source} grant ${index + 1} (${grant.roleName} on ${grant.resourceName})`;

		if (!roles.has(grant.roleName)) {
			problems.push(
				`${where} names the role ${grant.roleName}, which no batch file defines and config.json does not list as a Liferay role.`
			);

			return;
		}

		if (!SCOPES.includes(grant.scope)) {
			problems.push(
				`${where} has scope ${JSON.stringify(grant.scope)}. Use 1 (company), 2 (group), 3 (group template), or 4 (individual).`
			);

			return;
		}

		const roleToken = /\[\$ROLE_ID:([^$]+)\$\]/.exec(grant.primKey ?? '');

		if (roleToken && !roles.has(roleToken[1])) {
			problems.push(
				`${where} has the primKey ${grant.primKey}, which names a role that does not exist.`
			);
		}

		const resource = _resource(grant.resourceName, objects);

		if (!resource) {
			problems.push(
				`${where} names an object that 03-object-definition does not define.`
			);

			return;
		}

		resources.set(resource.id, resource);

		grants.push({
			actions: [...grant.actionIds].sort(),
			id: `g${grants.length}`,
			primKey: grant.scope === '4' ? grant.primKey ?? null : null,
			resource: resource.id,
			role: grant.roleName,
			scope: grant.scope,
			source,
		});
	});

	const risks: IRisk[] = [];

	for (const grant of grants) {
		const resource = resources.get(grant.resource)!;
		const role = roles.get(grant.role)!;

		if (
			role.broad &&
			(grant.scope === '1' || grant.scope === '2') &&
			resource.kind === 'object-entry' &&
			grant.actions.includes('VIEW')
		) {
			const object = objects.get(resource.object!)!;

			if (object.restricted) {
				continue;
			}

			const reason = config.referenceObjects[object.name];

			if (!reason) {
				problems.push(
					`${grant.source} gives ${role.name} scope ${grant.scope} VIEW on ${object.name}, which is not account restricted. Make the object account restricted, narrow the grant, or list the object in permission-matrix/config.json referenceObjects.`
				);
			}

			risks.push({
				grant: grant.id,
				level: reason ? 'intended' : 'high',
				object: object.name,
				resource: resource.id,
				role: role.name,
				text: reason
					? `${role.name} reads every ${object.label} entry. config.json marks this object as shared reference data: ${reason}`
					: `${role.name} reads every ${object.label} entry in the company. The object is not account restricted, so the entries of every account are visible to ${role.name === 'Guest' ? 'anonymous visitors' : 'every signed in user'}.`,
				title: `${role.name} sees all ${object.label} entries`,
				type: 'broad-view',
			});
		}

		if (grant.scope === '3' && role.type === 'regular') {
			risks.push({
				grant: grant.id,
				level: 'medium',
				object: resource.object,
				resource: resource.id,
				role: role.name,
				text: `${role.name} is a regular role, and scope 3 (group template) is only a default for entries created later. The grant does nothing for entries that exist. Use scope 1 for company wide access.`,
				title: `Template scope on a regular role`,
				type: 'template-regular',
			});
		}
	}

	for (const object of objects.values()) {
		const granted = grants.some((grant) => {
			const resource = resources.get(grant.resource)!;

			return (
				resource.object === object.name && !roles.get(grant.role)!.admin
			);
		});

		if (!granted) {
			risks.push({
				grant: null,
				level: 'info',
				object: object.name,
				resource: null,
				role: null,
				text: `No role other than ${config.adminRoles.join(' and ')} holds a permission on ${object.label}. Only the owner of an entry, an administrator, or a service account can read it.`,
				title: `${object.label} has no grants`,
				type: 'no-grant',
			});
		}
	}

	for (const object of objects.values()) {
		for (const kind of ['object-entry', 'object-portlet'] as const) {
			const id = `${kind}:${object.name}`;

			if (!resources.has(id)) {
				resources.set(id, _objectResource(kind, object));
			}
		}
	}

	// A broad read that config.json marks as reference data is a decision,
	// not something to act on, so it is not an action. Any other broad read
	// is already a problem, so it is not an action twice.

	return {
		actions: risks
			.filter(
				(risk) =>
					risk.level !== 'intended' && risk.type !== 'broad-view'
			)
			.map((risk) => ({
				anchor: 'matrix-wrap',
				detail: risk.text,
				item: risk.object ? objects.get(risk.object)?.label : undefined,
				severity: risk.level as 'high' | 'info' | 'medium',
				source: risk.resource ?? risk.object ?? undefined,
				title: risk.title,
			})),
		data: {
			generated: new Date().toISOString().slice(0, 10),
			grants,
			objects: [...objects.values()],
			resources: [...resources.values()].sort(_compareResources),
			roles: [...roles.values()],
			sources: [...new Set(rawGrants.map(({source}) => source))],
		},
		problems,
	};
}

function _compareResources(a: IResource, b: IResource): number {
	const objectsFirst =
		Number(b.group === 'Objects') - Number(a.group === 'Objects');

	return (
		objectsFirst ||
		a.group.localeCompare(b.group) ||
		a.label.localeCompare(b.label) ||
		a.kind.localeCompare(b.kind)
	);
}

function _group(raw: string): string {
	for (const [pattern, group] of GROUPS) {
		if (pattern.test(raw)) {
			return group;
		}
	}

	return 'Portal';
}

const OBJECT_TOKENS: [RegExp, ObjectResourceKind, (name: string) => string][] =
	[
		[
			/^\[\$OBJECT_DEFINITION_CLASS_NAME:([^$]+)\$\]$/,
			'object-entry',
			(name) => `[$OBJECT_DEFINITION_CLASS_NAME:${name}$]`,
		],
		[
			/^com\.liferay\.object#\[\$OBJECT_DEFINITION_ID:([^$]+)\$\]$/,
			'object-portlet',
			(name) => `com.liferay.object#[$OBJECT_DEFINITION_ID:${name}$]`,
		],
		[
			/^\[\$OBJECT_DEFINITION_PORTLET_ID:([^$]+)\$\]$/,
			'object-admin',
			(name) => `[$OBJECT_DEFINITION_PORTLET_ID:${name}$]`,
		],
	];

function _objectResource(kind: ObjectResourceKind, object: IObject): IResource {
	const [, , raw] = OBJECT_TOKENS.find(
		([, tokenKind]) => tokenKind === kind
	)!;

	return {
		group: 'Objects',
		id: `${kind}:${object.name}`,
		kind,
		label: object.label,
		object: object.name,
		raw: raw(object.name),
	};
}

function _rawGrants(): {grant: any; source: string}[] {
	const rawGrants = readJSON<any[]>(
		path.join(SITE_INITIALIZER_DIR, 'resource-permissions.json')
	).map((grant) => ({
		grant,
		source: relative(
			path.join(SITE_INITIALIZER_DIR, 'resource-permissions.json')
		),
	}));

	const channelFile = path.join(
		SITE_INITIALIZER_DIR,
		'commerce-channel.model-resource-permissions.json'
	);

	if (fs.existsSync(channelFile)) {
		for (const grant of readJSON<any[]>(channelFile)) {
			rawGrants.push({
				grant: {
					primKey: 'The site commerce channel',
					resourceName:
						'com.liferay.commerce.product.model.CommerceChannel',
					scope: '4',
					...grant,
				},
				source: relative(channelFile),
			});
		}
	}

	return rawGrants;
}

function _resource(
	raw: string,
	objects: Map<string, IObject>
): IResource | null {
	for (const [pattern, kind] of OBJECT_TOKENS) {
		const match = pattern.exec(raw);

		if (match) {
			const object = objects.get(match[1]);

			return object ? _objectResource(kind, object) : null;
		}
	}

	if (raw === '90') {
		return {
			group: 'Portal',
			id: raw,
			kind: 'resource',
			label: 'Portal',
			object: null,
			raw,
		};
	}

	if (raw.startsWith('com_liferay_')) {
		const className = raw.split('_').pop()!;

		return {
			group: _group(raw),
			id: raw,
			kind: 'portlet',
			label: _words(className),
			object: null,
			raw,
		};
	}

	if (raw.includes('.model.')) {
		const [model, parent] = raw.split('-');

		const label = _words(model.split('.').pop()!);

		return {
			group: _group(raw),
			id: raw,
			kind: 'model',
			label: parent
				? `${label} for ${_words(parent.split('.').pop()!)}`
				: label,
			object: null,
			raw,
		};
	}

	const name = raw.replace(/^com\.liferay\./, '');

	return {
		group: _group(raw),
		id: raw,
		kind: 'resource',
		label: name
			.split('.')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' '),
		object: null,
		raw,
	};
}

function _words(className: string): string {
	return className
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/O Auth2 ?/g, 'OAuth2 ')
		.trim();
}
