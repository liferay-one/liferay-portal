/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const staffEmail = process.env.ONE_STAFF_EMAIL ?? 'test@liferay.com';
const staffPassword = process.env.ONE_STAFF_PASSWORD ?? 'test';

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page, staffEmail, staffPassword);
});

test.describe.fixme(
	'[FLOW-ADMIN-DASHBOARD] marketplace admin dashboard',
	() => {
		test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-SUMMARY] renders the dashboard for staff', async ({
			page,
		}) => {
			const spaPage = new SPAPage(page, '/web/one/admin#/mp-summary');

			await spaPage.goto();

			await expect(spaPage.customElement.first()).toBeAttached();

			await expect(page.getByText(/restricted page/i)).toHaveCount(0);
			await expect(
				page.getByRole('heading', {name: /administrator dashboard/i})
			).toBeVisible({timeout: 30000});
		});

		test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] paginates, sorts, and filters the orders table', async ({
			page,
		}) => {
			const spaPage = new SPAPage(page, '/web/one/admin#/mp-orders');

			await spaPage.goto();

			const table = page.getByRole('table');

			await expect(table).toBeVisible({timeout: 30000});

			const firstRowBefore = await table
				.getByRole('row')
				.nth(1)
				.textContent();

			await page.getByRole('columnheader', {name: /date/i}).click();

			await expect
				.poll(async () => table.getByRole('row').nth(1).textContent())
				.not.toBe(firstRowBefore);

			await page
				.getByRole('button', {name: /next|2/i})
				.first()
				.click();

			await expect(table.getByRole('row')).not.toHaveCount(1);
		});
	}
);
