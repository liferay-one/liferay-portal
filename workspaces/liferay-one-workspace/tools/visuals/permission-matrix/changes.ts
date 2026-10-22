/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the grants and the roles of the permission matrix for a comparison.
 * The id of a grant is its position in the file, so a grant is keyed by its
 * role, resource, scope, and record instead, and it changes when its actions
 * or its source change. A role is keyed by its external reference code, or
 * by its name when it has none. The files that name a role are left out of
 * its value, because a refactor moves them without a change to the role.
 */

import type {IChangeItem} from '../lib.ts';

interface IGrant {
	actions: string[];
	primKey: null | string;
	resource: string;
	role: string;
	scope: string;
	source: string;
}

interface IRole {
	erc: null | string;
	name: string;
	references: string[];
}

export function changeItems(data: {
	grants: IGrant[];
	resources: {id: string; label: string}[];
	roles: IRole[];
}): IChangeItem[] {
	const labels = new Map(
		data.resources.map((resource) => [resource.id, resource.label])
	);

	return [
		...data.grants.map((grant) => ({
			key: grantKey(grant),
			kind: 'grants',
			label: `${grant.role} on ${labels.get(grant.resource) ?? grant.resource}`,
			value: {actions: [...grant.actions].sort(), source: grant.source},
		})),
		...data.roles.map((role) => ({
			key: roleKey(role),
			kind: 'roles',
			label: role.name,
			value: Object.fromEntries(
				Object.entries(role).filter(([field]) => field !== 'references')
			),
		})),
	];
}

/**
 * The template builds the same keys, so a cell or a row can find its
 * change.
 */
export function grantKey(grant: IGrant): string {
	return `grant:${grant.role}|${grant.resource}|${grant.scope}|${grant.primKey ?? ''}`;
}

export function roleKey(role: {erc: null | string; name: string}): string {
	return `role:${role.erc || role.name}`;
}
