/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {SPAPage} from '../pages/SPAPage';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const gatedPages = [
	{name: 'Admin', path: '/web/one/admin#/mp-summary'},
	{name: 'My Account', path: '/web/one/my-account'},
];

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page);
});

test.describe('Custom element access control', () => {
	for (const {name, path} of gatedPages) {
		test(`[FLOW-RESTRICTED-PAGE] ${name} mounts the SPA and gates an unentitled user`, async ({
			page,
		}) => {
			const spaPage = new SPAPage(page, path);

			await spaPage.goto();

			await expect(spaPage.customElement.first()).toBeAttached();

			await expect(
				page.getByText(/restricted page/i).first()
			).toBeVisible({timeout: 30000});
		});
	}
});
