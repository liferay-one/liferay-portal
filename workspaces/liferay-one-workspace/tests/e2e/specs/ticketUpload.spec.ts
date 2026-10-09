/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const entitledEmail = process.env.ONE_ENTITLED_EMAIL ?? 'test@liferay.com';
const entitledPassword = process.env.ONE_ENTITLED_PASSWORD ?? 'test';

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page, entitledEmail, entitledPassword);
});

test.describe.fixme('[FLOW-TICKET-UPLOAD] ticket attachment upload', () => {
	test('[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-NEW] uploads an attachment to a selected ticket', async ({
		page,
	}) => {
		const spaPage = new SPAPage(
			page,
			'/web/one/support/ticket-attachments#/new'
		);

		await spaPage.goto();

		await expect(spaPage.customElement.first()).toBeAttached();

		const [accountSelect, ticketSelect] = await page
			.getByRole('combobox')
			.all();

		await accountSelect.selectOption({index: 1});
		await expect(ticketSelect).toBeEnabled();
		await ticketSelect.selectOption({index: 1});

		await page.getByRole('button', {name: /continue|next|upload/i}).click();

		await page.locator('input[type="file"]').setInputFiles({
			buffer: Buffer.from('attachment contents'),
			mimeType: 'text/plain',
			name: 'evidence.txt',
		});

		await page.getByRole('button', {name: /upload|submit|attach/i}).click();

		await expect(page.getByText(/evidence\.txt/i)).toBeVisible({
			timeout: 30000,
		});

		await expect(
			page.getByText(/uploaded|complete|success/i).first()
		).toBeVisible();
	});
});
