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

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

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
	await presetCookieConsent(page);

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

	await dismissCookieBanner(page);
}

/**
 * Records cookie consent in the browser context before the first page loads,
 * so the consent banner never covers the bottom of the viewport. The portal
 * deletes USER_CONSENT_CONFIGURED on the next request unless every optional
 * consent type is present (CookiesPreAction), which is why declining the
 * banner does not keep it away.
 */

export async function presetCookieConsent(page: Page) {
	const url = new URL(page.url().startsWith('http') ? page.url() : BASE_URL);

	await page.context().addCookies(
		[
			'CONSENT_TYPE_FUNCTIONAL',
			'CONSENT_TYPE_NECESSARY',
			'CONSENT_TYPE_PERFORMANCE',
			'CONSENT_TYPE_PERSONALIZATION',
			'USER_CONSENT_CONFIGURED',
		].map((name) => ({
			domain: url.hostname,
			name,
			path: '/',
			value: 'true',
		}))
	);
}

/**
 * Accepts the cookie consent banner when it renders anyway, which
 * presetCookieConsent normally prevents.
 */

export async function dismissCookieBanner(page: Page) {
	const acceptButton = page.getByRole('button', {name: 'Accept All'});

	const isBannerShown = await acceptButton
		.waitFor({state: 'visible', timeout: 3000})
		.then(() => true)
		.catch(() => false);

	if (isBannerShown) {
		await acceptButton.click();
	}
}

export async function liferayLogout(page: Page) {
	await page.goto('/c/portal/logout');
}
