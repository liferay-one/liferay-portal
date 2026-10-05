/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import formatFileSize from './formatFileSize';

describe('[MOD-TICKETATTACHMENTS-FORMATFILESIZE] formatFileSize', () => {
	it('returns an em dash for missing, NaN, zero, or negative input', () => {
		expect(formatFileSize()).toBe('—');
		expect(formatFileSize('')).toBe('—');
		expect(formatFileSize('abc')).toBe('—');
		expect(formatFileSize('0')).toBe('—');
		expect(formatFileSize('-5')).toBe('—');
	});

	it('formats whole bytes without decimals', () => {
		expect(formatFileSize('512')).toBe('512 B');
		expect(formatFileSize('1023')).toBe('1023 B');
	});

	it('formats KB, MB, and GB with one decimal using 1024 steps', () => {
		expect(formatFileSize('1024')).toBe('1 KB');
		expect(formatFileSize('1536')).toBe('1.5 KB');
		expect(formatFileSize(String(1024 * 1024 * 2.25))).toBe('2.3 MB');
		expect(formatFileSize(String(1024 ** 3 * 3))).toBe('3 GB');
	});

	it('caps the unit at GB', () => {
		expect(formatFileSize(String(1024 ** 4 * 2))).toBe('2048 GB');
	});
});
