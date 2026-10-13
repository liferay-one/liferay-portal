/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, oneTest as test} from '../fixtures/oneTest';
import {adminApp, adminNavLinks, expectAdminSettled} from '../utils/adminUtils';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {ACCOUNT_ERC, sitePath} from '../utils/environmentUtils';
import {expectSettled} from '../utils/myAccountUtils';

/**
 * The custom element reads the language from the page, and the portal sets
 * it from the language prefix of the URL. Each language the custom element
 * ships is opened under its full locale prefix, and the labels of two page
 * groups must render in that language. The administrator reads both groups,
 * so one persona covers them.
 */

const LANGUAGES = [
	{
		accountDetails: 'Main Information',
		adminDashboard: 'Administrator Dashboard',
		marketplaceSummary: 'Marketplace Summary',
		prefix: '/en-US',
	},
	{
		accountDetails: 'Información principal',
		adminDashboard: 'Panel de administración',
		marketplaceSummary: 'Resumen de Marketplace',
		prefix: '/es-ES',
	},
	{
		accountDetails: 'Informações principais',
		adminDashboard: 'Painel do administrador',
		marketplaceSummary: 'Resumo do Marketplace',
		prefix: '/pt-BR',
	},
	{
		accountDetails: '主な情報',
		adminDashboard: '管理者ダッシュボード',
		marketplaceSummary: 'Marketplaceの概要',
		prefix: '/ja-JP',
	},
];

test.describe('[FLOW-LOCALIZATION] localized labels', () => {
	for (const language of LANGUAGES) {
		test(`[FLOW-LOCALIZATION] ${language.prefix} renders the admin and My Account labels in its language`, async ({
			page,
			signIn,
		}) => {
			await signIn('ADMINISTRATOR');

			await gotoAndExpectRender(
				page,
				`${language.prefix}${sitePath('/admin')}#/mp-summary`
			);

			await expectAdminSettled(page);

			await expect(
				adminNavLinks(page).filter({
					hasText: language.marketplaceSummary,
				})
			).toBeVisible();

			await expect(
				adminApp(page).getByText(language.adminDashboard, {
					exact: true,
				})
			).toBeVisible();

			await gotoAndExpectRender(
				page,
				`${language.prefix}${sitePath('/my-account')}#/${ACCOUNT_ERC}/account-details`
			);

			await expectSettled(page);

			await expect(
				page.getByText(language.accountDetails, {exact: true})
			).toBeVisible();
		});
	}

	test('[FLOW-LOCALIZATION] /es renders the admin labels in Spanish', async ({
		page,
		signIn,
	}) => {
		await signIn('ADMINISTRATOR');

		await gotoAndExpectRender(page, `/es${sitePath('/admin')}#/mp-summary`);

		await expectAdminSettled(page);

		test.info().annotations.push({
			description:
				'The portal resolves /es to es_AR, and translate() in src/i18n/index.ts looks up the exact language ID, with a fallback only for the bare codes en, es, ja, and pt. A Spanish locale other than es_ES, such as es_AR or es_MX, therefore renders the custom element in English while the portal around it renders in Spanish.',
			type: 'issue',
		});

		test.fail();

		await expect(
			adminNavLinks(page).filter({hasText: 'Resumen de Marketplace'})
		).toBeVisible();
	});
});
