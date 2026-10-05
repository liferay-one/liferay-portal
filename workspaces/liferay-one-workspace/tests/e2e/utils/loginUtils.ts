/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {LoginPage} from '../pages/LoginPage';

type LiferayWindow = {
	Liferay?: {ThemeDisplay?: {isSignedIn?: () => boolean}};
};

function isSignedIn(page: Page): Promise<boolean> {
	return page
		.evaluate(() => {
			const {Liferay} = window as unknown as LiferayWindow;

			return Boolean(Liferay?.ThemeDisplay?.isSignedIn?.());
		})
		.catch(() => false);
}

export async function liferayLogin(
	page: Page,
	email: string = DEFAULT_ADMIN_EMAIL,
	password: string = DEFAULT_ADMIN_PASSWORD
) {
	const loginPage = new LoginPage(page);

	await loginPage.goto();
	await loginPage.emailField.fill(email);
	await loginPage.passwordField.fill(password);
	await loginPage.signInButton.click();

	await expect
		.poll(() => isSignedIn(page), {
			message: 'expected the portal session to be signed in',
		})
		.toBe(true);
}

export async function liferayLogout(page: Page) {
	await page.goto('/c/portal/logout');
}
