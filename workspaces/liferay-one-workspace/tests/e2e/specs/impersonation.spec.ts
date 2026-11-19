/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, Request} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI, {HeadlessPage} from '../utils/HeadlessAPI';
import {
	ACCOUNT_ERC,
	PROJECT_ERC,
	SSA_ACCOUNT_ERC,
	uniqueName,
} from '../utils/environmentUtils';
import getPersona from '../utils/getPersona';
import {gotoMyAccountAs, impersonate} from '../utils/impersonationUtils';
import {expectToast, gotoMyAccount, tableRow} from '../utils/myAccountUtils';

async function deleteInvitations(adminAPI: HeadlessAPI, emailAddress: string) {
	const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
		`/o/c/accountinvitations?filter=${encodeURIComponent(
			`emailAddress eq '${emailAddress}'`
		)}`
	);

	for (const {id} of items) {
		await adminAPI.deleteIfExists(`/o/c/accountinvitations/${id}`);
	}
}

function isLiferayRequest(page: Page, request: Request) {
	const url = new URL(request.url());

	return (
		url.origin === new URL(page.url()).origin &&
		url.pathname.startsWith('/o/') &&
		!url.pathname.startsWith('/o/oauth2/')
	);
}

function isSpringBootRequest(page: Page, request: Request) {
	const url = new URL(request.url());

	return (
		url.origin !== new URL(page.url()).origin &&
		Boolean(request.headers().authorization?.startsWith('Bearer '))
	);
}

function ordersTableRows(page: Page) {
	return page.locator('.orders-table tbody tr');
}

test.describe('[FLOW-IMPERSONATION] impersonation', () => {
	test.beforeEach(async ({signIn}) => {
		await signIn('ADMINISTRATOR');
	});

	test('[FLOW-IMPERSONATION] [ROUTE-MY-ACCOUNT-ORDERS] shows the pages of the impersonated user and then the pages of the administrator again', async ({
		adminAPI,
		page,
	}) => {
		await gotoMyAccount(page, `${ACCOUNT_ERC}/orders`);

		await expect(ordersTableRows(page).first()).toBeVisible();

		const impersonation = await impersonate(
			adminAPI,
			page,
			getPersona('NULL_ROLE')
		);

		await gotoMyAccountAs(impersonation, `${ACCOUNT_ERC}/orders`);

		await expect(
			impersonation.page.getByText('You do not have access to this page.')
		).toBeVisible();

		await expect(ordersTableRows(impersonation.page)).toHaveCount(0);

		await gotoMyAccount(impersonation.page, `${ACCOUNT_ERC}/orders`);

		await expect(ordersTableRows(impersonation.page).first()).toBeVisible();

		await expect(
			impersonation.page.getByText('You do not have access to this page.')
		).toHaveCount(0);
	});

	test('[FLOW-IMPERSONATION] [ROUTE-MY-ACCOUNT-PRODUCTS] sends the impersonated user with each Liferay and Spring Boot request', async ({
		adminAPI,
		page,
	}) => {
		const impersonation = await impersonate(
			adminAPI,
			page,
			getPersona('ACCOUNT_ADMIN')
		);

		const liferayRequests: Request[] = [];
		const springBootRequests: Request[] = [];

		impersonation.page.on('requestfinished', (request) => {
			if (!['fetch', 'xhr'].includes(request.resourceType())) {
				return;
			}

			if (isLiferayRequest(impersonation.page, request)) {
				liferayRequests.push(request);
			}
			else if (isSpringBootRequest(impersonation.page, request)) {
				springBootRequests.push(request);
			}
		});

		await gotoMyAccountAs(
			impersonation,
			`${ACCOUNT_ERC}/project/${PROJECT_ERC}/products`
		);

		await expect(
			impersonation.page.getByText(
				'Manage the products within your project'
			)
		).toBeVisible();

		await expect(
			impersonation.page.getByRole('row').filter({hasText: 'Active'})
		).not.toHaveCount(0);

		expect(liferayRequests.length).toBeGreaterThan(0);

		for (const request of liferayRequests) {
			expect(
				new URL(request.url()).searchParams.get('doAsUserId'),
				request.url()
			).toBe(impersonation.doAsUserId);
		}

		expect(springBootRequests.length).toBeGreaterThan(0);

		for (const request of springBootRequests) {
			expect(
				new URL(request.url()).searchParams.get('doAsUserId'),
				request.url()
			).toBe(String(impersonation.userId));

			const response = await request.response();

			expect(response?.ok(), request.url()).toBe(true);
		}
	});

	test('[FLOW-IMPERSONATION] [ROUTE-MY-ACCOUNT-ACCOUNTERC] refuses an account that the impersonated user does not belong to', async ({
		adminAPI,
		page,
	}) => {
		const impersonation = await impersonate(
			adminAPI,
			page,
			getPersona('ACCOUNT_ADMIN')
		);

		await gotoMyAccountAs(
			impersonation,
			`${SSA_ACCOUNT_ERC}/account-details`
		);

		await expect(
			impersonation.page.getByText(
				'You do not have access to this account.'
			)
		).toBeVisible();
	});

	test('[FLOW-IMPERSONATION] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] invites a member and revokes the invitation as the impersonated account admin', async ({
		adminAPI,
		page,
	}) => {
		const name = uniqueName('Invitee');

		const emailAddress = `${name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '.')}@example.com`;

		try {
			const impersonation = await impersonate(
				adminAPI,
				page,
				getPersona('ACCOUNT_ADMIN')
			);

			const impersonationPage = impersonation.page;

			await gotoMyAccountAs(
				impersonation,
				`${ACCOUNT_ERC}/account-members`
			);

			await impersonationPage
				.getByRole('button', {name: 'Invite Member'})
				.click();

			const form = impersonationPage.locator('#invite-member');

			await form.locator('input[name="invites.0.givenName"]').fill(name);
			await form
				.locator('input[name="invites.0.familyName"]')
				.fill('E2E');
			await form
				.locator('input[name="invites.0.emailAddress"]')
				.fill(emailAddress);

			await impersonationPage
				.getByRole('button', {name: 'Send Invitation'})
				.click();

			await expectToast(
				impersonationPage,
				'Invitation successfully sent.'
			);

			await impersonationPage
				.locator('#account-members-search')
				.fill(emailAddress);

			const row = tableRow(impersonationPage, emailAddress);

			await expect(row).toContainText('Invited');

			await row
				.getByRole('button', {name: 'Manage User Options'})
				.click();

			await impersonationPage
				.getByRole('menuitem', {name: 'Revoke Invitation'})
				.click();

			await impersonationPage
				.getByRole('button', {name: 'Confirm'})
				.click();

			await expectToast(
				impersonationPage,
				'Invitation successfully revoked.'
			);

			await expect(row).toHaveCount(0);
		}
		finally {
			await deleteInvitations(adminAPI, emailAddress);
		}
	});
});
