/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIResponse, expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers} from '../helpers/APIHelpers';
import {fetchUserAgentToken} from '../helpers/fetchUserAgentToken';

const ACCOUNT_ERC = 'ACCNT-001';

const BLOCKED_WRITE_PATHS = [
	'/activation-keys/generate',
	'/cloud/environments/0/activation',
	'/commerce-orders/0/complete-settled',
	'/console/provisioning/0',
	'/dxp/provisioning/0',
	'/entitlements/generate',
	'/license-keys/type-free',
	'/trial/extend/0',
];

const BUYER_EMAIL = 'buyer@customer.com';

const FOREIGN_ACCOUNT_ERC = 'ACCNT-002';

const PERSONA_PASSWORD = process.env.ONE_PERSONA_PASSWORD?.trim() || 'test';

const PROVISIONING_ADMIN_EMAIL = 'provisioning@liferay.com';

let admin: APIHelpers;
let adminToken: string;
let buyerUserId: number;
let provisioningAdminToken: string;

function send(
	method: 'get' | 'post',
	path: string,
	token: string,
	doAsUserId?: number,
	body?: unknown
): Promise<APIResponse> {
	const url = new URL(admin.springBoot(path));

	if (doAsUserId) {
		url.searchParams.set('doAsUserId', String(doAsUserId));
	}

	return admin.request[method](url.toString(), {
		data: body,
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});
}

test.describe('[FLOW-IMPERSONATION-SPRING-BOOT] impersonation in the Spring Boot service', () => {
	test.beforeAll(async ({playwright}) => {
		admin = new APIHelpers(await playwright.request.newContext(), {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			},
		});

		adminToken = await fetchUserAgentToken(
			await playwright.request.newContext(),
			{
				baseURL: admin.baseURL,
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			}
		);

		provisioningAdminToken = await fetchUserAgentToken(
			await playwright.request.newContext(),
			{
				baseURL: admin.baseURL,
				password: PERSONA_PASSWORD,
				user: PROVISIONING_ADMIN_EMAIL,
			}
		);

		({id: buyerUserId} = await admin.get<{id: number}>(
			`/o/headless-admin-user/v1.0/user-accounts/by-email-address/${encodeURIComponent(BUYER_EMAIL)}`
		));
	});

	test('[FLOW-IMPERSONATION-SPRING-BOOT] [REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS] checks permissions as the impersonated user', async () => {
		const adminResponse = await send(
			'get',
			`/accounts/${FOREIGN_ACCOUNT_ERC}/invitations`,
			adminToken
		);

		expect(adminResponse.status(), await adminResponse.text()).toBe(200);

		const foreignAccountResponse = await send(
			'get',
			`/accounts/${FOREIGN_ACCOUNT_ERC}/invitations`,
			adminToken,
			buyerUserId
		);

		expect(
			foreignAccountResponse.status(),
			await foreignAccountResponse.text()
		).toBe(403);

		const ownAccountResponse = await send(
			'get',
			`/accounts/${ACCOUNT_ERC}/invitations`,
			adminToken,
			buyerUserId
		);

		expect(
			ownAccountResponse.status(),
			await ownAccountResponse.text()
		).toBe(200);
	});

	test('[FLOW-IMPERSONATION-SPRING-BOOT] [REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS] refuses a user who is not an administrator', async () => {
		const ownResponse = await send(
			'get',
			`/accounts/${ACCOUNT_ERC}/invitations`,
			provisioningAdminToken
		);

		expect(ownResponse.status(), await ownResponse.text()).toBe(200);

		const impersonationResponse = await send(
			'get',
			`/accounts/${ACCOUNT_ERC}/invitations`,
			provisioningAdminToken,
			buyerUserId
		);

		expect(
			impersonationResponse.status(),
			await impersonationResponse.text()
		).toBe(403);
	});

	test('[FLOW-IMPERSONATION-SPRING-BOOT] [REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS] lets a write request reach the controller', async () => {
		const response = await send(
			'post',
			`/accounts/${ACCOUNT_ERC}/invitations`,
			adminToken,
			buyerUserId,
			{}
		);

		expect(response.status(), await response.text()).toBe(400);
	});

	test('[FLOW-IMPERSONATION-SPRING-BOOT] [REST-POST-ENTITLEMENTS-GENERATE] [REST-POST-TRIAL-EXTEND-ID] refuses a write request that acts outside Liferay or cannot be undone', async () => {
		for (const path of BLOCKED_WRITE_PATHS) {
			const response = await send(
				'post',
				path,
				adminToken,
				buyerUserId,
				{}
			);

			expect(response.status(), path).toBe(403);
		}
	});
});
