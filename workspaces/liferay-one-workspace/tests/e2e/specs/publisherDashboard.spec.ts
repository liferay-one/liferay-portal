/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {selectCurrentAccount} from '../utils/accountUtils';
import {PUBLISHER_ACCOUNT_ERC} from '../utils/environmentUtils';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryMember,
	createTemporaryAdministrator,
	deleteTemporaryMember,
} from '../utils/myAccountUtils';
import {
	PUBLISHER_DASHBOARD_PATH,
	gotoPublisherDashboard,
} from '../utils/publisherUtils';

/**
 * The Publisher Dashboard for a publisher whose account owns a seeded catalog.
 * The dashboard resolves the catalog from the commerce current account, so
 * each test selects the publisher account (Test Supplier, ACCNT-021) first.
 *
 * The journeys run as a temporary administrator with the Marketplace
 * Publisher role and Account Administrator on Test Supplier, because selecting
 * the account as the shared administrator persona would switch it under every
 * parallel test signed in as that persona. The seeded publisher persona holds
 * the same roles but cannot read the catalog; the first test pins that gap.
 */

const SEEDED_APPS = [
	'Test App',
	'Test Supplier Slack Connector',
	'Test Supplier Theme Pack',
];

const SEEDED_SOLUTIONS = [
	'Test Supplier CRM Accelerator',
	'Test Supplier Partner Portal',
];

function appRow(page: Page, name: string) {
	return page.getByRole('row').filter({hasText: name});
}

