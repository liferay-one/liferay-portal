/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import useTicketAttachmentsDelete from './useTicketAttachmentsDelete';

const GCS_SESSION_URL = 'https://storage.googleapis.com/upload/session';

const params = {gcsSessionURL: GCS_SESSION_URL, ticketAttachmentId: '77'};

describe('[HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSDELETE] useTicketAttachmentsDelete', () => {
	beforeEach(() => {
		Liferay.authToken = 'csrf-token';
	});

	afterEach(() => {
		Liferay.authToken = '';

		vi.restoreAllMocks();
	});

	it('deletes the attachment object with the CSRF token and then the GCS session', async () => {
		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({ok: true} as Response)
			.mockResolvedValueOnce({status: 499} as Response);

		const {result} = renderHook(() => useTicketAttachmentsDelete());

		await act(() => result.current.deleteAttachment(params));

		expect(fetch).toHaveBeenNthCalledWith(
			1,
			`${window.location.origin}/o/c/ticketattachments/77`,
			{
				headers: {'x-csrf-token': 'csrf-token'},
				method: 'DELETE',
			}
		);
		expect(fetch).toHaveBeenNthCalledWith(2, GCS_SESSION_URL, {
			headers: {'Content-Length': '0'},
			method: 'DELETE',
		});
		expect(result.current.loading).toBe(false);
	});

	it('stops before the GCS delete and swallows the error when the attachment delete is not ok', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: false,
			text: () => 'failed',
		} as unknown as Response);

		const {result} = renderHook(() => useTicketAttachmentsDelete());

		await act(() => result.current.deleteAttachment(params));

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(result.current.loading).toBe(false);
	});

	it('swallows a GCS delete that does not return 499', async () => {
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({ok: true} as Response)
			.mockResolvedValueOnce({
				status: 500,
				text: () => 'failed',
			} as unknown as Response);

		const {result} = renderHook(() => useTicketAttachmentsDelete());

		await act(() =>
			expect(
				result.current.deleteAttachment(params)
			).resolves.toBeUndefined()
		);

		expect(result.current.loading).toBe(false);
	});

	it('swallows a thrown request error and clears loading', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

		const {result} = renderHook(() => useTicketAttachmentsDelete());

		await act(() =>
			expect(
				result.current.deleteAttachment(params)
			).resolves.toBeUndefined()
		);

		expect(result.current.loading).toBe(false);
	});
});
