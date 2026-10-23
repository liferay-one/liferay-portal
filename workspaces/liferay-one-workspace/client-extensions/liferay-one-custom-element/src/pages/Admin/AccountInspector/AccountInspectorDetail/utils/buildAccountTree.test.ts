/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {RELATED_COLLECTION_KEYS} from '~/types/accountInspection';

import buildAccountTree from './buildAccountTree';

import type {
	AccountFinding,
	AccountInspection,
	AccountTreeNode,
	InspectedCollection,
	InspectedEntry,
	RelatedCollectionKey,
} from '~/types/accountInspection';

function toCollection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function buildInspection(
	related: Partial<Record<RelatedCollectionKey, InspectedEntry[]>>,
	overrides: Partial<AccountInspection> = {}
): AccountInspection {
	return {
		account: {
			dateCreated: '2026-01-01T00:00:00Z',
			description: '',
			emailAddress: '',
			externalReferenceCode: 'ACCNT-001',
			id: 100,
			name: 'Omni',
			numberOfUsers: 0,
			status: 0,
			taxId: '',
			type: 'business',
		},
		loadedAt: 0,
		orders: toCollection([]),
		postalAddresses: toCollection([]),
		related: Object.fromEntries(
			RELATED_COLLECTION_KEYS.map((key) => [
				key,
				toCollection(related[key] ?? []),
			])
		) as AccountInspection['related'],
		users: toCollection([]),
		...overrides,
	};
}

function summarize(nodes: AccountTreeNode[]): unknown[] {
	return nodes.map(({children, count, label, severity}) => ({
		label,
		...(count === undefined ? {} : {count}),
		...(severity ? {severity} : {}),
		...(children.length ? {children: summarize(children)} : {}),
	}));
}