test.describe('[FLOW-PUBLISHER-ONBOARDING] publisher dashboard', () => {
	test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] the seeded publisher persona sees the apps of its own catalog', async ({
		page,
		signIn,
	}) => {
		test.slow();

		await signIn('PUBLISHER');

		await selectCurrentAccount(page, PUBLISHER_ACCOUNT_ERC);

		await gotoPublisherDashboard(page, 'published-apps');

		test.info().annotations.push({
			description:
				'admin@publisher.com holds Marketplace Publisher and Account Administrator on Test Supplier, but GET /o/headless-commerce-admin-catalog/v1.0/catalogs returns no catalog for it, so the dashboard renders the empty state and disables Publish New App. The Marketplace Publisher role in liferay-one-batch carries no catalog permissions.',
			type: 'issue',
		});

		test.fail();

		for (const name of SEEDED_APPS) {
			await expect(appRow(page, name)).toBeVisible();
		}

		await expect(
			page.getByRole('button', {name: 'Publish New App'})
		).toBeEnabled();
	});

	test.describe('as the publisher of Test Supplier', () => {
		let administrator: TemporaryMember | undefined;

		test.beforeEach(async ({adminAPI, page}) => {
			administrator = await createTemporaryAdministrator(adminAPI, [
				PUBLISHER_ACCOUNT_ERC,
			]);

			await liferayLogin(
				page,
				administrator.email,
				administrator.password
			);

			await selectCurrentAccount(page, PUBLISHER_ACCOUNT_ERC);
		});

		test.afterEach(async ({adminAPI}) => {
			await deleteTemporaryMember(adminAPI, administrator);

			administrator = undefined;
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] lists the published apps of the catalog', async ({
			page,
		}) => {
			await gotoPublisherDashboard(page, 'published-apps');

			const navigation = page.getByRole('navigation', {
				name: 'Breadcrumb',
			});

			await expect(navigation).toContainText('Publisher Dashboard');

			for (const name of [
				'Published Apps',
				'Published Solutions',
				'Publisher Profile',
			]) {
				await expect(
					page.getByRole('link', {exact: true, name})
				).toBeVisible();
			}

			await expect(
				page.getByText('Manage and publish apps on the Marketplace')
			).toBeVisible();

			await expect(
				page.getByRole('button', {name: 'Publish New App'})
			).toBeEnabled();

			for (const name of SEEDED_APPS) {
				const row = appRow(page, name);

				await expect(row).toBeVisible();
				await expect(row).toContainText('Published');
			}

			await expect(appRow(page, 'Test App')).toContainText(
				'Client Extension'
			);
			await expect(
				appRow(page, 'Test Supplier Theme Pack')
			).toContainText('Low-Code Configuration');
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] searches the published apps by name', async ({
			page,
		}) => {
			await gotoPublisherDashboard(page, 'published-apps');

			await expect(appRow(page, 'Test App')).toBeVisible();

			const search = page
				.locator('liferay-one-custom-element')
				.getByRole('textbox', {name: 'Search'});

			await search.fill('Slack');
			await search.press('Enter');

			await expect(
				appRow(page, 'Test Supplier Slack Connector')
			).toBeVisible();
			await expect(appRow(page, 'Test Supplier Theme Pack')).toHaveCount(
				0
			);
			await expect(appRow(page, 'Test App')).toHaveCount(0);
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PRODUCTID] opens the summary of a published app and returns to the list', async ({
			page,
		}) => {
			await gotoPublisherDashboard(page, 'published-apps');

			await appRow(page, 'Test App')
				.getByRole('button', {name: 'actions'})
				.click();

			await page.getByRole('menuitem', {name: 'View'}).click();

			await expect(page).toHaveURL(/#\/published-apps\/\d+/);

			await expect(
				page.getByText('Review the information published for this app.')
			).toBeVisible();

			await expect(page.getByText('Approved').first()).toBeVisible();

			for (const section of ['Description', 'Pricing', 'Storefront']) {
				await expect(
					page.getByRole('heading', {name: section}).first()
				).toBeVisible();
			}

			await page.getByRole('button', {name: 'Back'}).click();

			await expect(page).toHaveURL(/#\/published-apps$/);

			await expect(appRow(page, 'Test App')).toBeVisible();
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS] lists the published solutions with their row actions', async ({
			page,
		}) => {
			await gotoPublisherDashboard(page, 'published-solutions');

			await expect(
				page.getByRole('button', {name: 'New Solution Template'})
			).toBeEnabled();

			for (const name of SEEDED_SOLUTIONS) {
				await expect(appRow(page, name)).toContainText('Published');
			}

			await appRow(page, 'Test Supplier Partner Portal')
				.getByRole('button', {name: 'actions'})
				.click();

			await expect(
				page.getByRole('menuitem', {name: 'Edit'})
			).toBeEnabled();
			await expect(
				page.getByRole('menuitem', {name: 'Delete'})
			).toBeEnabled();
			await expect(
				page.getByRole('menuitem', {name: 'Open in Marketplace'})
			).toBeEnabled();
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE] shows the seeded publisher details', async ({
			page,
		}) => {
			test.slow();

			await gotoPublisherDashboard(page, 'publisher-profile');

			test.info().annotations.push({
				description:
					'services/objects/PublisherDetails.ts reads /o/c/publisherdetails, which returns 404; the object is served at /o/c/publisherdetailses, so every field renders "-".',
				type: 'issue',
			});

			test.fail();

			await expect(page.getByText('3 Apps · 2 Solutions')).toBeVisible();

			await expect(
				page.getByText('Test Supplier builds sample apps and solutions')
			).toBeVisible();
			await expect(page.getByText('info@testsupplier.com')).toBeVisible();
			await expect(
				page.getByText('sales@testsupplier.com')
			).toBeVisible();
			await expect(
				page.getByText('billing@testsupplier.com')
			).toBeVisible();
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-EDIT] edits a publisher profile field and saves it', async ({
			adminAPI,
			page,
		}) => {
			test.slow();

			const {items} = await adminAPI.get<{
				items: Array<{id: number; phone: string}>;
			}>(
				`/o/c/publisherdetailses?filter=${encodeURIComponent(
					"publisherName eq 'Test Supplier'"
				)}`
			);

			const [publisherDetails] = items;

			expect(
				publisherDetails,
				'expected the seeded Test Supplier publisher details'
			).toBeDefined();

			const phone = `+1 555 ${Date.now().toString().slice(-7)}`;

			try {
				await gotoPublisherDashboard(page, 'publisher-profile');

				await page.getByRole('button', {name: 'Edit'}).click();

				await expect(page).toHaveURL(/#\/publisher-profile\/edit$/);

				await expect(
					page.getByText('Edit Publisher Profile')
				).toBeVisible();

				await page.locator('#publisher-phone').fill(phone);

				test.info().annotations.push({
					description:
						'The edit page reads and PATCHes /o/c/publisherdetails, which returns 404, so Save shows "There is no publisher profile to update".',
					type: 'issue',
				});

				test.fail();

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(page).toHaveURL(/#\/publisher-profile$/);

				await expect(page.getByText(phone)).toBeVisible();
			}
			finally {
				await adminAPI.patch(
					`/o/c/publisherdetailses/${publisherDetails.id}`,
					{phone: publisherDetails.phone}
				);
			}
		});

		test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] redirects an unknown route to the published apps', async ({
			page,
		}) => {
			await page.goto(`${PUBLISHER_DASHBOARD_PATH}#/no-such-route`);

			await expect(page).toHaveURL(/#\/published-apps$/);

			await expect(appRow(page, 'Test App')).toBeVisible();
		});
	});

	test('[FLOW-PUBLISHER-ONBOARDING] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS] a user without the Marketplace Publisher role cannot open the dashboard', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await page.goto(`${PUBLISHER_DASHBOARD_PATH}#/published-apps`);

		await expect(page.locator('liferay-one-custom-element')).toHaveCount(0);

		await expect(
			page.getByText('Manage and publish apps on the Marketplace')
		).toHaveCount(0);
	});
});
