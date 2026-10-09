/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';

const ticketId = process.env.ONE_TICKET_ID ?? '1';
const attachmentId = process.env.ONE_ATTACHMENT_ID ?? '1';
const attachmentERC = process.env.ONE_ATTACHMENT_ERC ?? 'ATTACH-001';
const foreignTicketId = process.env.ONE_FOREIGN_TICKET_ID ?? '2';

function signedURLExpirySeconds(url: string): number {
	return Number(new URL(url).searchParams.get('X-Goog-Expires'));
}

test.describe.fixme('[FLOW-TICKET-DOWNLOAD] ticket attachment download', () => {
	test('[FLOW-TICKET-DOWNLOAD] [REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD] returns a short-lived signed URL by id', async ({
		api,
	}) => {
		const response = await api.send(
			'get',
			`/o/one/v1/ticket-attachments/by-id/${attachmentId}/download`
		);

		expect(response.status(), await response.text()).toBe(200);

		const url = await response.text();

		expect(url).toMatch(/^https:\/\//);
		expect(signedURLExpirySeconds(url)).toBeLessThanOrEqual(900);
	});

	test('[FLOW-TICKET-DOWNLOAD] [REST-GET-TICKET-ATTACHMENTS-BY-EXTERNAL-REFERENCE-CODE-EXTERNALREFERENCECODE-DOWNLOAD] returns a signed URL by external reference code', async ({
		api,
	}) => {
		const response = await api.send(
			'get',
			`/o/one/v1/ticket-attachments/by-external-reference-code/${attachmentERC}/download`
		);

		expect(response.status(), await response.text()).toBe(200);
		expect(await response.text()).toMatch(/^https:\/\//);
	});

	test('[FLOW-TICKET-DOWNLOAD] [REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-DOWNLOAD-ACCESS-CHECK] allows a member', async ({
		api,
	}) => {
		const response = await api.send(
			'get',
			`/o/one/v1/tickets/${ticketId}/ticket-attachments/download-access-check`
		);

		expect(response.status(), await response.text()).toBe(200);
	});

	test('[FLOW-TICKET-DOWNLOAD] rejects an unknown ticket with 404', async ({
		api,
	}) => {
		const response = await api.send(
			'get',
			'/o/one/v1/tickets/NOT-A-TICKET/ticket-attachments/download-access-check'
		);

		expect(response.status()).toBe(404);
		expect(await response.text()).toBe('INVALID_TICKET_NUMBER');
	});

	test('[FLOW-TICKET-DOWNLOAD] denies a non-member with 403', async ({
		request,
	}) => {
		const response = await downloadAccessCheckAsNonMember(
			request,
			foreignTicketId
		);

		expect(response.status(), await response.text()).toBe(403);
		expect(await response.text()).toBe('FORBIDDEN_ACCESS');
	});
});

async function downloadAccessCheckAsNonMember(
	request: APIRequestContext,
	ticket: string
) {
	const baseURL = process.env.BASE_URL ?? 'http://localhost:8080';

	const tokenResponse = await request.post(`${baseURL}/o/oauth2/token`, {
		form: {
			client_id: process.env.ONE_NON_MEMBER_CLIENT_ID ?? '',
			client_secret: process.env.ONE_NON_MEMBER_CLIENT_SECRET ?? '',
			grant_type: 'client_credentials',
		},
	});

	const {access_token} = (await tokenResponse.json()) as {
		access_token: string;
	};

	return request.get(
		`${baseURL}/o/one/v1/tickets/${ticket}/ticket-attachments/download-access-check`,
		{headers: {Authorization: `Bearer ${access_token}`}}
	);
}
