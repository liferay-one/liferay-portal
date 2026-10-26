/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {RELATED_COLLECTION_KEYS} from '~/types/accountInspection';

import getJSMRecords from './getJSMRecords';

import type {
	AccountInspection,
	InspectedCollection,
	InspectedEntry,
	InspectedUser,
	JiraAsset,
} from '~/types/accountInspection';

function collection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function createInspection({
	projects = [],
	users = [],
}: {
	projects?: InspectedEntry[];
	users?: InspectedUser[];
}): AccountInspection {
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
		loadedAt: 1,
		orders: collection([]),
		postalAddresses: collection([]),
		related: Object.fromEntries(
			RELATED_COLLECTION_KEYS.map((key) => [
				key,
				collection(key === 'projects' ? projects : []),
			])
		) as AccountInspection['related'],
		users: collection(users),
	};
}

function jiraAsset(
	externalKey: string,
	attributes: Record<string, string[]>
): JiraAsset {
	return {
		attributes,
		externalKey,
		name: attributes.Name?.[0] ?? '',
		objectId: `${externalKey}-id`,
		objectKey: `CUS-${externalKey}`,
	};
}

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-GETJSMRECORDS] getJSMRecords', () => {
	it('lists the account, then its projects, then its users, and matches each to its JSM asset by ERC', () => {
		const accountAsset = jiraAsset('ACCNT-001', {Name: ['Omni']});
		const projectAsset = jiraAsset('PRJCT-001', {Name: ['Omni Prod']});
		const userAsset = jiraAsset('USER-001', {
			'Email Address': ['ada@omni.com'],
			'Name': ['Ada Lovelace'],
		});

		expect(
			getJSMRecords(
				createInspection({
					projects: [
						{
							externalReferenceCode: 'PRJCT-001',
							id: 20,
							name: 'Omni Prod',
						},
					],
					users: [
						{
							emailAddress: 'ada@omni.com',
							externalReferenceCode: 'USER-001',
							id: 30,
							name: 'Ada Lovelace',
						},
					],
				}),
				{accounts: [projectAsset, accountAsset], contacts: [userAsset]}
			)
		).toEqual([
			{
				drift: [],
				externalReferenceCode: 'ACCNT-001',
				id: 1,
				jiraAsset: accountAsset,
				name: 'Omni',
				recordId: 100,
				type: 'account',
			},
			{
				drift: [],
				externalReferenceCode: 'PRJCT-001',
				id: 2,
				jiraAsset: projectAsset,
				name: 'Omni Prod',
				recordId: 20,
				type: 'project',
			},
			{
				drift: [],
				externalReferenceCode: 'USER-001',
				id: 3,
				jiraAsset: userAsset,
				name: 'Ada Lovelace',
				recordId: 30,
				type: 'user',
			},
		]);
	});

	it('reports a record that has no JSM asset as missing', () => {
		const [account, project] = getJSMRecords(
			createInspection({
				projects: [
					{externalReferenceCode: 'PRJCT-001', id: 20, name: 'Prod'},
				],
			}),
			{accounts: [], contacts: []}
		);

		expect(account.drift).toEqual(['missing-in-jsm']);
		expect(account.jiraAsset).toBeUndefined();
		expect(project.drift).toEqual(['missing-in-jsm']);
	});

	it('does not match a user to an Account asset or a project to a Contact asset', () => {
		const [, project, user] = getJSMRecords(
			createInspection({
				projects: [{externalReferenceCode: 'KEY-1', id: 20, name: 'A'}],
				users: [
					{
						emailAddress: 'b@omni.com',
						externalReferenceCode: 'KEY-2',
						id: 30,
						name: 'B',
					},
				],
			}),
			{
				accounts: [jiraAsset('KEY-2', {Name: ['B']})],
				contacts: [jiraAsset('KEY-1', {Name: ['A']})],
			}
		);

		expect(project.drift).toEqual(['missing-in-jsm']);
		expect(user.drift).toEqual(['missing-in-jsm']);
	});

	it('reports a name that differs, ignoring surrounding spaces', () => {
		const [account, project] = getJSMRecords(
			createInspection({
				projects: [
					{externalReferenceCode: 'PRJCT-001', id: 20, name: 'Prod'},
				],
			}),
			{
				accounts: [
					jiraAsset('ACCNT-001', {Name: [' Omni ']}),
					jiraAsset('PRJCT-001', {Name: ['Production']}),
				],
				contacts: [],
			}
		);

		expect(account.drift).toEqual([]);
		expect(project.drift).toEqual(['name-differs-in-jsm']);
	});

	it('reports a user email address that differs, ignoring case', () => {
		const [, matching, differing] = getJSMRecords(
			createInspection({
				users: [
					{
						emailAddress: 'Ada@Omni.com',
						externalReferenceCode: 'USER-001',
						id: 30,
						name: 'Ada',
					},
					{
						emailAddress: 'bob@omni.com',
						externalReferenceCode: 'USER-002',
						id: 31,
						name: 'Bob',
					},
				],
			}),
			{
				accounts: [jiraAsset('ACCNT-001', {Name: ['Omni']})],
				contacts: [
					jiraAsset('USER-001', {
						'Email Address': ['ada@omni.com'],
						'Name': ['Ada'],
					}),
					jiraAsset('USER-002', {
						'Email Address': ['robert@omni.com'],
						'Name': ['Robert'],
					}),
				],
			}
		);

		expect(matching.drift).toEqual([]);
		expect(differing.drift).toEqual([
			'name-differs-in-jsm',
			'email-address-differs-in-jsm',
		]);
	});

	it('reports a record without an ERC as missing, because JSM keys every asset by ERC', () => {
		const [, project] = getJSMRecords(
			createInspection({projects: [{id: 20, name: 'Prod'}]}),
			{
				accounts: [jiraAsset('ACCNT-001', {Name: ['Omni']})],
				contacts: [],
			}
		);

		expect(project.drift).toEqual(['missing-in-jsm']);
	});
});
