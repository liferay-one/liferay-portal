/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
	downloadBlob,
	downloadFile,
	getFileNameExtension,
} from './downloadFileUtils';

describe('[MOD-DOWNLOADFILEUTILS] downloadFileUtils', () => {
	let clicked: HTMLAnchorElement[];

	beforeEach(() => {
		clicked = [];

		URL.createObjectURL = vi.fn(() => 'blob:mock-url');

		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
			function (this: HTMLAnchorElement) {
				clicked.push(this);
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('getFileNameExtension returns the last dot extension or empty', () => {
		expect(getFileNameExtension('archive.tar.gz')).toBe('.gz');
		expect(getFileNameExtension('report.pdf')).toBe('.pdf');
		expect(getFileNameExtension('README')).toBe('');
		expect(getFileNameExtension('folder.name/file')).toBe('');
	});

	it('downloadBlob clicks and removes a temporary anchor', () => {
		const blob = new Blob(['data']);

		downloadBlob('file.txt', blob);

		expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
		expect(clicked).toHaveLength(1);
		expect(clicked[0].download).toBe('file.txt');
		expect(clicked[0].href).toBe('blob:mock-url');
		expect(clicked[0].isConnected).toBe(false);
		expect(document.querySelectorAll('a')).toHaveLength(0);
	});

	it('downloadFile uses the content disposition filename with quotes stripped', async () => {
		await downloadFile(
			'fallback.txt',
			new Response('data', {
				headers: {
					'content-disposition': 'attachment; filename="license.xml"',
				},
			})
		);

		expect(clicked[0].download).toBe('license.xml');
	});

	it('downloadFile falls back to the passed name without a content disposition filename', async () => {
		await downloadFile('fallback.txt', new Response('data'));

		await downloadFile(
			'other.txt',
			new Response('data', {
				headers: {'content-disposition': 'attachment'},
			})
		);

		expect(clicked.map((anchor) => anchor.download)).toEqual([
			'fallback.txt',
			'other.txt',
		]);
	});
});
