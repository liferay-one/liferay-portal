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

	it('nests contracts, orders, order items, entitlements, and license keys under the project', () => {
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
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 501,
						r_contractToEntitlement_c_contractId: 30,
						r_projectToEntitlement_c_projectId: 20,
					},
				],
				environments: [
					{
						id: 60,
						name: 'Production',
						r_projectToEnvironment_c_projectId: 20,
					},
				],
				licenseKeys: [
					{
						externalReferenceCode: 'LK-1',
						id: 70,
						r_entitlementToLicenseKey_c_entitlementId: 40,
						r_projectToLicenseKey_c_projectId: 20,
					},
				],
				projectMemberships: [
					{
						id: 11,
						r_projectToProjectMembership_c_projectId: 20,
						r_userToProjectMembership_userId: 1,
						roleExternalReferenceCode: 'C_PROJECT_ADMIN',
					},
				],
				projects: [PROJECT],
			},
			{
				orders: toCollection([
					{
						customFields: {contractId: 30, projectName: 'Main'},
						externalReferenceCode: 'ORDER-1',
						id: 50,
						orderItems: [
							{id: 501, name: {en_US: 'DXP'}, sku: 'DXP-1'},
						],
					},
				]),
				users: toCollection([{emailAddress: 'a@b.com', id: 1}]),
			}
		);

		const licenseKeys = {
			children: [{label: 'LK-1'}],
			count: 1,
			label: 'License Keys',
		};
		const entitlements = {
			children: [{children: [licenseKeys], label: 'DXP'}],
			count: 1,
			label: 'Entitlements',
		};
		const orderItems = {
			children: [{children: [entitlements], label: 'DXP'}],
			count: 1,
			label: 'Order Items',
		};
		const orders = {
			children: [{children: [orderItems], label: 'ORDER-1'}],
			count: 1,
			label: 'Orders',
		};

		expect(summarize(buildAccountTree(inspection, []))).toEqual([
			{
				children: [
					{
						children: [
							{
								children: [
									{
										children: [orders],
										label: 'C-1 2026-01-01 - 2027-01-01',
									},
								],
								count: 1,
								label: 'Contracts',
							},
							{
								children: [{label: 'User 1 C_PROJECT_ADMIN'}],
								count: 1,
								label: 'Project Memberships',
							},
						],
						label: 'Main',
					},
				],
				count: 1,
				label: 'Projects',
			},
			{
				children: [{label: 'Production'}],
				count: 1,
				label: 'Environments',
			},
			{children: [{label: 'a@b.com'}], count: 1, label: 'Users'},
		]);
	});

	it('shows an account level contract under each project that holds a record in it', () => {
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

		const [projectsNode, accountLevel] = buildAccountTree(inspection, []);

		expect(summarize(projectsNode.children[0].children)).toEqual([
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
						label: 'C-ACCOUNT',
					},
				],
				count: 1,
				label: 'Contracts',
			},
		]);
		expect(summarize(accountLevel.children)).toEqual([
			{children: [{label: 'C-ACCOUNT'}], count: 1, label: 'Contracts'},
		]);
	});

	it('keeps records whose parent did not load under the project', () => {
		const inspection = buildInspection({
			entitlements: [
				{
					id: 40,
					name: 'DXP',
					r_commerceOrderItemToEntitlement_commerceOrderItemId: 501,
					r_projectToEntitlement_c_projectId: 20,
				},
			],
			licenseKeys: [
				{
					externalReferenceCode: 'LK-1',
					id: 70,
					r_entitlementToLicenseKey_c_entitlementId: 99,
					r_projectToLicenseKey_c_projectId: 20,
				},
			],
			projects: [PROJECT],
		});

		const [projectsNode] = buildAccountTree(inspection, []);

		expect(summarize(projectsNode.children[0].children)).toEqual([
			{children: [{label: 'DXP'}], count: 1, label: 'Entitlements'},
			{children: [{label: 'LK-1'}], count: 1, label: 'License Keys'},
		]);
	});

	it('puts records with no project, or a project outside the account, at account level', () => {
		const inspection = buildInspection(
			{
				activationKeys: [
					{
						externalReferenceCode: 'AK-1',
						id: 80,
						r_projectToActivationKey_c_projectId: 99,
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

		const accountLevel = buildAccountTree(inspection, []).find(
			({key}) => key === 'account-level'
		);

		expect(summarize(accountLevel ? [accountLevel] : [])).toEqual([
			{
				children: [
					{children: [{label: '#50'}], count: 1, label: 'Orders'},
					{
						children: [{label: 'AK-1'}],
						count: 1,
						label: 'Activation Keys',
					},
				],
				label: 'No Project (Account Level)',
			},
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

		const [projectsNode, brokenLinks] = buildAccountTree(
			inspection,
			findings
		);

		const [projectNode] = projectsNode.children;

		expect(projectsNode.severity).toBe('danger');
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

		expect(nodes[0].children[0].key).toBe('root/projects/projects/20');
		expect(brokenLinks?.children[0].children[0].key).toBe(
			'broken/projects/projects-have-no-members/projects/20'
		);
	});
});
