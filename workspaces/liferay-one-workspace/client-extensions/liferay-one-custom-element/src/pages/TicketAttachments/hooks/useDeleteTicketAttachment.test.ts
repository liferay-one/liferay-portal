/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import useDeleteTicketAttachment from './useDeleteTicketAttachment';

const {FromUserAgentApplication, oauth2Fetch} = vi.hoisted(() => ({
	FromUserAgentApplication: vi.fn(),
	oauth2Fetch: vi.fn(),
}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication,
}));

describe('[HOOK-TICKETATTACHMENTS-USEDELETETICKETATTACHMENT] useDeleteTicketAttachment', () => {
	beforeEach(() => {
		FromUserAgentApplication.mockResolvedValue({fetch: oauth2Fetch});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('shows the success toast and refetches on a 200 response', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const refetch = vi.fn();

		oauth2Fetch.mockResolvedValue({status: 200});

		const {result} = renderHook(() => useDeleteTicketAttachment(refetch));

		await act(() => result.current.deleteAttachment(12));

		expect(oauth2Fetch).toHaveBeenCalledWith('/ticket-attachments/12', {
			method: 'DELETE',
		});
		expect(openToast).toHaveBeenCalledWith({
			message: 'Attachment deleted successfully.',
			type: 'success',
		});
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(result.current.loading).toBe(false);
	});

	it('shows the danger toast without refetching on any other status', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const refetch = vi.fn();

		oauth2Fetch.mockResolvedValue({status: 204});

		const {result} = renderHook(() => useDeleteTicketAttachment(refetch));

		await act(() => result.current.deleteAttachment(12));

		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
		expect(refetch).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(false);
	});

	it('shows the danger toast without refetching when the request throws', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const refetch = vi.fn();

		oauth2Fetch.mockRejectedValue(new Error('network'));

		const {result} = renderHook(() => useDeleteTicketAttachment(refetch));

		await act(() => result.current.deleteAttachment(12));

		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
		expect(refetch).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(false);
	});
});
