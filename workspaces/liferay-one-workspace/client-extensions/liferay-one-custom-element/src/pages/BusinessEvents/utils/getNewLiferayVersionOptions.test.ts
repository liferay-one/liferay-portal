/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getNewLiferayVersionOptions from './getNewLiferayVersionOptions';

const productVersions = [
	{label: '2026.Q1', value: '103'},
	{label: '2025.Q4', value: '102'},
	{label: '7.4', value: '101'},
];

describe('[MOD-BUSINESSEVENTS-GETNEWLIFERAYVERSIONOPTIONS] getNewLiferayVersionOptions', () => {
	it('returns every version without a current version', () => {
		expect(getNewLiferayVersionOptions(productVersions)).toEqual(
			productVersions
		);
	});

	it('returns the current version and every newer version', () => {
		expect(
			getNewLiferayVersionOptions(productVersions, '102').map(
				({label}) => label
			)
		).toEqual(['2026.Q1', '2025.Q4']);
	});

	it('returns no versions when the current version is unknown', () => {
		expect(getNewLiferayVersionOptions(productVersions, '999')).toEqual([]);
	});
});
