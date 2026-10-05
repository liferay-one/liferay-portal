/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getFormattedTime from './getFormattedTime';

describe('[MOD-BUSINESSEVENTS-GETFORMATTEDTIME] getFormattedTime', () => {
	it('returns an empty string for a missing date', () => {
		expect(getFormattedTime(undefined)).toBe('');
		expect(getFormattedTime('')).toBe('');
	});

	it('formats en US 2 digit hour and minute with a short zone name', () => {
		expect(getFormattedTime('2026-03-05T14:07:00Z', 'UTC')).toBe(
			'02:07 PM UTC'
		);
	});

	it('changes the output for an explicit timeZone', () => {
		expect(
			getFormattedTime('2026-03-05T14:07:00Z', 'America/New_York')
		).toBe('09:07 AM EST');
	});

	it('returns Invalid Date when formatting throws', () => {
		expect(getFormattedTime('2026-03-05T14:07:00Z', 'Not/AZone')).toBe(
			'Invalid Date'
		);
	});
});
