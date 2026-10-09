/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {selectCurrentAccount} from '../utils/accountUtils';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {
	ACCOUNT_ERC,
	SWITCH_ACCOUNT_ERC,
	sitePath,
} from '../utils/environmentUtils';
import {dismissCookieBanner} from '../utils/loginUtils';

/**
 * The header fragment, its primary navigation menu, and the account selector
 * custom element it hosts are on every page of the One site, so a regression
 * here strands the user on whatever page they land on.
 *
 * The My Account menu items are URL items written as `/my-account/#/...`,
 * which resolve only under the site's virtual host (`one.localhost` locally),
 * so the test checks where they point and then opens the same routes through
 * the site path, which works on either host.
 *
 * The account switching journey signs in as a user with many accounts and no
 * account role (`member@customer.com` in the seed), because the current
 * account is stored per user on the server and switching it as a persona that
 * other specs sign in as would change their starting account.
 */

const HOME_PATH = sitePath('/home');

function accountMenu(page: Page) {
	return page.locator('#account-menu-id');
}

function primaryNavigation(page: Page) {
	return page.locator('.adt-navigation');
}

async function openMenuItem(page: Page, menu: string, item: string) {
	const navigation = primaryNavigation(page);

	await navigation.getByRole('button', {name: menu}).click();

	await navigation
		.getByRole('link', {name: new RegExp(`^${item}`)})
		.first()
		.click();
}

test.describe('[FLOW-NAVIGATION] site header and navigation', () => {
	test('[FLOW-NAVIGATION] a guest sees the sign in menu and no account navigation', async ({
		page,
	}) => {
		await page.goto(HOME_PATH);

		await dismissCookieBanner(page);

		await expect(
			page.getByRole('link', {name: 'Skip to Content'})
		).toBeAttached();
		await expect(page.locator('#language-selector-id')).toContainText('EN');

		await expect(accountMenu(page)).toContainText('Sign In');

		await accountMenu(page).click();

		await expect(
			page.locator('.account-dropdown').getByText('Create An Account')
		).toBeVisible();
		await expect(
			page
				.locator('.account-dropdown')
				.getByRole('link', {name: 'Sign In'})
		).toHaveAttribute('href', /login/);

		const navigation = primaryNavigation(page);

		await expect(
			navigation.getByRole('button', {name: 'Support'})
		).toBeVisible();
		await expect(
			navigation.getByRole('button', {name: 'My Account'})
		).toBeHidden();
		await expect(navigation.getByRole('link', {name: 'Admin'})).toHaveCount(
			0
		);

		await expect(
			page.getByRole('button', {name: 'Select Account'})
		).toHaveCount(0);

		await expect(
			page.getByRole('link', {name: 'Sign In'}).first()
		).toBeVisible();
		await expect(
			page.getByRole('link', {name: 'View Account'})
		).toHaveCount(0);
	});

	test('[FLOW-NAVIGATION] the guest menu links Create An Account to registration', async ({
		page,
	}) => {
		await page.goto(HOME_PATH);

		await dismissCookieBanner(page);

		await accountMenu(page).click();

		await expect(
			page.getByText('Create An Account', {exact: true})
		).toBeVisible();

		test.info().annotations.push({
			description:
				'The header renders Create An Account as a plain div with no link, so a guest cannot reach registration from the account menu.',
			type: 'issue',
		});

		test.fail();

		await expect(
			page.getByRole('link', {name: 'Create An Account'})
		).toBeVisible({timeout: 5000});
	});

	test('[FLOW-NAVIGATION] a signed in customer sees the account menu and can sign out', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await page.goto(HOME_PATH);

		await expect(
			page.getByRole('link', {name: 'View Account'})
		).toBeVisible();

		await accountMenu(page).click();

		await expect(
			page.getByRole('link', {name: 'Account Settings'})
		).toHaveAttribute('href', 'https://login.liferay.com/enduser/settings');

		await Promise.all([
			page.waitForResponse((response) =>
				response.url().includes('/c/portal/logout')
			),
			page.getByRole('link', {name: 'Sign Out'}).click(),
		]);

		await page.goto(HOME_PATH);

		await expect(accountMenu(page)).toContainText('Sign In');
		await expect(
			page.getByRole('link', {name: 'View Account'})
		).toHaveCount(0);
	});

	test('[FLOW-NAVIGATION] [ROUTE-MY-ACCOUNT-ORDERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] the My Account menu opens the orders and members pages', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await page.goto(HOME_PATH);

		const navigation = primaryNavigation(page);

		await navigation.getByRole('button', {name: 'My Account'}).click();

		for (const [item, hash] of [
			['Orders', '#/orders'],
			['Account Details', '#/account-details'],
			['Account Members', '#/account-members'],
		]) {
			await expect(
				navigation
					.getByRole('link', {name: new RegExp(`^${item}`)})
					.first(),
				`expected ${item} to point at the My Account ${hash} route`
			).toHaveAttribute('href', new RegExp(`/my-account/${hash}$`));
		}

		await gotoAndExpectRender(page, sitePath('/my-account#/orders'));

		await expect(page).toHaveURL(new RegExp(`#/${ACCOUNT_ERC}/orders`));
		await expect(
			page.getByText('Orders List', {exact: true})
		).toBeVisible();

		await gotoAndExpectRender(
			page,
			sitePath('/my-account#/account-members')
		);

		await expect(page).toHaveURL(
			new RegExp(`#/${ACCOUNT_ERC}/account-members`)
		);
		await expect(
			page.getByText('Invite, manage roles, designate incident contacts.')
		).toBeVisible();
	});

	test('[FLOW-NAVIGATION] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] the Support menu opens business events and ticket attachments', async ({
		page,
		signIn,
	}) => {
		await signIn('PROJECT_REQUESTER');

		await page.goto(HOME_PATH);

		await openMenuItem(page, 'Support', 'Business Events');

		await expect(page).toHaveURL(/\/support\/business-events/);
		await expect(
			page.getByRole('heading', {exact: true, name: 'Business Events'})
		).toBeVisible();

		await openMenuItem(page, 'Support', 'Ticket Attachments');

		await expect(page).toHaveURL(/\/support\/ticket-attachments/);
		await expect(
			page.getByRole('heading', {exact: true, name: 'Ticket Attachments'})
		).toBeVisible();
	});

	test('[FLOW-NAVIGATION] the Marketplace menu opens the catalog', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_MEMBER');

		await page.goto(HOME_PATH);

		await openMenuItem(page, 'Marketplace', 'Applications');

		await expect(page).toHaveURL(/\/marketplace\/applications/);
	});

	test('[FLOW-NAVIGATION] only staff with page access see the Admin link', async ({
		page,
		signIn,
	}) => {
		await signIn('ADMINISTRATOR');

		await page.goto(HOME_PATH);

		const adminLink = primaryNavigation(page).getByRole('link', {
			name: 'Admin',
		});

		await expect(adminLink).toBeVisible();

		await adminLink.click();

		await expect(page).toHaveURL(/\/web\/one\/admin/);
		await expect(
			page.locator('liferay-one-custom-element[route="admin"]')
		).toBeAttached();
	});

	test('[FLOW-NAVIGATION] a customer does not see the Admin link', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await page.goto(HOME_PATH);

		await expect(
			primaryNavigation(page).getByRole('button', {name: 'My Account'})
		).toBeVisible();
		await expect(
			primaryNavigation(page).getByRole('link', {name: 'Admin'})
		).toHaveCount(0);
	});

	test('[FLOW-NAVIGATION] the header search submits the query to the search page', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_MEMBER');

		await page.goto(HOME_PATH);

		const searchInput = page.locator('.liferay-one-search-input');

		await searchInput.fill('DXP');
		await searchInput.press('Enter');

		await expect(page).toHaveURL(/\/search\?q=DXP/);
	});
});

