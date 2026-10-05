/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getFormattedEventDateTime,
	normalizeEventDateTime,
} from './getFormattedEventDateUtils';

describe('[MOD-BUSINESSEVENTS-GETFORMATTEDEVENTDATEUTILS] getFormattedEventDateUtils', () => {
	describe('getFormattedEventDateTime', () => {
		it('returns undefined for a missing date or time', () => {
			expect(
				getFormattedEventDateTime(undefined, '10:30')
			).toBeUndefined();
			expect(
				getFormattedEventDateTime('03-05-2026', undefined)
			).toBeUndefined();
		});

		it('returns undefined for a malformed date or time', () => {
			expect(getFormattedEventDateTime('03-05', '10:30')).toBeUndefined();
			expect(
				getFormattedEventDateTime('03-05-2026', '10')
			).toBeUndefined();
			expect(
				getFormattedEventDateTime('03-05-2026', '10:30:00')
			).toBeUndefined();
		});

		it('pads month, day, hours, and minutes from a string time', () => {
			expect(getFormattedEventDateTime('3-5-2026', '9:7')).toBe(
				'2026-03-05T09:07:00.000Z'
			);
		});

		it('pads hours and minutes from a time input object', () => {
			expect(
				getFormattedEventDateTime('03-05-2026', {
					hours: '9',
					minutes: '5',
				})
			).toBe('2026-03-05T09:05:00.000Z');
		});

		it('treats the dashes placeholder as 00', () => {
			expect(
				getFormattedEventDateTime('03-05-2026', {
					hours: '--',
					minutes: '--',
				})
			).toBe('2026-03-05T00:00:00.000Z');
		});

		it('applies a positive or negative UTC offset', () => {
			expect(
				getFormattedEventDateTime('03-05-2026', '10:00', 'UTC +5')
			).toBe('2026-03-05T05:00:00.000Z');
			expect(
				getFormattedEventDateTime('03-05-2026', '10:00', 'UTC -11')
			).toBe('2026-03-05T21:00:00.000Z');
		});

		it('uses UTC when the zone does not match the pattern', () => {
			expect(
				getFormattedEventDateTime(
					'03-05-2026',
					'10:00',
					'America/New_York'
				)
			).toBe('2026-03-05T10:00:00.000Z');
		});
	});

	describe('normalizeEventDateTime', () => {
		it('returns the input for a missing date', () => {
			expect(normalizeEventDateTime(undefined, 'UTC +5')).toBeUndefined();
			expect(normalizeEventDateTime('', 'UTC +5')).toBe('');
		});

		it('returns the input for a zero offset', () => {
			expect(normalizeEventDateTime('2026-03-05T10:00:00Z', 'UTC')).toBe(
				'2026-03-05T10:00:00Z'
			);
			expect(
				normalizeEventDateTime('2026-03-05T10:00:00Z', 'UTC +0')
			).toBe('2026-03-05T10:00:00Z');
		});

		it('returns the input for an invalid date', () => {
			expect(normalizeEventDateTime('not a date', 'UTC +5')).toBe(
				'not a date'
			);
		});

		it('shifts by the signed offset', () => {
			expect(
				normalizeEventDateTime('2026-03-05T10:00:00Z', 'UTC +5')
			).toBe('2026-03-05T15:00:00.000Z');
			expect(
				normalizeEventDateTime('2026-03-05T10:00:00Z', 'UTC -11')
			).toBe('2026-03-04T23:00:00.000Z');
		});
	});
});
