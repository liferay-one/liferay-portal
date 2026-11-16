/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {expect, oneTest as test} from '../fixtures/oneTest';
import {LoginPage} from '../pages/LoginPage';
import {sitePath} from '../utils/environmentUtils';
import {dismissCookieBanner, presetCookieConsent} from '../utils/loginUtils';

test.describe('[FLOW-SITE-IDENTITY] site title and landing page', () => {
	test('[FLOW-SITE-IDENTITY] the home page title names Liferay One', async ({
		page,
	}) => {
		await page.goto(sitePath('/home'));

		await expect(page).toHaveTitle('Home - Liferay One');

		expect(await page.title()).not.toContain('one.liferay.net');
	});

	test('[FLOW-SITE-IDENTITY] signing in with no redirect lands on the One home page', async ({
		page,
	}) => {
		await presetCookieConsent(page);

		const loginPage = new LoginPage(page);

		await loginPage.goto();

		expect(new URL(page.url()).search).not.toContain('redirect');

		await loginPage.emailField.fill(DEFAULT_ADMIN_EMAIL);
		await loginPage.passwordField.fill(DEFAULT_ADMIN_PASSWORD);
		await loginPage.signInButton.click();

		await expect
			.poll(() => new URL(page.url()).pathname)
			.toMatch(/\/home$/);

		expect(new URL(page.url()).pathname).not.toContain('/web/guest');

		await dismissCookieBanner(page);

		await expect(page.locator('#account-menu-id')).toBeVisible();
	});
});
