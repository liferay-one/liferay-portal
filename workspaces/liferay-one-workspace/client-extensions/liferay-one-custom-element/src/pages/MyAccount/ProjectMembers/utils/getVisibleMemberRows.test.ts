/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getVisibleMemberRows from './getVisibleMemberRows';

function member(name: string, {isNew = false, removed = false} = {}) {
	return {
		email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`,
		isNew,
		name,
		removed,
	};
}

function names(rows: ReturnType<typeof getVisibleMemberRows>['rows']) {
	return rows.map(({member}) => member.name);
}

describe('[MOD-MYACCOUNT-PROJECTMEMBERS-GETVISIBLEMEMBERROWS] getVisibleMemberRows', () => {
	it('skips removed members and keeps the index of each row in the full list', () => {
		const {hiddenCount, rows, savedMemberCount} = getVisibleMemberRows(
			[member('Ana'), member('Bo', {removed: true}), member('Cy')],
			'',
			20
		);

		expect(rows.map(({index}) => index)).toEqual([0, 2]);
		expect(hiddenCount).toBe(0);
		expect(savedMemberCount).toBe(2);
	});

	it('shows saved members up to the visible count and reports the hidden ones', () => {
		const members = Array.from({length: 25}, (_, index) =>
			member(`Member ${index}`)
		);

		const {hiddenCount, rows} = getVisibleMemberRows(members, '', 20);

		expect(rows).toHaveLength(20);
		expect(hiddenCount).toBe(5);
		expect(getVisibleMemberRows(members, '', 40).hiddenCount).toBe(0);
	});

	it('filters saved members by name or email address', () => {
		const members = [member('Ana Silva'), member('Bo Chen'), member('Cy')];

		expect(names(getVisibleMemberRows(members, 'ANA', 20).rows)).toEqual([
			'Ana Silva',
		]);
		expect(
			names(getVisibleMemberRows(members, 'bo.chen@', 20).rows)
		).toEqual(['Bo Chen']);
	});

	it('always appends new unsaved members after the saved ones', () => {
		const members = [
			member('Ana'),
			member('New', {isNew: true}),
			member('Bo'),
			member('Cy'),
			member('Gone', {isNew: true, removed: true}),
		];

		expect(names(getVisibleMemberRows(members, '', 1).rows)).toEqual([
			'Ana',
			'New',
		]);
		expect(names(getVisibleMemberRows(members, 'zzz', 20).rows)).toEqual([
			'New',
		]);
		expect(getVisibleMemberRows(members, '', 1)).toMatchObject({
			hiddenCount: 2,
			savedMemberCount: 3,
		});
	});
});
