/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Locator, Page, expect, test} from '@playwright/test';

import {gotoAndExpectRender} from './customElementUtils';
import {sitePath} from './environmentUtils';

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

export async function firstColumnValues(page: Page): Promise<string[]> {
	return (
		await tableRows(page).locator('td:first-child').allInnerTexts()
	).map((text) => text.trim());
}
