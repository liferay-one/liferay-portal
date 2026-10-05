/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import generateFileMd5 from './generateFileMd5';

describe('[MOD-TICKETATTACHMENTS-GENERATEFILEMD5] generateFileMd5', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('matches a known digest for a single chunk file', async () => {
		const file = new File(['hello'], 'hello.txt');

		await expect(generateFileMd5(file)).resolves.toBe(
			'5d41402abc4b2a76b9719d911017c592'
		);
	});

	it('matches the digest of a file spanning several 2 MB chunks', async () => {
		const bytes = new Uint8Array(2 * 1024 * 1024 * 2 + 123);

		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = i % 251;
		}

		const file = new File([bytes], 'large.bin');

		const sliceSpy = vi.spyOn(file, 'slice');

		await expect(generateFileMd5(file)).resolves.toBe(
			'88125e460b41727a7f497bc405086a06'
		);
		expect(sliceSpy).toHaveBeenCalledTimes(3);
	});

	it('rejects when a chunk read has no result', async () => {
		class EmptyResultFileReader {
			error: DOMException | null = null;
			onerror: (() => void) | null = null;
			onload: ((event: {target: {result: null}}) => void) | null = null;

			readAsArrayBuffer() {
				this.onload?.({target: {result: null}});
			}
		}

		vi.stubGlobal('FileReader', EmptyResultFileReader);

		await expect(
			generateFileMd5(new File(['hello'], 'hello.txt'))
		).rejects.toThrow('Failed to read file chunk');
	});

	it('rejects with the reader error on onerror', async () => {
		const readerError = new Error('read failed');

		class FailingFileReader {
			error = readerError;
			onerror: (() => void) | null = null;
			onload: (() => void) | null = null;

			readAsArrayBuffer() {
				this.onerror?.();
			}
		}

		vi.stubGlobal('FileReader', FailingFileReader);

		await expect(
			generateFileMd5(new File(['hello'], 'hello.txt'))
		).rejects.toBe(readerError);
	});
});
