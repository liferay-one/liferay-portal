/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useTicketAttachmentsCompleteUpload from './useTicketAttachmentsCompleteUpload';

const {FromUserAgentApplication, oauth2Fetch} = vi.hoisted(() => ({
	FromUserAgentApplication: vi.fn(),
	oauth2Fetch: vi.fn(),
}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication,
}));

const params = {
	comment: 'See attached log',
	fileMd5: 'md5-abc',
	ticketAttachmentId: '77',
};

describe('[HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSCOMPLETEUPLOAD] useTicketAttachmentsCompleteUpload', () => {
	beforeEach(() => {
		FromUserAgentApplication.mockResolvedValue({fetch: oauth2Fetch});

		sessionStorage.setItem('gcsSessionURL:md5-abc', 'https://gcs/session');
	});

	afterEach(() => {
		sessionStorage.clear();

		vi.clearAllMocks();
	});

	it('posts the comment body and clears the stored GCS session URL on success', async () => {
		oauth2Fetch.mockResolvedValue({ok: true});

		const {result} = renderHook(() => useTicketAttachmentsCompleteUpload());

		await act(() => result.current.completeUpload(params));

		expect(FromUserAgentApplication).toHaveBeenCalledWith(
			'liferay-one-etc-spring-boot-oaua'
		);
		expect(oauth2Fetch).toHaveBeenCalledWith(
			'/ticket-attachments/77/complete-upload',
			{
				body: JSON.stringify({commentBody: 'See attached log'}),
				method: 'POST',
			}
		);
		expect(sessionStorage.getItem('gcsSessionURL:md5-abc')).toBeNull();
		expect(result.current.loading).toBe(false);
	});

	it('throws and keeps the stored GCS session URL when the response is not ok', async () => {
		oauth2Fetch.mockResolvedValue({ok: false, text: () => 'failed'});

		const {result} = renderHook(() => useTicketAttachmentsCompleteUpload());

		await act(async () => {
			await expect(result.current.completeUpload(params)).rejects.toThrow(
				'Failed to complete upload'
			);
		});

		expect(sessionStorage.getItem('gcsSessionURL:md5-abc')).toBe(
			'https://gcs/session'
		);
		expect(result.current.loading).toBe(false);
	});
});
