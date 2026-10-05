/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import exportToCSV from './exportToCSV';

function readBytes(blob: Blob): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = reject;
		reader.onload = () =>
			resolve(new Uint8Array(reader.result as ArrayBuffer));
		reader.readAsArrayBuffer(blob);
	});
}

describe('[MOD-EXPORTTOCSV] exportToCSV', () => {
	const {createObjectURL, revokeObjectURL} = URL;

	let blobs: Blob[];
	let clicked: HTMLAnchorElement[];

	beforeEach(() => {
		blobs = [];
		clicked = [];

		URL.createObjectURL = vi.fn((blob: Blob) => {
			blobs.push(blob);

			return 'blob:csv-url';
		});
		URL.revokeObjectURL = vi.fn();

		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
			function (this: HTMLAnchorElement) {
				clicked.push(this);

				expect(URL.revokeObjectURL).not.toHaveBeenCalled();
			}
		);
	});

	afterEach(() => {
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;

		vi.restoreAllMocks();
	});

	it('quotes every cell, doubles inner quotes, and prefixes a BOM', async () => {
		exportToCSV(
			'export.csv',
			['Name', 'Note'],
			[
				['Acme', 'say "hi"'],
				[42, 'a,b'],
			]
		);

		expect(blobs).toHaveLength(1);
		expect(blobs[0].type).toBe('text/csv;charset=utf-8;');

		const bytes = await readBytes(blobs[0]);

		expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
		expect(new TextDecoder().decode(bytes.slice(3))).toBe(
			'"Name","Note"\n"Acme","say ""hi"""\n"42","a,b"\n'
		);
	});

	it('clicks a download anchor and revokes the object URL after the click', () => {
		exportToCSV('export.csv', ['A'], []);

		expect(clicked).toHaveLength(1);
		expect(clicked[0].download).toBe('export.csv');
		expect(clicked[0].href).toBe('blob:csv-url');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv-url');
	});
});
