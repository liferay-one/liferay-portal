/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const freeProductERC = process.env.ONE_FREE_PRODUCT_ERC ?? 'FREE-APP-001';
const paidProductERC = process.env.ONE_PAID_PRODUCT_ERC ?? 'PAID-APP-001';

const entitledEmail = process.env.ONE_ENTITLED_EMAIL ?? 'test@liferay.com';
const entitledPassword = process.env.ONE_ENTITLED_PASSWORD ?? 'test';

function purchasePage(page: Page, productERC: string) {
	return new SPAPage(
		page,
		`/web/one/product-purchase?productERC=${productERC}`
	);
}

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page, entitledEmail, entitledPassword);
});

test.describe.fixme('[FLOW-PRODUCT-PURCHASE-ENTRY] purchase wizard', () => {
	test('[FLOW-PRODUCT-PURCHASE-ENTRY] [ROUTE-PRODUCT-PURCHASE-LICENSE] drives account selection through to the summary', async ({
		page,
	}) => {
		const spaPage = purchasePage(page, paidProductERC);

		await spaPage.goto();

		await expect(spaPage.customElement.first()).toBeAttached();

		await page.getByRole('radio').first().check();
		await page.getByRole('button', {name: /continue/i}).click();

		await expect(page.getByText(/license/i).first()).toBeVisible();
		await page.getByRole('button', {name: /continue/i}).click();

		await page.getByRole('button', {name: /continue/i}).click();

		await expect(
			page.getByRole('heading', {name: /summary/i})
		).toBeVisible();
	});
});

test.describe.fixme('[FLOW-CHECKOUT-FREE] free app checkout', () => {
	test('[FLOW-CHECKOUT-FREE] [ROUTE-PRODUCT-PURCHASE-SUMMARY] skips license and payment and completes the order', async ({
		page,
	}) => {
		const spaPage = purchasePage(page, freeProductERC);

		await spaPage.goto();

		await page.getByRole('radio').first().check();
		await page.getByRole('button', {name: /continue/i}).click();

		await expect(
			page.getByRole('heading', {name: /summary/i})
		).toBeVisible();

		await page.getByRole('checkbox').check();
		await page.getByRole('button', {name: /get app/i}).click();

		await expect(
			page.getByText(/order|confirmation|success/i).first()
		).toBeVisible({timeout: 30000});
	});
});

test.describe.fixme('[FLOW-CHECKOUT-PAID] paid app checkout', () => {
	test('[FLOW-CHECKOUT-PAID] [ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] reaches payment before completing the order', async ({
		page,
	}) => {
		const spaPage = purchasePage(page, paidProductERC);

		await spaPage.goto();

		await page.getByRole('radio').first().check();
		await page.getByRole('button', {name: /continue/i}).click();

		await page.getByRole('button', {name: /continue/i}).click();

		await expect(
			page.getByRole('heading', {name: /payment method/i})
		).toBeVisible();

		await page.getByRole('button', {name: /continue/i}).click();

		await expect(
			page.getByRole('button', {name: /purchase app/i})
		).toBeVisible();
	});
});
