/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useGCSUploadFile from './useGCSUploadFile';

const {completeUpload, getUploadOffset} = vi.hoisted(() => ({
	completeUpload: vi.fn(),
	getUploadOffset: vi.fn(),
}));

vi.mock('./useGCSGetUploadOffset', () => ({
	default: () => ({error: null, getUploadOffset, loading: false}),
}));

vi.mock('./useTicketAttachmentsCompleteUpload', () => ({
	default: () => ({completeUpload, loading: false}),
}));

const CHUNK_SIZE = 25 * 1024 * 1024;

const GCS_SESSION_URL = 'https://storage.googleapis.com/upload/session';

function createFile(size: number) {
	return {
		name: 'heap.hprof',
		size,
		slice: (start: number, end: number) => ({size: end - start}),
	} as unknown as File;
}

function uploadParams(size: number) {
	return {
		comment: 'Heap dump',
		file: createFile(size),
		fileMd5: 'md5-abc',
		gcsSessionURL: GCS_SESSION_URL,
		projectKey: 'LRSD',
		ticketAttachmentId: '77',
		ticketId: 'LRSD-1',
	};
}

function contentRanges(fetch: ReturnType<typeof vi.spyOn>) {
	return fetch.mock.calls.map(
		([, options]: unknown[]) =>
			(options as {headers: Record<string, string>}).headers[
				'Content-Range'
			]
	);
}

