/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useTicketAttachmentsInitiateUpload from './useTicketAttachmentsInitiateUpload';

const {FromUserAgentApplication, oauth2Fetch} = vi.hoisted(() => ({
	FromUserAgentApplication: vi.fn(),
	oauth2Fetch: vi.fn(),
}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication,
}));

const params = {
	fileMd5: 'md5-abc',
	fileName: 'server.log',
	fileSize: '1000',
	ticketId: 'LRSD-1',
};

async function initiateUpload() {
	const {result} = renderHook(() => useTicketAttachmentsInitiateUpload());

	let response;

	await act(async () => {
		response = await result.current.initiateUpload(params);
	});

	return {response, result};
}

describe('[HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSINITIATEUPLOAD] useTicketAttachmentsInitiateUpload', () => {
	beforeEach(() => {
		FromUserAgentApplication.mockResolvedValue({fetch: oauth2Fetch});
	});

	afterEach(() => {
		sessionStorage.clear();

		vi.clearAllMocks();
	});

	it('sends the stored GCS session URL and stores the returned session in state and session storage', async () => {
		sessionStorage.setItem('gcsSessionURL:md5-abc', 'https://gcs/old');

		oauth2Fetch.mockResolvedValue({
			json: () =>
				Promise.resolve({
					gcsSessionURL: 'https://gcs/new',
					projectKey: 'LRSD',
					ticketAttachmentId: '77',
				}),
		});

		const {response, result} = await initiateUpload();

		const [url, options] = oauth2Fetch.mock.calls[0];

		expect(url).toBe('/ticket-attachments/initiate-upload');
		expect(options.method).toBe('POST');
		expect(options.signal).toBeInstanceOf(AbortSignal);
		expect(JSON.parse(options.body)).toEqual({
			fileName: 'server.log',
			fileSize: '1000',
			gcsSessionURL: 'https://gcs/old',
			md5Checksum: 'md5-abc',
			ticketId: 'LRSD-1',
		});
		expect(response).toEqual({
			success: true,
			uploadProperties: {
				gcsSessionURL: 'https://gcs/new',
				projectKey: 'LRSD',
				ticketAttachmentId: '77',
			},
		});
		expect(sessionStorage.getItem('gcsSessionURL:md5-abc')).toBe(
			'https://gcs/new'
		);
		expect(result.current).toEqual(
			expect.objectContaining({
				gcsSessionURL: 'https://gcs/new',
				loading: false,
				ticketAttachmentId: '77',
			})
		);
	});

	it('returns failure silently when the request is aborted', async () => {
		oauth2Fetch.mockRejectedValue({name: 'AbortError'});

		const {response, result} = await initiateUpload();

		expect(response).toEqual({success: false});
		expect(result.current.loading).toBe(false);
	});

	it('maps a 409 to ATTACHMENT_ALREADY_EXISTS', async () => {
		oauth2Fetch.mockRejectedValue({status: 409});

		const {response} = await initiateUpload();

		expect(response).toEqual({
			success: false,
			uploadProperties: {
				attachmentName: 'server.log',
				errorCode: 'ATTACHMENT_ALREADY_EXISTS',
				ticketId: 'LRSD-1',
			},
		});
	});

	it('maps any other error to UNEXPECTED_ERROR', async () => {
		oauth2Fetch.mockRejectedValue(new Error('boom'));

		const {response, result} = await initiateUpload();

		expect(response).toEqual({
			success: false,
			uploadProperties: {
				errorCode: 'UNEXPECTED_ERROR',
				errorMessage: 'Error: boom',
			},
		});
		expect(result.current.gcsSessionURL).toBe('');
	});
});
