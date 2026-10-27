/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {RELATED_COLLECTION_KEYS} from '~/types/accountInspection';

import getJSMProjectQualification from './getJSMProjectQualification';

import type {
	AccountInspection,
	InspectedCollection,
	InspectedEntry,
} from '~/types/accountInspection';

const NOW = Date.parse('2026-06-01T00:00:00Z');

function collection<Entry>(items: Entry[]): InspectedCollection<Entry> {
	return {items, totalCount: items.length};
}

function createInspection(entitlements: InspectedEntry[]): AccountInspection {
	const related: Partial<Record<string, InspectedEntry[]>> = {
		entitlements,
		projects: [
			{id: 20, name: 'Prod'},
			{id: 21, name: 'Dev'},
		],
	};

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
				collection(related[key] ?? []),
			])
		) as AccountInspection['related'],
		users: collection([]),
	};
}

function getQualifyingProjectIds(entitlements: InspectedEntry[]) {
	const {nonqualifyingProjects, qualifyingProjects} =
		getJSMProjectQualification(createInspection(entitlements), NOW);

	return {
		nonqualifying: nonqualifyingProjects.map(({id}) => id),
		qualifying: qualifyingProjects.map(({id}) => id),
	};
}

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-GETJSMPROJECTQUALIFICATION] getJSMProjectQualification', () => {
	it('qualifies no project when the account has no entitlements', () => {
		expect(getQualifyingProjectIds([])).toEqual({
			nonqualifying: [20, 21],
			qualifying: [],
		});
	});

	it('qualifies only the project that holds an active JSM entitlement', () => {
		expect(
			getQualifyingProjectIds([
				{
					id: 1,
					name: 'active-subscription',
					r_projectToEntitlement_c_projectId: 20,
				},
				{
					id: 2,
					name: 'dxp-production',
					r_projectToEntitlement_c_projectId: 21,
				},
			])
		).toEqual({nonqualifying: [21], qualifying: [20]});
	});

	it('qualifies every project when the account has a partner entitlement or an unassigned JSM entitlement', () => {
		expect(
			getQualifyingProjectIds([
				{
					id: 1,
					name: 'partner',
					r_projectToEntitlement_c_projectId: 21,
				},
			])
		).toEqual({nonqualifying: [], qualifying: [20, 21]});

		expect(
			getQualifyingProjectIds([
				{id: 1, name: 'eps-7-3', r_projectToEntitlement_c_projectId: 0},
			])
		).toEqual({nonqualifying: [], qualifying: [20, 21]});
	});

	it('ignores an entitlement that is terminated, has not started, or has ended', () => {
		expect(
			getQualifyingProjectIds([
				{
					id: 1,
					name: 'active-subscription',
					r_projectToEntitlement_c_projectId: 20,
					terminationStatus: 'terminated',
				},
				{
					id: 2,
					name: 'active-subscription',
					r_projectToEntitlement_c_projectId: 20,
					startDate: '2026-07-01T00:00:00Z',
				},
				{
					endDate: '2026-05-01T00:00:00Z',
					id: 3,
					name: 'partner',
					r_projectToEntitlement_c_projectId: 0,
				},
			])
		).toEqual({nonqualifying: [20, 21], qualifying: []});
	});
});
