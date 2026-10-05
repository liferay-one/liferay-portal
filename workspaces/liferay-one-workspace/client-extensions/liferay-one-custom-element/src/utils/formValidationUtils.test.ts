/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	EMAIL_PATTERN,
	isValidDate,
	requiredTimeInput,
} from './formValidationUtils';

describe('[MOD-FORMVALIDATIONUTILS] formValidationUtils', () => {
	it('EMAIL_PATTERN accepts typical addresses', () => {
		expect(EMAIL_PATTERN.test('user@example.com')).toBe(true);
		expect(EMAIL_PATTERN.test('first.last+tag@sub.example.co')).toBe(true);
	});

	it('EMAIL_PATTERN rejects malformed addresses', () => {
		expect(EMAIL_PATTERN.test('user@example')).toBe(false);
		expect(EMAIL_PATTERN.test('user example@example.com')).toBe(false);
		expect(EMAIL_PATTERN.test('@example.com')).toBe(false);
		expect(EMAIL_PATTERN.test('user@@example.com')).toBe(false);
		expect(EMAIL_PATTERN.test('')).toBe(false);
	});

	it('requiredTimeInput errors on an empty value or a dashes placeholder', () => {
		expect(
			requiredTimeInput(
				undefined as unknown as Parameters<typeof requiredTimeInput>[0]
			)
		).toBe('This field is required.');
		expect(requiredTimeInput({hours: '--', minutes: '30'})).toBe(
			'This field is required.'
		);
		expect(requiredTimeInput({hours: '10', minutes: '--'})).toBe(
			'This field is required.'
		);
	});

	it('requiredTimeInput passes a complete time', () => {
		expect(requiredTimeInput({hours: '10', minutes: '30'})).toBeUndefined();
	});

	it('isValidDate returns nothing for an empty value or a valid date', () => {
		expect(isValidDate('')).toBeUndefined();
		expect(isValidDate('2026-03-15')).toBeUndefined();
		expect(
			isValidDate('2026-03-15', {end: 2030, start: 2020})
		).toBeUndefined();
	});

	it('isValidDate returns an error for an invalid date', () => {
		expect(isValidDate('not-a-date')).toBe('Please insert a valid date.');
	});

	it('isValidDate returns an error when the year is outside the range', () => {
		expect(isValidDate('2031-01-01', {end: 2030, start: 2020})).toBe(
			'Please insert a valid date.'
		);
		expect(isValidDate('2019-12-31', {end: 2030, start: 2020})).toBe(
			'Please insert a valid date.'
		);
	});
});
