/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import isPermanentKey from './isPermanentKey';

describe('[MOD-MYACCOUNT-PROJECTS-ISPERMANENTKEY] isPermanentKey', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('is false without an expiration date', () => {
		expect(isPermanentKey(undefined, '2020-01-01')).toBe(false);
	});

	it('is false for an invalid expiration or start date', () => {
		expect(isPermanentKey('not a date', '2020-01-01')).toBe(false);
		expect(isPermanentKey('2120-01-01', 'not a date')).toBe(false);
	});

	it('is true when the key expires 80 years or more after its start', () => {
		expect(isPermanentKey('2100-01-01', '2020-01-01')).toBe(true);
		expect(isPermanentKey('2200-06-01', '2020-01-01')).toBe(true);
	});

	it('is false one day short of 80 years', () => {
		expect(isPermanentKey('2099-12-31', '2020-01-01')).toBe(false);
	});

	it('measures from now when there is no start date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

		expect(isPermanentKey('2106-01-01T00:00:00Z')).toBe(true);
		expect(isPermanentKey('2105-12-31T00:00:00Z')).toBe(false);
	});
});
