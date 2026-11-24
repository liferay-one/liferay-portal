/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIResponse, expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';
import {fetchUserAgentToken} from '../helpers/fetchUserAgentToken';

const FOREIGN_ACCOUNT_ERC = 'ACCNT-002';

const LINKED_ACCOUNT_ERC = 'ACCNT-018';

const ORGANIZATION_MEMBER_EMAIL = 'admin@partner.com';

const PERSONA_PASSWORD = process.env.ONE_PERSONA_PASSWORD?.trim() || 'test';

type Account = {externalReferenceCode: string; id: number};

type Order = {accountExternalReferenceCode: string; id: number};

let admin: APIHelpers;
let channelId: string;
let foreignOrderId: number;
let linkedAccount: Account;
let linkedOrderId: number;
let member: APIHelpers;
let memberToken: string;
let organizationId: number;

function sendSpringBoot(path: string): Promise<APIResponse> {
	return member.request.get(member.springBoot(path), {
		headers: {Authorization: `Bearer ${memberToken}`},
	});
}

test.describe('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] organization linked account reads', () => {
	test.describe.configure({mode: 'serial'});

	test.beforeAll(async ({playwright}) => {
		admin = new APIHelpers(await playwright.request.newContext(), {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			},
		});

		linkedAccount = await admin.get<Account>(
			`/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${LINKED_ACCOUNT_ERC}?fields=externalReferenceCode,id`
		);

		const {items: orders} = await admin.get<HeadlessPage<Order>>(
			'/o/headless-commerce-admin-order/v1.0/orders?fields=accountExternalReferenceCode,channelId,id&pageSize=200'
		);

		const linkedOrder = orders.find(
			(order) => order.accountExternalReferenceCode === LINKED_ACCOUNT_ERC
		) as (Order & {channelId: number}) | undefined;

		const foreignOrder = orders.find(
			(order) => order.accountExternalReferenceCode !== LINKED_ACCOUNT_ERC
		);

		expect(linkedOrder, 'The linked account has no order').toBeTruthy();
		expect(foreignOrder, 'No order of another account').toBeTruthy();

		channelId = String(linkedOrder!.channelId);
		foreignOrderId = foreignOrder!.id;
		linkedOrderId = linkedOrder!.id;

		({id: organizationId} = await admin.post<{id: number}>(
			'/o/headless-admin-user/v1.0/organizations',
			{name: `LPD-115540 Organization ${Date.now()}`}
		));

		const linkResponse = await admin.send(
			'post',
			`/o/headless-admin-user/v1.0/organizations/${organizationId}/accounts/by-external-reference-code`,
			[LINKED_ACCOUNT_ERC]
		);

		expect(linkResponse.ok(), await linkResponse.text()).toBeTruthy();

		const memberResponse = await admin.send(
			'post',
			`/o/headless-admin-user/v1.0/organizations/${organizationId}/user-accounts/by-email-address/${encodeURIComponent(ORGANIZATION_MEMBER_EMAIL)}`
		);

		expect(memberResponse.ok(), await memberResponse.text()).toBeTruthy();

		member = new APIHelpers(await playwright.request.newContext(), {
			basicAuth: {
				password: PERSONA_PASSWORD,
				user: ORGANIZATION_MEMBER_EMAIL,
			},
		});

		memberToken = await fetchUserAgentToken(
			await playwright.request.newContext(),
			{
				baseURL: admin.baseURL,
				password: PERSONA_PASSWORD,
				user: ORGANIZATION_MEMBER_EMAIL,
			}
		);
	});

	test.afterAll(async () => {
		if (!organizationId) {
			return;
		}

		await admin.send(
			'delete',
			`/o/headless-admin-user/v1.0/organizations/${organizationId}/user-accounts/by-email-address/${encodeURIComponent(ORGANIZATION_MEMBER_EMAIL)}`
		);
		await admin.send(
			'delete',
			`/o/headless-admin-user/v1.0/organizations/${organizationId}/accounts/by-external-reference-code`,
			[LINKED_ACCOUNT_ERC]
		);
		await admin.send(
			'delete',
			`/o/headless-admin-user/v1.0/organizations/${organizationId}`
		);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] a member of a linked organization who is not an account member lists the account and its projects', async () => {
		const {accountBriefs} = await member.get<{
			accountBriefs: {externalReferenceCode: string}[];
		}>('/o/headless-admin-user/v1.0/my-user-account');

		expect(
			accountBriefs.map(
				({externalReferenceCode}) => externalReferenceCode
			)
		).not.toContain(LINKED_ACCOUNT_ERC);

		const {items: accounts} = await member.get<HeadlessPage<Account>>(
			'/o/headless-admin-user/v1.0/accounts?fields=externalReferenceCode&pageSize=200'
		);

		expect(
			accounts.map(({externalReferenceCode}) => externalReferenceCode)
		).toContain(LINKED_ACCOUNT_ERC);

		const {totalCount} = await member.get<HeadlessPage<unknown>>(
			`/o/c/projects?fields=id&filter=r_accountEntryToProject_accountEntryId eq '${linkedAccount.id}'&pageSize=1`
		);

		expect(totalCount).toBeGreaterThan(0);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] the member cannot update the linked account', async () => {
		const response = await member.send(
			'patch',
			`/o/headless-admin-user/v1.0/accounts/${linkedAccount.id}`,
			{description: 'LPD-115540'}
		);

		expect(response.status()).toBe(403);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] [REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-PLACED-ORDERS] the member reads the orders of the linked account through Spring Boot, not from the portal', async () => {
		const portalResponse = await member.send(
			'get',
			`/o/headless-commerce-delivery-order/v1.0/channels/${channelId}/accounts/${linkedAccount.id}/placed-orders`
		);

		expect(portalResponse.status()).toBe(404);

		const springBootResponse = await sendSpringBoot(
			`/accounts/${LINKED_ACCOUNT_ERC}/placed-orders?channelId=${channelId}`
		);

		expect(
			springBootResponse.status(),
			await springBootResponse.text()
		).toBe(200);

		const {items} = (await springBootResponse.json()) as HeadlessPage<{
			id: number;
		}>;

		expect(items.map(({id}) => id)).toContain(linkedOrderId);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] [REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-PLACED-ORDERS] the member reads only the orders of one order type, and an invalid order type answers 400', async () => {
		const response = await sendSpringBoot(
			`/accounts/${LINKED_ACCOUNT_ERC}/placed-orders?channelId=${channelId}&orderTypeExternalReferenceCode=AI_HUB_TOKEN`
		);

		expect(response.status(), await response.text()).toBe(200);

		const {items} = (await response.json()) as HeadlessPage<{
			orderTypeExternalReferenceCode: string;
		}>;

		for (const {orderTypeExternalReferenceCode} of items) {
			expect(orderTypeExternalReferenceCode).toBe('AI_HUB_TOKEN');
		}

		const invalidResponse = await sendSpringBoot(
			`/accounts/${LINKED_ACCOUNT_ERC}/placed-orders?channelId=${channelId}&orderTypeExternalReferenceCode=${encodeURIComponent("AI_HUB' or 1 eq 1")}`
		);

		expect(invalidResponse.status()).toBe(400);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] [REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-PLACED-ORDERS-PLACEDORDERID] the member reads one order of the linked account and no order of another account', async () => {
		const linkedOrderResponse = await sendSpringBoot(
			`/accounts/${LINKED_ACCOUNT_ERC}/placed-orders/${linkedOrderId}`
		);

		expect(
			linkedOrderResponse.status(),
			await linkedOrderResponse.text()
		).toBe(200);
		expect(((await linkedOrderResponse.json()) as {id: number}).id).toBe(
			linkedOrderId
		);

		const foreignOrderResponse = await sendSpringBoot(
			`/accounts/${LINKED_ACCOUNT_ERC}/placed-orders/${foreignOrderId}`
		);

		expect(foreignOrderResponse.status()).toBe(404);
	});

	test('[AUTH-ORGANIZATION-LINKED-ACCOUNT-READS] the member reads no order of an account that is not linked to the organization', async () => {
		const response = await sendSpringBoot(
			`/accounts/${FOREIGN_ACCOUNT_ERC}/placed-orders?channelId=${channelId}`
		);

		expect([403, 404]).toContain(response.status());
	});
});
