/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {sitePath} from '../utils/environmentUtils';
import getPersona from '../utils/getPersona';
import {liferayLogin} from '../utils/loginUtils';

/**
 * The pages that mount the custom element are gated twice: the portal refuses
 * a page the user lacks VIEW on, and the custom element then decides what an
 * allowed user may see. These tests prove the first gate as a guest and as a
 * signed in customer, so a page permission dropped from the site initializer
 * fails here rather than exposing the page.
 */

const SIGN_IN_PAGES = [
	{name: 'Admin', path: '/admin', route: 'admin'},
	{name: 'My Account', path: '/my-account', route: 'my-account'},
	{name: 'OAuth2 authorize', path: '/authorize', route: 'oauth2-authorize'},
	{
		name: 'Product Purchase',
		path: '/product-purchase',
		route: 'product-purchase',
	},
	{
		name: 'Publisher Dashboard',
		path: '/my-account/publisher-dashboard',
		route: 'publisher-dashboard',
	},
	{
		name: 'Ticket Attachments',
		path: '/support/ticket-attachments',
		route: 'ticket-attachments',
	},
];

/**
 * The master page mounts the account selector on every page, so a gated page
 * is proven absent by the route of its own custom element.
 */

function pageCustomElement(page: Page, route: string) {
	return page.locator(`liferay-one-custom-element[route="${route}"]`);
}

const LOGIN_PORTLET = 'com_liferay_login_web_portlet_LoginPortlet';

/**
 * The portal answers a guest with the sign in portlet, maximized on the home
 * page, and carries the page the guest asked for in the portlet's redirect
 * parameter.
 */

async function expectSignInFor(page: Page, path: string) {
	await expect(page).toHaveURL(new RegExp(`p_p_id=${LOGIN_PORTLET}`));

	const redirect = new URL(page.url()).searchParams.get(
		`_${LOGIN_PORTLET}_redirect`
	);

	expect(redirect, 'expected sign in to return to the page').toBe(
		sitePath(path)
	);

	await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible();
}

async function expectPageNotFound(page: Page, path: string, route: string) {
	const response = await page.goto(sitePath(path));

	expect(response?.status(), `expected ${path} to be refused`).toBe(404);

	await expect(page.getByText('Page Not Found')).toBeVisible();
	await expect(pageCustomElement(page, route)).toHaveCount(0);
}

test.describe('[FLOW-RESTRICTED-PAGE] page access', () => {
	for (const {name, path, route} of SIGN_IN_PAGES) {
		test(`[FLOW-RESTRICTED-PAGE] a guest opening ${name} is sent to sign in`, async ({
			page,
		}) => {
			await page.goto(sitePath(path));

			await expectSignInFor(page, path);

			await expect(pageCustomElement(page, route)).toHaveCount(0);
		});
	}

	test('[FLOW-RESTRICTED-PAGE] signing in from the redirect returns the user to the page they asked for', async ({
		page,
	}) => {
		const persona = getPersona('ACCOUNT_ADMIN');

		await page.goto(sitePath('/support/ticket-attachments'));

		await expectSignInFor(page, '/support/ticket-attachments');

		await page
			.locator('#_com_liferay_login_web_portlet_LoginPortlet_login')
			.fill(persona.email);
		await page
			.locator('#_com_liferay_login_web_portlet_LoginPortlet_password')
			.fill(persona.password);
		await page.getByRole('button', {name: 'Sign In'}).click();

		await expect(page).toHaveURL(
			new RegExp(`${sitePath('/support/ticket-attachments')}`)
		);

		await expect(
			page.getByRole('heading', {name: 'Ticket Attachments'})
		).toBeVisible();
	});

	test('[FLOW-RESTRICTED-PAGE] a customer cannot open the Admin page', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await expectPageNotFound(page, '/admin', 'admin');
	});

	test('[FLOW-RESTRICTED-PAGE] a customer who is not a Marketplace publisher cannot open the Publisher Dashboard', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await expectPageNotFound(
			page,
			'/my-account/publisher-dashboard',
			'publisher-dashboard'
		);
	});

	test('[FLOW-RESTRICTED-PAGE] a guest on the public Business Events page sees the plan restriction instead of events', async ({
		page,
	}) => {
		await gotoAndExpectRender(page, sitePath('/support/business-events'));

		await expect(
			page.getByRole('heading', {name: 'Business Events'})
		).toBeVisible();
		await expect(
			page.getByText('This feature is not included in your current plan')
		).toBeVisible();
		await expect(
			page.getByRole('link', {name: 'Create Event'})
		).toHaveCount(0);
	});

	test('[FLOW-RESTRICTED-PAGE] a signed in customer opens My Account', async ({
		page,
	}) => {
		const persona = getPersona('ACCOUNT_MEMBER');

		await liferayLogin(page, persona.email, persona.password);

		const response = await page.goto(sitePath('/my-account'));

		expect(response?.status()).toBe(200);

		await expect(pageCustomElement(page, 'my-account')).toBeAttached();
	});
});
