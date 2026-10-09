/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, waitFor} from '@testing-library/react';
import {useParams} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useCheckAttachmentAccess from './useCheckAttachmentAccess';

const {FromUserAgentApplication, liferayFetch, oauth2Fetch} = vi.hoisted(
	() => ({
		FromUserAgentApplication: vi.fn(),
		liferayFetch: vi.fn(),
		oauth2Fetch: vi.fn(),
	})
);

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication,
}));

vi.mock('react-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('react-router')>()),
	useParams: vi.fn(),
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		Util: {fetch: liferayFetch},
	},
}));

function errorResponse(body: string) {
	return {text: () => Promise.resolve(body)};
}

function mockParams(params: Record<string, string>) {
	vi.mocked(useParams).mockReturnValue(params);
}

describe('[HOOK-TICKETATTACHMENTS-USECHECKATTACHMENTACCESS] useCheckAttachmentAccess', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		FromUserAgentApplication.mockResolvedValue({fetch: oauth2Fetch});
		oauth2Fetch.mockResolvedValue({ok: true});
	});

	it('fails an upload without a ticket ID with INVALID_TICKET_NUMBER', async () => {
		mockParams({});

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			errorCode: 'INVALID_TICKET_NUMBER',
			hasAccess: false,
			loading: false,
		});
		expect(oauth2Fetch).not.toHaveBeenCalled();
	});

	it('grants upload access through the upload check endpoint', async () => {
		mockParams({ticketId: 'LRSD-1'});

		const {result} = renderHook(() => useCheckAttachmentAccess());

		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(FromUserAgentApplication).toHaveBeenCalledWith(
			'liferay-one-etc-spring-boot-oaua'
		);
		expect(oauth2Fetch).toHaveBeenCalledWith(
			'/tickets/LRSD-1/ticket-attachments/upload-access-check',
			expect.objectContaining({method: 'GET'})
		);
		expect(liferayFetch).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			errorCode: null,
			hasAccess: true,
			loading: false,
		});
	});

	it('resolves the Jira issue key from the attachment ID for a download', async () => {
		mockParams({ticketAttachmentId: '42'});
		liferayFetch.mockResolvedValue({
			json: () => Promise.resolve({jiraIssueKey: 'LRSD-7'}),
			ok: true,
		});

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(liferayFetch).toHaveBeenCalledWith(
			'/o/c/ticketattachments/42',
			expect.objectContaining({method: 'GET'})
		);
		expect(oauth2Fetch).toHaveBeenCalledWith(
			'/tickets/LRSD-7/ticket-attachments/download-access-check',
			expect.objectContaining({method: 'GET'})
		);
		expect(result.current.hasAccess).toBe(true);
		expect(result.current.errorCode).toBeNull();
	});

	it('resolves the Jira issue key from the attachment ERC for a download', async () => {
		mockParams({ticketAttachmentERC: 'ATT-ERC'});
		liferayFetch.mockResolvedValue({
			json: () => Promise.resolve({jiraIssueKey: 'LRSD-8'}),
			ok: true,
		});

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(liferayFetch).toHaveBeenCalledWith(
			'/o/c/ticketattachments/by-external-reference-code/ATT-ERC',
			expect.objectContaining({method: 'GET'})
		);
		expect(oauth2Fetch).toHaveBeenCalledWith(
			'/tickets/LRSD-8/ticket-attachments/download-access-check',
			expect.anything()
		);
		expect(result.current.hasAccess).toBe(true);
	});

	it('fails a download with INVALID_TICKET_ATTACHMENT when the attachment lookup is not ok', async () => {
		mockParams({ticketAttachmentId: '42'});
		liferayFetch.mockResolvedValue({ok: false});

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(oauth2Fetch).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			errorCode: 'INVALID_TICKET_ATTACHMENT',
			hasAccess: false,
			loading: false,
		});
	});

	it.each([
		'FORBIDDEN_ACCESS',
		'INVALID_TICKET_ATTACHMENT',
		'INVALID_TICKET_NUMBER',
		'JIRA_ORGANIZATION_ERROR',
		'TICKET_IS_CLOSED',
		'UNEXPECTED_ERROR',
	])('maps the known error code %s from the error body', async (code) => {
		mockParams({ticketId: 'LRSD-1'});
		oauth2Fetch.mockRejectedValue(errorResponse(code));

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current).toEqual({
			errorCode: code,
			hasAccess: false,
			loading: false,
		});
	});

	it('maps an unknown error body to UNEXPECTED_ERROR', async () => {
		mockParams({ticketId: 'LRSD-1'});
		oauth2Fetch.mockRejectedValue(errorResponse('Internal Server Error'));

		const {result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.errorCode).toBe('UNEXPECTED_ERROR');
		expect(result.current.hasAccess).toBe(false);
	});

	it('ignores the error code of an aborted request', async () => {
		let rejectFirst: (reason: unknown) => void = () => {};
		let resolveSecond: (value: unknown) => void = () => {};

		oauth2Fetch
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						rejectFirst = reject;
					})
			)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveSecond = resolve;
					})
			);

		mockParams({ticketId: 'LRSD-1'});

		const {rerender, result} = renderHook(() => useCheckAttachmentAccess());

		await waitFor(() => expect(oauth2Fetch).toHaveBeenCalledTimes(1));

		const [, firstOptions] = oauth2Fetch.mock.calls[0];

		mockParams({ticketId: 'LRSD-2'});

		rerender();

		expect((firstOptions.signal as AbortSignal).aborted).toBe(true);

		await waitFor(() => expect(oauth2Fetch).toHaveBeenCalledTimes(2));

		await act(async () => {
			rejectFirst(errorResponse('FORBIDDEN_ACCESS'));
		});

		resolveSecond({ok: true});

		await waitFor(() => expect(result.current.hasAccess).toBe(true));

		expect(oauth2Fetch).toHaveBeenLastCalledWith(
			'/tickets/LRSD-2/ticket-attachments/upload-access-check',
			expect.anything()
		);
		expect(result.current.errorCode).toBeNull();
	});
});
