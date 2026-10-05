/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import containsOption from './containsOption';

const options = [
	{label: 'First', value: 'first'},
	{label: 'Second', value: 'second'},
];

describe('[MOD-BUSINESSEVENTS-CONTAINSOPTION] containsOption', () => {
	it('returns false for an empty option list', () => {
		expect(containsOption([], 'first')).toBe(false);
	});

	it('returns false for a missing key', () => {
		expect(containsOption(options)).toBe(false);
		expect(containsOption(options, '')).toBe(false);
	});

	it('returns true only when an option value equals the key', () => {
		expect(containsOption(options, 'second')).toBe(true);
		expect(containsOption(options, 'Second')).toBe(false);
		expect(containsOption(options, 'third')).toBe(false);
	});
});
