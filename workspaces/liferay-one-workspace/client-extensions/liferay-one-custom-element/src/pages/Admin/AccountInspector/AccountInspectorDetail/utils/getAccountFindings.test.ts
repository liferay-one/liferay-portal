/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {RELATED_COLLECTION_KEYS} from '~/types/accountInspection';

import getAccountFindings from './getAccountFindings';

import type {
	AccountInspection,
	InspectedCollection,
	InspectedEntry,
	RelatedCollectionKey,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

const ACCOUNT_ID = 100;

function toCollection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

const ADMINISTRATOR = {
	accountBriefs: [
		{
			id: ACCOUNT_ID,
			roleBriefs: [
				{
					externalReferenceCode: 'L_ACCOUNT_ADMINISTRATOR',
					name: 'Account Administrator',
				},
			],
		},
	],
	id: 1,
};

function buildAccount(overrides: Partial<Account> = {}): Account {
	return {
		customFields: [
			{customValue: {data: 'Strategic Partner'}, name: 'AccountType'},
		],
		dateCreated: '2026-01-01T00:00:00Z',
		description: '',
		emailAddress: '',
		externalReferenceCode: 'ACCNT-001',
		id: ACCOUNT_ID,
		name: 'Account',
		numberOfUsers: 1,
		status: 0,
		taxId: '',
		type: 'business',
		...overrides,
	};
}

function buildInspection(
	related: Partial<Record<RelatedCollectionKey, InspectedCollection>> = {},
	overrides: Partial<AccountInspection> = {}
): AccountInspection {
	return {
		account: buildAccount(),
		loadedAt: 0,
		orders: toCollection([]),
		postalAddresses: toCollection([]),
		related: Object.fromEntries(
			RELATED_COLLECTION_KEYS.map((key) => [
				key,
				related[key] ?? toCollection<InspectedEntry>([]),
			])
		) as AccountInspection['related'],
		users: toCollection([ADMINISTRATOR]),
		...overrides,
	};
}

function findMessages(inspection: AccountInspection) {
	return getAccountFindings(inspection).map(({message}) => message);
}

function findIds(inspection: AccountInspection, message: string) {
	return getAccountFindings(inspection).find(
		(finding) => finding.message === message
	)?.ids;
}

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-GETACCOUNTFINDINGS] getAccountFindings', () => {
	it('reports nothing for a consistent account', () => {
		expect(getAccountFindings(buildInspection())).toEqual([]);
	});

	it('reports an inactive account, a missing account type, and an account with no users', () => {
		const inspection = buildInspection(
			{},
			{
				account: buildAccount({customFields: [], status: 5}),
				users: toCollection([]),
			}
		);

		expect(findMessages(inspection)).toEqual(
			expect.arrayContaining([
				'the-account-has-no-account-type',
				'the-account-has-no-users',
				'the-account-is-not-active',
			])
		);
	});

	it('reports an account with no administrator but not users with no role', () => {
		const inspection = buildInspection(
			{},
			{
				users: toCollection([
					{accountBriefs: [{id: ACCOUNT_ID, roleBriefs: []}], id: 7},
				]),
			}
		);

		expect(findMessages(inspection)).toEqual([
			'the-account-has-no-account-administrator',
		]);
	});

	it('reports membership rows for users and projects outside the account, with no role, and repeated with the same role', () => {
		const inspection = buildInspection({
			projectMemberships: toCollection([
				{
					id: 11,
					r_projectToProjectMembership_c_projectId: 20,
					r_userToProjectMembership_userId: 1,
					roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				},
				{
					id: 12,
					r_projectToProjectMembership_c_projectId: 20,
					r_userToProjectMembership_userId: 999,
					roleExternalReferenceCode: '',
				},
				{
					id: 13,
					r_projectToProjectMembership_c_projectId: 21,
					r_userToProjectMembership_userId: 1,
					roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				},
				{
					id: 15,
					r_projectToProjectMembership_c_projectId: 20,
					r_userToProjectMembership_userId: 1,
					roleExternalReferenceCode: 'C_PROJECT_USER',
				},
				{
					id: 14,
					r_projectToProjectMembership_c_projectId: 20,
					r_userToProjectMembership_userId: 1,
					roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				},
			]),
			projects: toCollection([{id: 20, name: 'Main'}]),
		});

		expect(
			findIds(
				inspection,
				'project-memberships-reference-users-outside-the-account'
			)
		).toEqual([12]);
		expect(
			findIds(
				inspection,
				'project-memberships-reference-projects-outside-the-account'
			)
		).toEqual([13]);
		expect(findIds(inspection, 'project-memberships-have-no-role')).toEqual(
			[12]
		);
		expect(
			findIds(inspection, 'project-memberships-are-duplicated')
		).toEqual([14]);
	});

	it('reports projects with no members', () => {
		const inspection = buildInspection({
			projects: toCollection([{id: 20, name: 'Main'}]),
		});

		expect(findIds(inspection, 'projects-have-no-members')).toEqual([20]);
	});

	it('reports orders whose project name or contract is not in the account, and completed orders with unentitled items', () => {
		const inspection = buildInspection(
			{
				contracts: toCollection([{id: 30}]),
				entitlements: toCollection([
					{
						id: 40,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 501,
						r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId: 1,
					},
				]),
				projectMemberships: toCollection([
					{
						id: 11,
						r_projectToProjectMembership_c_projectId: 20,
						r_userToProjectMembership_userId: 1,
						roleExternalReferenceCode: 'C_PROJECT_ADMIN',
					},
				]),
				projects: toCollection([{id: 20, name: 'Main'}]),
			},
			{
				orders: toCollection([
					{
						customFields: {contractId: 30, projectName: 'Main'},
						id: 50,
						orderItems: [{id: 501}],
						orderStatus: 0,
					},
					{
						customFields: {contractId: 31, projectName: 'Mian'},
						id: 51,
						orderItems: [{id: 511}],
						orderStatus: 0,
					},
					{
						customFields: {contractId: 0, projectName: ''},
						id: 52,
						orderItems: [{id: 521}],
						orderStatus: 1,
					},
				]),
			}
		);

		expect(
			findIds(
				inspection,
				'orders-name-a-project-that-the-account-does-not-have'
			)
		).toEqual([51]);
		expect(
			findIds(
				inspection,
				'orders-reference-contracts-outside-the-account'
			)
		).toEqual([51]);
		expect(
			findIds(
				inspection,
				'completed-orders-have-items-with-no-entitlements'
			)
		).toEqual([51]);
	});

	it('reports entitlements with missing links, foreign references, and inverted dates', () => {
		const inspection = buildInspection(
			{
				contracts: toCollection([{id: 30}]),
				entitlements: toCollection([
					{
						endDate: '2026-01-01T00:00:00Z',
						id: 40,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 0,
						r_contractToEntitlement_c_contractId: 31,
						r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId: 0,
						r_projectToEntitlement_c_projectId: 21,
						startDate: '2026-06-01T00:00:00Z',
					},
					{
						id: 41,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 999,
						r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId: 1,
					},
				]),
				projects: toCollection([{id: 20, name: 'Main'}]),
			},
			{
				orders: toCollection([{id: 50, orderItems: [{id: 501}]}]),
			}
		);

		expect(
			findIds(inspection, 'entitlements-have-no-entitlement-definition')
		).toEqual([40]);
		expect(findIds(inspection, 'entitlements-have-no-order-item')).toEqual([
			40,
		]);
		expect(
			findIds(
				inspection,
				'entitlements-reference-order-items-outside-the-account'
			)
		).toEqual([41]);
		expect(
			findIds(
				inspection,
				'entitlements-reference-projects-outside-the-account'
			)
		).toEqual([40]);
		expect(
			findIds(
				inspection,
				'entitlements-reference-contracts-outside-the-account'
			)
		).toEqual([40]);
		expect(
			findIds(inspection, 'entitlements-end-before-they-start')
		).toEqual([40]);
	});

	it('reports license keys whose soft links point outside the account', () => {
		const inspection = buildInspection(
			{
				entitlements: toCollection([
					{
						id: 40,
						r_commerceOrderItemToEntitlement_commerceOrderItemId: 501,
						r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId: 1,
					},
				]),
				licenseKeys: toCollection([
					{entitlementId: 40, id: 60, orderId: 50},
					{entitlementId: 41, id: 61, orderId: 51},
				]),
			},
			{
				orders: toCollection([{id: 50, orderItems: [{id: 501}]}]),
			}
		);

		expect(
			findIds(
				inspection,
				'license-keys-reference-entitlements-outside-the-account'
			)
		).toEqual([61]);
		expect(
			findIds(
				inspection,
				'license-keys-reference-orders-outside-the-account'
			)
		).toEqual([61]);
	});

	it('reports a collection that failed to load and skips the checks that depend on it', () => {
		const inspection = buildInspection({
			contracts: toCollection([
				{id: 30, r_projectToContract_c_projectId: 21},
			]),
			projects: {error: '404 Not Found', items: [], totalCount: 0},
		});

		const findings = getAccountFindings(inspection);

		expect(findings[0]).toEqual({
			collection: 'projects',
			ids: [],
			message: 'the-records-could-not-be-loaded',
			severity: 'danger',
		});
		expect(findMessages(inspection)).not.toContain(
			'contracts-reference-projects-outside-the-account'
		);
	});

	it('orders the findings by severity', () => {
		const inspection = buildInspection(
			{projects: toCollection([{id: 20, name: 'Main'}])},
			{
				account: buildAccount({customFields: []}),
				orders: toCollection([
					{customFields: {projectName: 'Other'}, id: 50},
				]),
			}
		);

		expect(
			getAccountFindings(inspection).map(({severity}) => severity)
		).toEqual(['danger', 'warning', 'info']);
	});

	it('files the missing administrator under the account, not under a user', () => {
		const findings = getAccountFindings(
			buildInspection(
				{},
				{
					users: toCollection([
						{
							accountBriefs: [{id: ACCOUNT_ID, roleBriefs: []}],
							id: 7,
						},
					]),
				}
			)
		);

		expect(findings).toEqual([
			{
				collection: 'account',
				ids: [ACCOUNT_ID],
				message: 'the-account-has-no-account-administrator',
				severity: 'warning',
			},
		]);
	});

	it('reports a truncated collection and skips the checks that compare against it', () => {
		const inspection = buildInspection({
			contracts: toCollection([
				{id: 30, r_projectToContract_c_projectId: 21},
			]),
			projects: {
				items: [{id: 20, name: 'Main'}],
				totalCount: 20000,
				truncated: true,
			},
		});

		expect(findMessages(inspection)).toContain(
			'only-part-of-the-records-could-be-loaded'
		);
		expect(findMessages(inspection)).not.toContain(
			'contracts-reference-projects-outside-the-account'
		);
	});

	it('reports projects that share a name and ignores projects with no name', () => {
		const inspection = buildInspection({
			projectMemberships: toCollection(
				[20, 21, 22, 23].map((projectId) => ({
					id: projectId + 100,
					r_projectToProjectMembership_c_projectId: projectId,
					r_userToProjectMembership_userId: 1,
					roleExternalReferenceCode: 'C_PROJECT_ADMIN',
				}))
			),
			projects: toCollection([
				{id: 20, name: 'Production'},
				{id: 21, name: 'Production'},
				{id: 22, name: ''},
				{id: 23},
			]),
		});

		expect(findIds(inspection, 'projects-share-a-name')).toEqual([20, 21]);
	});
});
