/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const publisherEmail = process.env.ONE_PUBLISHER_EMAIL ?? 'test@liferay.com';
const publisherPassword = process.env.ONE_PUBLISHER_PASSWORD ?? 'test';

const dashboardBase = '/web/one/my-account/publisher-dashboard';

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page, publisherEmail, publisherPassword);
});

test.describe.fixme('[FLOW-PUBLISHER-ONBOARDING] publisher onboarding', () => {
	test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-EDIT] edits the profile and uploads a logo', async ({
		page,
	}) => {
		const spaPage = new SPAPage(
			page,
			`${dashboardBase}#/publisher-profile`
		);

		await spaPage.goto();

		await expect(spaPage.customElement.first()).toBeAttached();

		await page.getByRole('button', {name: /edit/i}).click();

		await page.getByLabel(/description/i).fill('Trusted Liferay partner');

		await page.locator('input[type="file"]').setInputFiles({
			buffer: Buffer.from('logo bytes'),
			mimeType: 'image/png',
			name: 'logo.png',
		});

		await page.getByRole('button', {name: /save/i}).click();

		await expect(page.getByText(/trusted liferay partner/i)).toBeVisible();
	});

	test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] lists published apps and solutions', async ({
		page,
	}) => {
		const appsPage = new SPAPage(page, `${dashboardBase}#/published-apps`);

		await appsPage.goto();

		await expect(page.getByRole('table')).toBeVisible({timeout: 30000});

		const solutionsPage = new SPAPage(
			page,
			`${dashboardBase}#/published-solutions`
		);

		await solutionsPage.goto();

		await expect(page.getByRole('table')).toBeVisible({timeout: 30000});
	});
});
