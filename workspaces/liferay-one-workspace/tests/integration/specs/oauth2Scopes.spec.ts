/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect, test} from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:8080';

const scopedRequests = [
	{
		method: 'get',
		path: '/o/one/v1/accounts/ACCNT-001/jira/object-key',
		scope: 'customer.read',
	},
	{
		method: 'get',
		path: '/o/one/v1/jira/accounts/ACCNT-001/tickets',
		scope: 'ticket.read',
	},
	{
		method: 'get',
		path: '/o/one/v1/jira/accounts/ACCNT-001/business-events',
		scope: 'ticket.read',
	},
	{
		method: 'post',
		path: '/o/one/v1/ticket-attachments/initiate-upload',
		scope: 'ticket.write',
	},
	{
		method: 'post',
		path: '/o/one/v1/jira/accounts/ACCNT-001/business-events',
		scope: 'ticket.write',
	},
] as const;

async function tokenFor(
	request: APIRequestContext,
	scope: string
): Promise<string> {
	const response = await request.post(`${baseURL}/o/oauth2/token`, {
		form: {
			client_id: process.env.OAUTH_CLIENT_ID ?? '',
			client_secret: process.env.OAUTH_CLIENT_SECRET ?? '',
			grant_type: 'client_credentials',
			scope,
		},
	});

	expect(response.ok(), await response.text()).toBeTruthy();

	return ((await response.json()) as {access_token: string}).access_token;
}

test.describe.fixme('[AUTH-OAUTH2-SCOPES] OAuth2 scope enforcement', () => {
	for (const {method, path, scope} of scopedRequests) {
		test(`[AUTH-OAUTH2-SCOPES] ${method.toUpperCase()} ${path} requires ${scope}`, async ({
			request,
		}) => {
			const granted = await tokenFor(request, scope);

			const allowed = await request[method](`${baseURL}${path}`, {
				headers: {Authorization: `Bearer ${granted}`},
			});

			expect([401, 403]).not.toContain(allowed.status());

			const denied = await tokenFor(request, 'openid');

			const rejected = await request[method](`${baseURL}${path}`, {
				headers: {Authorization: `Bearer ${denied}`},
			});

			expect(rejected.status(), await rejected.text()).toBe(403);
		});
	}
});
