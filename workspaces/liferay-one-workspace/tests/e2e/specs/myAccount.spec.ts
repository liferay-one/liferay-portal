/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const entitledEmail = process.env.ONE_ENTITLED_EMAIL ?? 'test@liferay.com';
const entitledPassword = process.env.ONE_ENTITLED_PASSWORD ?? 'test';
const accountERC = process.env.ONE_ACCOUNT_ERC ?? 'ACCNT-001';

const inviteEmail = 'teammate@liferay.com';

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page, entitledEmail, entitledPassword);
});

test.describe.fixme('[FLOW-MY-ACCOUNT-OVERVIEW] my account overview', () => {
	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERS] renders projects, orders, and billing', async ({
		page,
	}) => {
		const spaPage = new SPAPage(page, '/web/one/my-account');

		await spaPage.goto();

		await expect(spaPage.customElement.first()).toBeAttached();

		await expect(page.getByText(/restricted page/i)).toHaveCount(0);

		const ordersPage = new SPAPage(
			page,
			`/web/one/my-account#/${accountERC}/orders`
		);

		await ordersPage.goto();

		await expect(page.getByRole('table')).toBeVisible({timeout: 30000});
	});
});

test.describe.fixme(
	'[FLOW-ACCOUNT-TEAM-MEMBERS] account team management',
	() => {
		test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] invites, re-roles, and removes a member', async ({
			page,
		}) => {
			const membersPage = new SPAPage(
				page,
				`/web/one/my-account#/${accountERC}/account-members`
			);

			await membersPage.goto();

			await expect(page.getByRole('table')).toBeVisible({timeout: 30000});

			await page.getByRole('button', {name: /invite/i}).click();
			await page.getByLabel(/email/i).fill(inviteEmail);
			await page.getByRole('button', {name: /send|invite|add/i}).click();

			const memberRow = page.getByRole('row', {
				name: new RegExp(inviteEmail, 'i'),
			});

			await expect(memberRow).toBeVisible();

			await memberRow.getByRole('button').last().click();
			await page.getByRole('menuitem', {name: /administrator/i}).click();

			await expect(memberRow.getByText(/administrator/i)).toBeVisible();

			await memberRow.getByRole('button').last().click();
			await page.getByRole('menuitem', {name: /remove/i}).click();
			await page
				.getByRole('button', {name: /confirm|remove|ok/i})
				.click();

			await expect(memberRow).toHaveCount(0);
		});
	}
);
