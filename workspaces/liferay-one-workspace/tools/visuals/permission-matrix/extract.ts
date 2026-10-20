/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import * as fs from 'fs';
import * as path from 'path';

import {
	CUSTOM_ELEMENT_DIR,
	SITE_INITIALIZER_DIR,
	SPRING_BOOT_DIR,
	WORKSPACE_ROOT,
	batchItems,
	listFiles,
	readJSON,
	relative,
} from '../lib.ts';

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
	group: null | string;

	/**
	 * Where a user holds the role: on a project, as a project role or a
	 * contact designation, or on the account, site, or organization that its
	 * type names.
	 */
	heldOn: HeldOn;
	name: string;

	/**
	 * The products whose project-contacts-role-ercs specification lists the
	 * role.
	 */
	products: string[];
	purpose: null | string;

	/**
	 * The sidecar and custom element source files that name the role, or a
	 * constant that holds its name or its external reference code.
	 */
	references: string[];
	type: RoleType;
}

interface IRoleCatalog {
	groups: {id: string; label: string; text: string}[];
	roles: Record<string, {group: string; purpose: string}>;
}

interface ISourceFile {
	path: string;
	text: string;
}

type HeldOn = 'contact' | 'project' | RoleType;

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
			group: null,
			heldOn: role.roleType,
			name: role.name,
			products: [],
			purpose: null,
			references: [],
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
				group: null,
				heldOn: type,
				name,
				products: [],
				purpose: null,
				references: [],
				type,
			});
		}
	}

	const resources = new Map<string, IResource>();
	const grants: IGrant[] = [];

	const roleCatalog = readJSON<IRoleCatalog>(
		path.join(import.meta.dirname, 'roles.json')
	);

	_describeRoles(
		problems,
		new Set(rawGrants.map(({grant}) => grant.roleName)),
		roleCatalog,
		roles
	);

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
	// is already a problem, so it is not an action twice. The objects with no
	// grant share one cause and one check, so they are one action.

	const ungranted = risks.filter((risk) => risk.type === 'no-grant');

	return {
		actions: [
			...risks
				.filter(
					(risk) =>
						risk.level !== 'intended' &&
						risk.type !== 'broad-view' &&
						risk.type !== 'no-grant'
				)
				.map((risk) => ({
					anchor: 'matrix-wrap',
					detail: risk.text,
					item: risk.object
						? objects.get(risk.object)?.label
						: undefined,
					severity: risk.level as 'high' | 'info' | 'medium',
					source: risk.resource ?? risk.object ?? undefined,
					title: risk.title,
				})),
			...(ungranted.length
				? [
						{
							anchor: 'matrix-wrap',
							detail: `No role other than ${config.adminRoles.join(' and ')} holds a permission on ${ungranted.map((risk) => objects.get(risk.object!)!.label).join(', ')}. Only the owner of an entry, an administrator, or a service account can read them. Confirm that each one is meant to be private.`,
							severity: 'info' as const,
							source: 'resource-permissions.json',
							title:
								ungranted.length === 1
									? '1 object has no grants'
									: `${ungranted.length} objects have no grants`,
						},
					]
				: []),
		],
		data: {
			generated: new Date().toISOString().slice(0, 10),
			grants,
			groups: roleCatalog.groups,
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

function _describeRoles(
	problems: string[],
	grantedRoleNames: Set<string>,
	roleCatalog: IRoleCatalog,
	roles: Map<string, IRole>
) {
	const groupIds = new Set(roleCatalog.groups.map((group) => group.id));
	const productNames = _contactRoleProductNames();
	const projectRoleERCs = _projectRoleERCs();
	const sourceFiles = _sourceFiles();

	for (const role of roles.values()) {
		const description = roleCatalog.roles[role.name];

		if (!description) {
			problems.push(
				`The role ${role.name} has no entry in permission-matrix/roles.json. Add its group and its purpose.`
			);
		}
		else if (!groupIds.has(description.group)) {
			problems.push(
				`permission-matrix/roles.json puts ${role.name} in the group ${description.group}, which its groups list does not define.`
			);
		}
		else {
			role.group = description.group;
			role.purpose = description.purpose;
		}

		role.products = role.erc ? (productNames.get(role.erc) ?? []) : [];
		// A Liferay role with no ERC has a common word as its name, such as
		// User, so a search for the name finds labels, not the role.

		role.references = role.erc
			? _references([role.name, role.erc], sourceFiles)
			: [];

		if (role.erc && projectRoleERCs.has(role.erc)) {
			role.heldOn = 'project';
		}
		else if (role.products.length) {
			role.heldOn = 'contact';
		}

		if (
			role.group === 'unused' &&
			(grantedRoleNames.has(role.name) ||
				role.products.length ||
				role.references.length)
		) {
			problems.push(
				`permission-matrix/roles.json lists ${role.name} as not used, but a grant, a product, or ${role.references[0] ?? 'the code'} uses it. Move it to the group that matches its use.`
			);
		}
	}

	for (const name of Object.keys(roleCatalog.roles)) {
		if (!roles.has(name)) {
			problems.push(
				`permission-matrix/roles.json describes the role ${name}, which no batch file or grant defines. Remove its entry.`
			);
		}
	}
}

/**
 * Maps each contact role ERC to the products whose project-contacts-role-ercs
 * specification lists it. The products come from the seed, which is the only
 * source of the catalog in this workspace.
 */
function _contactRoleProductNames(): Map<string, string[]> {
	const productNames = new Map<string, string[]>();

	const filePath = path.join(
		WORKSPACE_ROOT,
		'scripts/seed/data/06-commerce-product.batch-engine-data.json'
	);

	if (!fs.existsSync(filePath)) {
		return productNames;
	}

	for (const product of readJSON<{items: any[]}>(filePath).items) {
		for (const specification of product.productSpecifications ?? []) {
			if (
				specification.specificationKey !== 'project-contacts-role-ercs'
			) {
				continue;
			}

			const value =
				typeof specification.value === 'string'
					? specification.value
					: (specification.value?.en_US ?? '');

			for (const erc of value.split(',')) {
				const trimmedERC = erc.trim();

				if (!trimmedERC) {
					continue;
				}

				productNames.set(trimmedERC, [
					...(productNames.get(trimmedERC) ?? []),
					product.name?.en_US ?? product.externalReferenceCode,
				]);
			}
		}
	}

	return productNames;
}

function _escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

/**
 * Reads the project role ERCs from the ercsSupportProject list of the sidecar
 * RoleConstants.
 */
function _projectRoleERCs(): Set<string> {
	const filePath = path.join(
		SPRING_BOOT_DIR,
		'src/main/java/com/liferay/one/constants/RoleConstants.java'
	);

	if (!fs.existsSync(filePath)) {
		return new Set();
	}

	const text = fs.readFileSync(filePath, 'utf8');

	const constants = new Map(
		[...text.matchAll(/(\w+)\s*=\s*"([^"]+)"/g)].map(([, name, value]) => [
			name,
			value,
		])
	);

	const list = /ercsSupportProject\s*=([^;]+);/.exec(text)?.[1] ?? '';

	return new Set(
		[...list.matchAll(/\b([A-Z][A-Z_]+)\b/g)]
			.map(([, name]) => constants.get(name))
			.filter(Boolean) as string[]
	);
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

/**
 * Finds the source files that name a role: a file with the name or the ERC as
 * a string, and a file that reads a constant that holds it, or a list of such
 * constants.
 */
function _references(literals: string[], sourceFiles: ISourceFile[]): string[] {
	const literalPattern = new RegExp(
		`["'](?:${literals.map(_escapeRegExp).join('|')})["']`
	);

	const declaringFiles = sourceFiles.filter((sourceFile) =>
		literalPattern.test(sourceFile.text)
	);

	const identifiers = new Set<string>();

	for (const sourceFile of declaringFiles) {
		const constantPattern = new RegExp(
			`(\\w+)\\s*(?::[^=;\\n]*)?=\\s*["'](?:${literals.map(_escapeRegExp).join('|')})["']`,
			'g'
		);

		const constants = [...sourceFile.text.matchAll(constantPattern)].map(
			([, name]) => name
		);

		constants.forEach((name) => identifiers.add(name));

		for (const [, name, initializer] of sourceFile.text.matchAll(
			/(?:const|final)\s+(?:[\w<>,\s]+\s+)?(\w+)\s*(?::[^=;\n]*)?=(?!=)\s*([^;]*);/g
		)) {
			if (
				constants.some((constant) =>
					new RegExp(`\\b${constant}\\b`).test(initializer)
				) &&
				!constants.includes(name)
			) {
				identifiers.add(name);
			}
		}
	}

	const identifierPattern = identifiers.size
		? new RegExp(`\\b(?:${[...identifiers].join('|')})\\b`)
		: null;

	return sourceFiles
		.filter(
			(sourceFile) =>
				declaringFiles.includes(sourceFile) ||
				identifierPattern?.test(sourceFile.text)
		)
		.map((sourceFile) => sourceFile.path);
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

/**
 * The sidecar and custom element sources, without tests and translations.
 */
function _sourceFiles(): ISourceFile[] {
	return [
		...listFiles(path.join(SPRING_BOOT_DIR, 'src/main/java'), (filePath) =>
			filePath.endsWith('.java')
		),
		...listFiles(
			path.join(CUSTOM_ELEMENT_DIR, 'src'),
			(filePath) =>
				/\.tsx?$/.test(filePath) &&
				!/\.test\.tsx?$/.test(filePath) &&
				!filePath.includes(`${path.sep}i18n${path.sep}`)
		),
	].map((filePath) => ({
		path: relative(filePath),
		text: fs.readFileSync(filePath, 'utf8'),
	}));
}

function _words(className: string): string {
	return className
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/O Auth2 ?/g, 'OAuth2 ')
		.trim();
}
