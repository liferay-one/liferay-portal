/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	formatDate,
	formatDateTime,
	formatTermRange,
	formatUTCMonthShort,
	formatUTCMonthYear,
	getLastDayOfMonth,
	getUTCDayBounds,
	getUTCMonthBounds,
	getUTCMonthNames,
	getUTCWeekdayNarrowNames,
	parseSlashDateUTC,
	parseUTCDateString,
	shiftUTCDays,
	shiftUTCMonths,
	toISODate,
	toSlashDateUTC,
	toUTCDateString,
} from './dateUtils';

describe('[MOD-DATEUTILS] dateUtils', () => {
	it('formatDate returns the fallback for missing or invalid input', () => {
		expect(formatDate(undefined)).toBe('N/A');
		expect(formatDate('', '-')).toBe('-');
		expect(formatDate('not a date')).toBe('N/A');
		expect(formatDate('not a date', '-')).toBe('-');
	});

	it('formatDate formats a valid date as a short month date', () => {
		expect(formatDate(new Date(2026, 2, 15, 12))).toBe('Mar 15, 2026');
	});

	it('formatDateTime returns the fallback for missing or invalid input', () => {
		expect(formatDateTime(undefined)).toBe('N/A');
		expect(formatDateTime('not a date', '-')).toBe('-');
	});

	it('formatDateTime includes the hour and the minute', () => {
		expect(formatDateTime(new Date(2026, 2, 15, 14, 5))).toBe(
			'Mar 15, 2026, 2:05 PM'
		);
	});

	it('formatTermRange gives an MM.DD.YYYY range or a dash', () => {
		expect(
			formatTermRange('2027-01-31T00:00:00Z', '2026-02-01T00:00:00Z')
		).toBe('02.01.2026 - 01.31.2027');
		expect(formatTermRange(undefined, '2026-02-01')).toBe('-');
		expect(formatTermRange('2027-01-31', undefined)).toBe('-');
	});

	it('formats UTC month names regardless of the local zone', () => {
		const date = new Date(Date.UTC(2026, 0, 1, 0, 30));

		expect(date.getMonth()).toBe(11);

		expect(formatUTCMonthShort(date)).toBe('Jan');
		expect(formatUTCMonthYear(date)).toBe('January 2026');
	});

	it('getLastDayOfMonth handles leap years', () => {
		expect(getLastDayOfMonth(1, 2024)).toBe(29);
		expect(getLastDayOfMonth(1, 2026)).toBe(28);
		expect(getLastDayOfMonth(11, 2026)).toBe(31);
	});

	it('parseSlashDateUTC rejects malformed, non numeric, and impossible dates', () => {
		expect(parseSlashDateUTC('02/30/2026')).toBeUndefined();
		expect(parseSlashDateUTC('13/01/2026')).toBeUndefined();
		expect(parseSlashDateUTC('aa/01/2026')).toBeUndefined();
		expect(parseSlashDateUTC('01/01')).toBeUndefined();
		expect(parseSlashDateUTC('2026-01-01')).toBeUndefined();
	});

	it('parseSlashDateUTC parses a valid date at UTC midnight', () => {
		expect(parseSlashDateUTC('02/29/2024')?.toISOString()).toBe(
			'2024-02-29T00:00:00.000Z'
		);
	});

	it('parseUTCDateString parses an ISO day and rejects garbage', () => {
		expect(parseUTCDateString('2026-03-15')?.toISOString()).toBe(
			'2026-03-15T00:00:00.000Z'
		);
		expect(parseUTCDateString('garbage')).toBeUndefined();
	});

	it('getUTCDayBounds returns the same start and end day', () => {
		expect(getUTCDayBounds('03/15/2026')).toEqual({
			endDate: '2026-03-15',
			startDate: '2026-03-15',
		});
		expect(getUTCDayBounds('02/30/2026')).toBeUndefined();
	});

	it('getUTCMonthBounds spans the whole month including leap February', () => {
		expect(getUTCMonthBounds('02/10/2024')).toEqual({
			endDate: '2024-02-29',
			startDate: '2024-02-01',
		});
		expect(getUTCMonthBounds('12/31/2026')).toEqual({
			endDate: '2026-12-31',
			startDate: '2026-12-01',
		});
		expect(getUTCMonthBounds('bad')).toBeUndefined();
	});

	it('shiftUTCDays crosses month and year ends', () => {
		expect(shiftUTCDays('02/28/2024', 1)).toBe('02/29/2024');
		expect(shiftUTCDays('02/28/2026', 1)).toBe('03/01/2026');
		expect(shiftUTCDays('12/31/2026', 1)).toBe('01/01/2027');
		expect(shiftUTCDays('01/01/2026', -1)).toBe('12/31/2025');
		expect(shiftUTCDays('bad', 1)).toBeUndefined();
	});

	it('shiftUTCMonths moves to the first day of the target month', () => {
		expect(shiftUTCMonths('01/31/2026', 1)).toBe('02/01/2026');
		expect(shiftUTCMonths('12/15/2026', 1)).toBe('01/01/2027');
		expect(shiftUTCMonths('01/15/2026', -1)).toBe('12/01/2025');
		expect(shiftUTCMonths('bad', 1)).toBeUndefined();
	});

	it('toISODate pins the value to local noon so the calendar day does not shift', () => {
		const isoDate = toISODate('2026-03-15') as string;

		expect(isoDate).toBe(new Date(2026, 2, 15, 12).toISOString());
		expect(new Date(isoDate).getDate()).toBe(15);
		expect(toISODate(undefined)).toBeUndefined();
		expect(toISODate('')).toBeUndefined();
	});

	it('converts between Date and UTC day strings', () => {
		const date = new Date(Date.UTC(2026, 2, 5, 23, 59));

		expect(toSlashDateUTC(date)).toBe('03/05/2026');
		expect(toUTCDateString(date)).toBe('2026-03-05');
	});

	it('returns the twelve month names', () => {
		const monthNames = getUTCMonthNames();

		expect(monthNames).toHaveLength(12);
		expect(monthNames[0]).toBe('January');
		expect(monthNames[11]).toBe('December');
	});

	it('rotates the narrow weekday names by the first day of week', () => {
		expect(getUTCWeekdayNarrowNames()).toEqual([
			'S',
			'M',
			'T',
			'W',
			'T',
			'F',
			'S',
		]);
		expect(getUTCWeekdayNarrowNames(1)).toEqual([
			'M',
			'T',
			'W',
			'T',
			'F',
			'S',
			'S',
		]);
		expect(getUTCWeekdayNarrowNames(6)).toEqual([
			'S',
			'S',
			'M',
			'T',
			'W',
			'T',
			'F',
		]);
	});
});
