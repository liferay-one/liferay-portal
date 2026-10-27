/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getJSMRecords from './getJSMRecords';

import type {JiraAsset} from '~/types/accountInspection';

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
	it('lists each project and matches it to its JSM Account asset by ERC', () => {
		const projectAsset = jiraAsset('PRJCT-001', {Name: ['Omni Prod']});

		expect(
			getJSMRecords(
				[
					{
						externalReferenceCode: 'PRJCT-001',
						id: 20,
						name: 'Omni Prod',
					},
				],
				{
					accounts: [
						jiraAsset('ACCNT-001', {Name: ['Omni']}),
						projectAsset,
					],
					contacts: [],
				}
			)
		).toEqual([
			{
				drift: [],
				externalReferenceCode: 'PRJCT-001',
				id: 20,
				jiraAsset: projectAsset,
				name: 'Omni Prod',
				recordId: 20,
				type: 'project',
			},
		]);
	});

	it('reports a project that has no JSM asset as missing', () => {
		const [project] = getJSMRecords(
			[{externalReferenceCode: 'PRJCT-001', id: 20, name: 'Prod'}],
			{accounts: [], contacts: []}
		);

		expect(project.drift).toEqual(['missing-in-jsm']);
		expect(project.jiraAsset).toBeUndefined();
	});

	it('does not match a project to a Contact asset', () => {
		const [project] = getJSMRecords(
			[{externalReferenceCode: 'KEY-1', id: 20, name: 'A'}],
			{accounts: [], contacts: [jiraAsset('KEY-1', {Name: ['A']})]}
		);

		expect(project.drift).toEqual(['missing-in-jsm']);
	});

	it('reports a name that differs, ignoring surrounding spaces', () => {
		const [matching, differing] = getJSMRecords(
			[
				{externalReferenceCode: 'PRJCT-001', id: 20, name: 'Prod'},
				{externalReferenceCode: 'PRJCT-002', id: 21, name: 'Dev'},
			],
			{
				accounts: [
					jiraAsset('PRJCT-001', {Name: [' Prod ']}),
					jiraAsset('PRJCT-002', {Name: ['Development']}),
				],
				contacts: [],
			}
		);

		expect(matching.drift).toEqual([]);
		expect(differing.drift).toEqual(['name-differs-in-jsm']);
	});

	it('reports a project without an ERC as missing, because JSM keys every asset by ERC', () => {
		const [project] = getJSMRecords([{id: 20, name: 'Prod'}], {
			accounts: [jiraAsset('PRJCT-001', {Name: ['Prod']})],
			contacts: [],
		});

		expect(project.drift).toEqual(['missing-in-jsm']);
	});
});
