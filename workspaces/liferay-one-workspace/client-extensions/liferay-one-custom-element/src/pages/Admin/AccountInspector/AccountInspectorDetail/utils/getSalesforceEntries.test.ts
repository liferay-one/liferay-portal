/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getSalesforceEntries from './getSalesforceEntries';

import type {SalesforceRecord} from '~/types/accountInspection';

function createRecord(
	type: SalesforceRecord['type'],
	externalReferenceCode: string
): SalesforceRecord {
	return {
		differences: [],
		externalReferenceCode,
		name: externalReferenceCode,
		status: 'in-sync',
		type,
	};
}

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-GETSALESFORCEENTRIES] getSalesforceEntries', () => {
	it('keeps every record field', () => {
		const record = createRecord('project', 'a0P1');

		expect(getSalesforceEntries([record])[0]).toMatchObject(record);
	});

	it('gives a record the same ID in any position', () => {
		const first = createRecord('project', 'a0P1');
		const second = createRecord('contract', '800A');

		const [firstEntry, secondEntry] = getSalesforceEntries([first, second]);
		const [reorderedSecondEntry, reorderedFirstEntry] =
			getSalesforceEntries([second, first]);

		expect(reorderedFirstEntry.id).toBe(firstEntry.id);
		expect(reorderedSecondEntry.id).toBe(secondEntry.id);
	});

	it('gives different IDs to records of another type with the same ERC', () => {
		const [contractEntry, projectEntry] = getSalesforceEntries([
			createRecord('contract', 'X1'),
			createRecord('project', 'X1'),
		]);

		expect(contractEntry.id).not.toBe(projectEntry.id);
		expect(Number.isInteger(contractEntry.id)).toBe(true);
		expect(contractEntry.id).toBeGreaterThanOrEqual(0);
	});
});
