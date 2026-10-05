/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import useGCSGetUploadOffset from './useGCSGetUploadOffset';

const GCS_SESSION_URL = 'https://storage.googleapis.com/upload/session';

function mockFetchResponse(status: number, range?: string) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
		headers: new Headers(range ? {Range: range} : {}),
		status,
	} as Response);
}

async function getUploadOffset() {
	const {result} = renderHook(() => useGCSGetUploadOffset());

	let offset = -1;

	await act(async () => {
		offset = await result.current.getUploadOffset({
			gcsSessionURL: GCS_SESSION_URL,
			totalSize: 1000,
		});
	});

	return {offset, result};
}

describe('[HOOK-TICKETATTACHMENTS-USEGCSGETUPLOADOFFSET] useGCSGetUploadOffset', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([200, 201])(
		'returns the total size on a %s response',
		async (status) => {
			const fetch = mockFetchResponse(status);

			const {offset, result} = await getUploadOffset();

			expect(offset).toBe(1000);
			expect(fetch).toHaveBeenCalledWith(GCS_SESSION_URL, {
				headers: {
					'Content-Length': '0',
					'Content-Range': 'bytes */1000',
				},
				method: 'PUT',
			});
			expect(result.current.loading).toBe(false);
		}
	);

	it('returns the last byte plus one from the Range header on a 308 response', async () => {
		mockFetchResponse(308, 'bytes=0-499');

		const {offset} = await getUploadOffset();

		expect(offset).toBe(500);
	});

	it('returns 0 on a 308 response without a Range header', async () => {
		mockFetchResponse(308);

		const {offset} = await getUploadOffset();

		expect(offset).toBe(0);
	});

	it('returns 0 on a 308 response with an unparsable Range header', async () => {
		mockFetchResponse(308, 'garbage');

		const {offset} = await getUploadOffset();

		expect(offset).toBe(0);
	});

	it('returns 0 and sets the error when the request throws', async () => {
		const failure = new Error('network');

		vi.spyOn(globalThis, 'fetch').mockRejectedValue(failure);

		const {offset, result} = await getUploadOffset();

		expect(offset).toBe(0);
		expect(result.current.error).toBe(failure);
		expect(result.current.loading).toBe(false);
	});
});