describe('[HOOK-TICKETATTACHMENTS-USEGCSUPLOADFILE] useGCSUploadFile', () => {
	beforeEach(() => {
		completeUpload.mockResolvedValue(undefined);
		getUploadOffset.mockResolvedValue(0);
	});

	afterEach(() => {
		sessionStorage.clear();

		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('resumes from the server offset in 25 MB chunks and completes the upload', async () => {
		const totalSize = 60 * 1024 * 1024;
		const offset = 10 * 1024 * 1024;

		getUploadOffset.mockResolvedValue(offset);

		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({ok: false, status: 308} as Response)
			.mockResolvedValueOnce({ok: true, status: 200} as Response);

		const {result} = renderHook(() => useGCSUploadFile());

		let response;

		await act(async () => {
			response = await result.current.uploadFile(uploadParams(totalSize));
		});

		expect(getUploadOffset).toHaveBeenCalledWith({
			gcsSessionURL: GCS_SESSION_URL,
			totalSize,
		});
		expect(contentRanges(fetch)).toEqual([
			`bytes ${offset}-${offset + CHUNK_SIZE - 1}/${totalSize}`,
			`bytes ${offset + CHUNK_SIZE}-${totalSize - 1}/${totalSize}`,
		]);
		expect(fetch.mock.calls[0][1]).toEqual(
			expect.objectContaining({
				headers: expect.objectContaining({
					'Content-Length': String(CHUNK_SIZE),
				}),
				method: 'PUT',
			})
		);
		expect(completeUpload).toHaveBeenCalledWith({
			comment: 'Heap dump',
			fileMd5: 'md5-abc',
			ticketAttachmentId: '77',
		});
		expect(response).toEqual({
			success: true,
			uploadProperties: {
				attachmentName: 'heap.hprof',
				ticketId: 'LRSD-1',
				uploadProjectKey: 'LRSD',
			},
		});
		expect(result.current.progress).toBe(100);
		expect(result.current.loading).toBe(false);
	});

	it('skips the chunk upload when the server already holds the whole file', async () => {
		getUploadOffset.mockResolvedValue(1000);

		const fetch = vi.spyOn(globalThis, 'fetch');

		const {result} = renderHook(() => useGCSUploadFile());

		await act(async () => {
			await result.current.uploadFile(uploadParams(1000));
		});

		expect(fetch).not.toHaveBeenCalled();
		expect(completeUpload).toHaveBeenCalledTimes(1);
		expect(result.current.progress).toBe(100);
	});

	it('retries a failed chunk with exponential backoff', async () => {
		vi.useFakeTimers();

		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new Error('reset'))
			.mockRejectedValueOnce(new Error('reset'))
			.mockResolvedValueOnce({ok: true, status: 200} as Response);

		const {result} = renderHook(() => useGCSUploadFile());

		let response: unknown;

		await act(async () => {
			const pending = result.current.uploadFile(uploadParams(1000));

			await vi.advanceTimersByTimeAsync(999);

			expect(fetch).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);

			expect(fetch).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(1999);

			expect(fetch).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(1);

			response = await pending;
		});

		expect(fetch).toHaveBeenCalledTimes(3);
		expect(response).toEqual(expect.objectContaining({success: true}));
	});

	it('gives up after five failed attempts with UNEXPECTED_ERROR and resets progress', async () => {
		vi.useFakeTimers();

		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			status: 503,
			statusText: 'Service Unavailable',
		} as Response);

		const {result} = renderHook(() => useGCSUploadFile());

		let response: unknown;

		await act(async () => {
			const pending = result.current.uploadFile(uploadParams(1000));

			await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000);

			response = await pending;
		});

		expect(fetch).toHaveBeenCalledTimes(5);
		expect(completeUpload).not.toHaveBeenCalled();
		expect(response).toEqual({
			success: false,
			uploadProperties: {
				errorCode: 'UNEXPECTED_ERROR',
				errorMessage:
					'Error: Chunk upload failed: 503 Service Unavailable',
				ticketId: 'LRSD-1',
				uploadProjectKey: 'LRSD',
			},
		});
		expect(result.current.progress).toBe(0);
	});

	it('stops without completing when the upload is aborted', async () => {
		sessionStorage.setItem('gcsSessionURL:md5-abc', GCS_SESSION_URL);

		vi.spyOn(globalThis, 'fetch').mockImplementation(
			(_url, options) =>
				new Promise((_resolve, reject) => {
					options?.signal?.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError'))
					);
				})
		);

		const {result} = renderHook(() => useGCSUploadFile());

		let pending: ReturnType<typeof result.current.uploadFile> =
			Promise.resolve({success: true});

		await act(async () => {
			pending = result.current.uploadFile(uploadParams(1000));
		});

		act(() => result.current.abortUpload());

		let response;

		await act(async () => {
			response = await pending;
		});

		expect(response).toEqual({success: false});
		expect(completeUpload).not.toHaveBeenCalled();
		expect(sessionStorage.getItem('gcsSessionURL:md5-abc')).toBeNull();
		expect(result.current.progress).toBe(0);
		expect(result.current.loading).toBe(false);
	});

	it('maps a 409 to ATTACHMENT_ALREADY_EXISTS', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
		} as Response);

		completeUpload.mockRejectedValue({status: 409});

		const {result} = renderHook(() => useGCSUploadFile());

		let response;

		await act(async () => {
			response = await result.current.uploadFile(uploadParams(1000));
		});

		expect(response).toEqual({
			success: false,
			uploadProperties: expect.objectContaining({
				errorCode: 'ATTACHMENT_ALREADY_EXISTS',
				ticketId: 'LRSD-1',
				uploadProjectKey: 'LRSD',
			}),
		});
		expect(result.current.progress).toBe(0);
	});

	it('maps any other failure to UNEXPECTED_ERROR and resets progress', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
		} as Response);

		completeUpload.mockRejectedValue(new Error('complete failed'));

		const {result} = renderHook(() => useGCSUploadFile());

		let response;

		await act(async () => {
			response = await result.current.uploadFile(uploadParams(1000));
		});

		expect(response).toEqual({
			success: false,
			uploadProperties: {
				errorCode: 'UNEXPECTED_ERROR',
				errorMessage: 'Error: complete failed',
				ticketId: 'LRSD-1',
				uploadProjectKey: 'LRSD',
			},
		});
		expect(result.current.progress).toBe(0);
		expect(result.current.loading).toBe(false);
	});
});
