/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {base64ToText, convertSize, fileToBase64} from './fileUtils';

describe('[MOD-FILEUTILS] fileUtils', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('convertSize converts between KB, MB, and GB using decimal 1000 steps', () => {
		expect(convertSize('GB', 'MB', 2)).toBe(2000);
		expect(convertSize('MB', 'GB', '1500')).toBe(1.5);
		expect(convertSize('KB', 'MB', 500)).toBe(0.5);
		expect(convertSize('MB', 'MB', 7)).toBe(7);
	});

	it('base64ToText returns the part after the last comma', () => {
		expect(base64ToText('data:text/plain;base64,aGk=')).toBe('aGk=');
		expect(base64ToText('aGk=')).toBe('aGk=');
		expect(base64ToText('a,b,c')).toBe('c');
	});

	it('fileToBase64 resolves the data URL', async () => {
		await expect(
			fileToBase64(new File(['hi'], 'hi.txt', {type: 'text/plain'}))
		).resolves.toBe('data:text/plain;base64,aGk=');
	});

	it('fileToBase64 rejects on a read error', async () => {
		const error = new Error('read failed');

		class FailingFileReader {
			onerror: ((reason: unknown) => void) | null = null;
			onload: (() => void) | null = null;
			result = null;

			readAsDataURL() {
				queueMicrotask(() => this.onerror?.(error));
			}
		}

		vi.stubGlobal('FileReader', FailingFileReader);

		await expect(fileToBase64(new File(['x'], 'x.txt'))).rejects.toBe(
			error
		);
	});
});
