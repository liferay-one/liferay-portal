/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getFormattedDate from './getFormattedDate';

describe('[MOD-BUSINESSEVENTS-GETFORMATTEDDATE] getFormattedDate', () => {
	it('returns an empty string for a missing date', () => {
		expect(getFormattedDate(undefined, 'day2DMonth2DYearN')).toBe('');
		expect(getFormattedDate('', 'day2DMonthSYearN')).toBe('');
	});

	it('returns Invalid Date for an unparsable date', () => {
		expect(getFormattedDate('not a date', 'day2DMonth2DYearN')).toBe(
			'Invalid Date'
		);
	});

	it('formats with 2 digit numeric parts in the Liferay locale', () => {
		expect(
			getFormattedDate('2026-03-05T12:00:00Z', 'day2DMonth2DYearN', 'UTC')
		).toBe('03/05/2026');
	});

	it('formats with a short month in the Liferay locale', () => {
		expect(
			getFormattedDate('2026-03-05T12:00:00Z', 'day2DMonthSYearN', 'UTC')
		).toBe('Mar 05, 2026');
	});

	it('renders a different day near midnight for an explicit timeZone', () => {
		const date = '2026-03-05T02:00:00Z';

		expect(getFormattedDate(date, 'day2DMonth2DYearN', 'UTC')).toBe(
			'03/05/2026'
		);
		expect(
			getFormattedDate(date, 'day2DMonth2DYearN', 'America/New_York')
		).toBe('03/04/2026');
	});
});
