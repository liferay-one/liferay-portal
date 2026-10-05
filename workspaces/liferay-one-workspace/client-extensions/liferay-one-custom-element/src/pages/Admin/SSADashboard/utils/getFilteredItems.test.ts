/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getFilteredItems from './getFilteredItems';

const defaultItems = [
	{key: 'alpha', value: 'Alpha'},
	{key: 'beta', value: 'Beta'},
	{key: 'gamma', value: 'Gamma'},
];

describe('[MOD-ADMIN-SSADASHBOARD-GETFILTEREDITEMS] getFilteredItems', () => {
	it('drops the default items whose key is already selected', () => {
		expect(
			getFilteredItems([{key: 'beta', value: 'Beta'}], defaultItems)
		).toEqual([
			{key: 'alpha', value: 'Alpha'},
			{key: 'gamma', value: 'Gamma'},
		]);
	});

	it('returns every default item when the selected items are undefined', () => {
		expect(getFilteredItems(undefined, defaultItems)).toEqual(defaultItems);
	});

	it('returns every default item when nothing is selected', () => {
		expect(getFilteredItems([], defaultItems)).toEqual(defaultItems);
	});
});
