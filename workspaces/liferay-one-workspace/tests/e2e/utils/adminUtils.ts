/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Locator, Page, expect, test} from '@playwright/test';

import {gotoAndExpectRender} from './customElementUtils';
import {sitePath} from './environmentUtils';

/**
 * Helpers for the Admin page group (`/web/one/admin`). Admin page titles
 * render as Clay text, not as headings, so a spec asserts them with
 * `getByText`. Most lists on these pages are a `ListView`: its row menu is the
 * kebab button labelled `actions` (`Actions` on the few plain tables), its filters live in the hash as `?filter=`
 * JSON next to `page` and `pageSize`, and its rows are table rows.
 */

export const ADMIN_NAV_ITEMS = [
	'Marketplace Summary',
	'Marketplace Orders',
	'Marketplace Apps',
	'Marketplace Solutions',
	'Marketplace Finance Orders',
	'Marketplace Payments',
	'Publishers',
	'Publisher Requests',
	'7 Days Trials',
	'My SSA SaaS Demo',
	'SSA SaaS Environments',
	'Manage SSA SaaS Users',
	'Pub/Sub',
	'Activation Key Uploads',
];

export function adminApp(page: Page): Locator {
	return page.locator('liferay-one-custom-element[route="admin"]');
}

export function adminNavLinks(page: Page): Locator {
	return adminApp(page).locator('nav.side-nav').getByRole('link');
}

const ADMIN_LOADING_INDICATOR = '.loading-animation, .loading-page';

/**
 * Opens an admin route and waits for the SPA to render it and for every
 * loading indicator to clear. Pass `ready` to also wait for the element the
 * test needs first (a row, a heading, a button).
 *
 * Under parallel load the admin page occasionally never finishes its first
 * render: it keeps a loading indicator, or it clears the indicator while a
 * list request never returns. This happens most often on a page with a Spring
 * Boot stub, which loads without the HTTP cache. When the page is not ready in
 * time it is reloaded once, and the retry is recorded as an
 * `admin-load-retry` annotation so the stall stays visible in the report
 * rather than hidden. Both waits are a share of the running test's timeout,
 * capped at 45 and 60 seconds, so the first render, the wait, the reload, and
 * the second wait together always fit the test's budget.
 */

export async function gotoAdmin(
	page: Page,
	route: string,
	query?: Record<string, string>,
	ready?: (page: Page) => Locator
): Promise<void> {
	const search = query ? `?${new URLSearchParams(query)}` : '';

	const {timeout} = test.info();

	const firstWait = Math.min(45000, Math.floor(timeout * 0.25));
	const retryWait = Math.min(60000, Math.floor(timeout * 0.25));

	await gotoAndExpectRender(page, sitePath(`/admin#/${route}${search}`));

	if (await isAdminReady(page, ready, firstWait)) {
		return;
	}

	test.info().annotations.push({
		description: `The admin page at #/${route} was not ready within ${firstWait / 1000} seconds and was reloaded`,
		type: 'admin-load-retry',
	});

	await page.reload();

	await expectAdminSettled(page, retryWait);

	if (ready) {
		await expect(ready(page).first()).toBeVisible({timeout: retryWait});
	}
}

async function isAdminReady(
	page: Page,
	ready: ((page: Page) => Locator) | undefined,
	timeout: number
): Promise<boolean> {
	const deadline = Date.now() + timeout;

	const settled = await expect(
		adminApp(page).locator(ADMIN_LOADING_INDICATOR)
	)
		.toHaveCount(0, {timeout})
		.then(() => true)
		.catch(() => false);

	if (!settled || !ready) {
		return settled;
	}

	return expect(ready(page).first())
		.toBeVisible({timeout: Math.max(deadline - Date.now(), 1000)})
		.then(() => true)
		.catch(() => false);
}

export async function expectAdminSettled(
	page: Page,
	timeout = 60000
): Promise<void> {
	await expect(
		adminApp(page).locator(ADMIN_LOADING_INDICATOR),
		'expected the admin page to finish loading'
	).toHaveCount(0, {timeout});
}

/**
 * Returns the data rows of the first table in the admin content area, which
 * excludes the header row.
 */

export function tableRows(page: Page): Locator {
	return adminApp(page).locator('main table tbody tr');
}

export function rowWithText(page: Page, text: RegExp | string): Locator {
	return tableRows(page).filter({hasText: text});
}

export async function clickRowAction(
	row: Locator,
	actionName: RegExp | string
): Promise<void> {
	await row.getByRole('button', {name: /^actions$/i}).click();

	await row.page().getByRole('menuitem', {name: actionName}).click();
}

/**
 * Applies one option of a checkbox filter through the toolbar: Filter, the
 * field, the option, then Add Filter.
 */

export async function applyCheckboxFilter(
	page: Page,
	fieldLabel: string,
	optionLabel: string
): Promise<void> {
	const app = adminApp(page);

	await app.getByRole('button', {name: 'Filter'}).click();

	await page
		.locator('.management-toolbar-filter-category', {hasText: fieldLabel})
		.click();

	await page.getByLabel(optionLabel, {exact: true}).check();

	await page.getByRole('button', {name: 'Add Filter'}).click();

	await expectAdminSettled(page);
}

export async function searchList(page: Page, text: string): Promise<void> {
	const input = adminApp(page).getByRole('textbox', {name: 'Search'});

	await input.fill(text);
	await input.press('Enter');

	await expectAdminSettled(page);
}

export function toast(page: Page, text: RegExp | string): Locator {
	return page.locator('.alert-container .alert').filter({hasText: text});
}

/**
 * Reads the visible text of the first cell of every data row, which on every
 * admin order list is the order ID.
 */

export async function firstColumnValues(page: Page): Promise<string[]> {
	return (
		await tableRows(page).locator('td:first-child').allInnerTexts()
	).map((text) => text.trim());
}