const PROJECT = {externalReferenceCode: 'PRJCT-001', id: 20, name: 'Main'};

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-BUILDACCOUNTTREE] buildAccountTree', () => {
	it('returns no nodes for an empty account', () => {
		expect(buildAccountTree(buildInspection({}), [])).toEqual([]);
	});

	it('nests contracts, their entitlements, and project orders under the project', () => {
		const inspection = buildInspection(
			{
				contracts: [
					{
						endDate: '2027-01-01T00:00:00Z',
						externalReferenceCode: 'C-1',
						id: 30,
						r_projectToContract_c_projectId: 20,
						startDate: '2026-01-01T00:00:00Z',
					},
				],
				entitlements: [
					{
						id: 40,
						name: 'DXP',
						r_contractToEntitlement_c_contractId: 30,
						r_projectToEntitlement_c_projectId: 20,
					},
					{
						id: 41,
						name: 'Support',
						r_contractToEntitlement_c_contractId: 0,
						r_projectToEntitlement_c_projectId: 20,
					},
				],
				projects: [PROJECT],
			},
			{
				orders: toCollection([
					{
						customFields: {projectName: 'Main'},
						externalReferenceCode: 'ORDER-1',
						id: 50,
					},
				]),
			}
		);

		expect(summarize(buildAccountTree(inspection, []))).toEqual([
			{
				children: [
					{
						children: [
							{
								children: [{label: 'DXP'}],
								count: 1,
								label: 'Entitlements',
							},
						],
						label: 'C-1 2026-01-01 - 2027-01-01',
					},
					{
						children: [{label: 'Support'}],
						count: 1,
						label: 'Entitlements',
					},
					{
						children: [{label: 'ORDER-1'}],
						count: 1,
						label: 'Orders',
					},
				],
				label: 'Main',
			},
		]);
	});

	it('puts records with no project, or a project outside the account, at account level', () => {
		const inspection = buildInspection(
			{
				environments: [
					{
						id: 60,
						name: 'Orphan',
						r_projectToEnvironment_c_projectId: 99,
					},
				],
				projects: [PROJECT],
			},
			{
				orders: toCollection([
					{customFields: {projectName: ''}, id: 50},
				]),
			}
		);

		const [, accountLevel] = buildAccountTree(inspection, []);

		expect(summarize([accountLevel])).toEqual([
			{
				children: [
					{
						children: [{label: 'Orphan'}],
						count: 1,
						label: 'Environments',
					},
					{children: [{label: '#50'}], count: 1, label: 'Orders'},
				],
				label: 'No Project (Account Level)',
			},
		]);
	});

	it('marks flagged records, carries the worst severity to their parents, and lists them under broken links', () => {
		const inspection = buildInspection({
			projectMemberships: [
				{
					id: 11,
					r_projectToProjectMembership_c_projectId: 20,
					r_userToProjectMembership_userId: 999,
					roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				},
			],
			projects: [PROJECT],
		});

		const findings: AccountFinding[] = [
			{
				collection: 'projectMemberships',
				ids: [11],
				message:
					'project-memberships-reference-users-outside-the-account',
				severity: 'danger',
			},
			{
				collection: 'account',
				ids: [100],
				message: 'the-account-has-no-account-type',
				severity: 'info',
			},
		];

		const [projectNode, brokenLinks] = buildAccountTree(
			inspection,
			findings
		);

		expect(projectNode.severity).toBe('danger');
		expect(projectNode.children[0].children[0]).toMatchObject({
			collection: 'projectMemberships',
			label: 'User 999 C_PROJECT_ADMIN',
			recordId: 11,
			severity: 'danger',
		});
		expect(summarize([brokenLinks])).toEqual([
			{
				children: [
					{
						children: [
							{
								label: 'User 999 C_PROJECT_ADMIN',
								severity: 'danger',
							},
						],
						count: 1,
						label: 'Project Memberships: Project memberships reference a user who is not a member of this account. These rows show as empty member chips.',
						severity: 'danger',
					},
				],
				count: 1,
				label: 'Broken Links',
				severity: 'danger',
			},
		]);
	});

	it('lists the account users as the first group', () => {
		const [usersNode] = buildAccountTree(
			buildInspection(
				{},
				{users: toCollection([{emailAddress: 'a@b.com', id: 1}])}
			),
			[]
		);

		expect(usersNode).toMatchObject({
			collection: 'users',
			count: 1,
			key: 'root/users',
		});
		expect(usersNode.children[0]).toMatchObject({
			label: 'a@b.com',
			recordId: 1,
		});
	});

	it('shows an entitlement under its contract when the contract sits at account level', () => {
		const inspection = buildInspection({
			contracts: [{externalReferenceCode: 'C-ACCOUNT', id: 30}],
			entitlements: [
				{
					id: 40,
					name: 'DXP',
					r_contractToEntitlement_c_contractId: 30,
					r_projectToEntitlement_c_projectId: 20,
				},
			],
			projects: [PROJECT],
		});

		const [projectNode, accountLevel] = buildAccountTree(inspection, []);

		expect(summarize(projectNode.children)).toEqual([
			{
				children: [
					{
						children: [{label: 'DXP'}],
						count: 1,
						label: 'Entitlements',
					},
				],
				label: 'C-ACCOUNT',
			},
		]);
		expect(summarize(accountLevel.children)).toEqual([
			{label: 'C-ACCOUNT'},
		]);
	});

	it('puts orders that name an ambiguous project at account level', () => {
		const inspection = buildInspection(
			{
				projects: [
					{id: 20, name: 'Production'},
					{id: 21, name: 'Production'},
				],
			},
			{
				orders: toCollection([
					{customFields: {projectName: 'Production'}, id: 50},
				]),
			}
		);

		const accountLevel = buildAccountTree(inspection, []).find(
			({key}) => key === 'account-level'
		);

		expect(summarize(accountLevel ? [accountLevel] : [])).toEqual([
			{
				children: [
					{children: [{label: '#50'}], count: 1, label: 'Orders'},
				],
				label: 'No Project (Account Level)',
			},
		]);
	});

	it('gives the same record a different key in each place it appears', () => {
		const inspection = buildInspection({projects: [PROJECT]});

		const nodes = buildAccountTree(inspection, [
			{
				collection: 'projects',
				ids: [20],
				message: 'projects-have-no-members',
				severity: 'warning',
			},
		]);

		const brokenLinks = nodes.find(({key}) => key === 'broken');

		expect(nodes[0].key).toBe('root/projects/20');
		expect(brokenLinks?.children[0].children[0].key).toBe(
			'broken/projects/projects-have-no-members/projects/20'
		);
	});
});