test.describe('[FLOW-NAVIGATION] account selector', () => {
	test('[FLOW-NAVIGATION] a user with one account sees it without a selector', async ({
		page,
		signIn,
	}) => {
		await signIn('LIFERAY_STAFF');

		await gotoAndExpectRender(page, HOME_PATH);

		const accountSelector = page.locator(
			'liferay-one-custom-element[route="account-selector"]'
		);

		await expect(accountSelector).toContainText('Omni Test Account');
		await expect(
			accountSelector.getByRole('button', {name: 'Select Account'})
		).toHaveCount(0);
	});

	test('[FLOW-NAVIGATION] [ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS] switching the account reloads My Account on the new account', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const [account, switchAccount] = await Promise.all([
			adminAPI.getAccountByERC(ACCOUNT_ERC),
			adminAPI.getAccountByERC(SWITCH_ACCOUNT_ERC),
		]);

		await signIn('MULTI_ACCOUNT');

		try {
			await selectCurrentAccount(page, ACCOUNT_ERC);

			await gotoAndExpectRender(
				page,
				sitePath(`/my-account#/${ACCOUNT_ERC}/account-details`)
			);

			const selectAccount = page.getByRole('button', {
				name: 'Select Account',
			});

			await expect(selectAccount).toContainText(account.name);

			await selectAccount.click();

			await page
				.getByPlaceholder('Search')
				.last()
				.fill(switchAccount.name.split(' ')[0]);

			await page
				.getByRole('menuitem', {name: new RegExp(switchAccount.name)})
				.click();

			await expect(page).toHaveURL(
				new RegExp(`#/${SWITCH_ACCOUNT_ERC}/account-details`),
				{timeout: 30000}
			);

			await expect(selectAccount).toContainText(switchAccount.name, {
				timeout: 30000,
			});
		}
		finally {
			await selectCurrentAccount(page, ACCOUNT_ERC);
		}
	});
});
