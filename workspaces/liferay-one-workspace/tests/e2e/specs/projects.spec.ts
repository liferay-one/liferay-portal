/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import SpringBootStub from '../utils/SpringBootStub';
import {
	ACCOUNT_ERC,
	PROJECT_ERC,
	PROJECT_NAME,
	UNASSIGNED_PROJECT_ERC,
	UNASSIGNED_PROJECT_NAME,
} from '../utils/environmentUtils';
import {expectSettled, gotoMyAccount, tableRow} from '../utils/myAccountUtils';

const PAAS_EXPERIENCE_PRODUCT_ERC =
	'salesforce-product-liferay-paas-experience';

const PROJECT_PATH = `${ACCOUNT_ERC}/project/${PROJECT_ERC}`;

type ProjectProduct = {
	externalReferenceCode: string;
	productSpecifications?: {specificationKey: string; value: string}[];
};

async function stubExperienceDashboardProfile(springBoot: SpringBootStub) {
	await springBoot.on(
		'GET',
		'/accounts/:externalReferenceCode/products',
		async ({request}) => {
			const response = await fetch(request.url(), {
				headers: await request.allHeaders(),
			});

			const productsPage = (await response.json()) as {
				items: ProjectProduct[];
			};

			for (const product of productsPage.items) {
				if (
					product.externalReferenceCode ===
					PAAS_EXPERIENCE_PRODUCT_ERC
				) {
					product.productSpecifications = [
						...(product.productSpecifications ?? []),
						{
							specificationKey: 'project-utilization-profile',
							value: 'experience-dashboard',
						},
					];
				}
			}

			return {body: productsPage, contentType: 'application/json'};
		}
	);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function usageMetric(usedCount: number) {
	return {
		maxCount: 100,
		maxCountUnits: 'GB',
		percentage: String(usedCount),
		usedCount,
		usedCountUnits: 'GB',
	};
}

const USAGE_METRICS = Object.fromEntries(
	[
		'anonymousPageViews',
		'clientExtensionsCPU',
		'clientExtensionsCapacityCPU',
		'clientExtensionsCapacityRAM',
		'clientExtensionsRAM',
		'databaseStorage',
		'documentLibraryAndBackupStorage',
		'logStorage',
		'monthlyActiveLoggedInUsers',
		'networkTraffic',
		'sites',
		'storageCapacityDocumentLibrary',
	].map((metric, index) => [metric, usageMetric(10 + index)])
);

async function openItem(page: Page, name: string) {
	await tableRow(page, name).locator('td').first().click();

	await expectSettled(page);

	await expect(
		page.getByRole('link', {name: /Back to Project/})
	).toBeVisible();
}

test.describe('[FLOW-PROJECT-LIFECYCLE] project navigation', () => {
	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PROJECT] [ROUTE-MY-ACCOUNT-PROJECTERC] opens the default project and switches projects', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project`);

		await expect(page).toHaveURL(
			new RegExp(
				`#/${ACCOUNT_ERC}/project/[^/]+/(products|applications)$`
			)
		);

		await gotoMyAccount(page, `${PROJECT_PATH}/products`);

		const projectSelector = page.getByRole('button', {
			name: 'Select Project',
		});

		await expect(projectSelector).toContainText(
			new RegExp(`${escapeRegExp(PROJECT_NAME)}$`)
		);

		await projectSelector.click();

		await page
			.getByRole('menuitem', {
				name: new RegExp(
					`^${escapeRegExp(UNASSIGNED_PROJECT_NAME)}(\\s|$)`
				),
			})
			.click();

		await expect(page).toHaveURL(
			new RegExp(`#/${ACCOUNT_ERC}/project/${UNASSIGNED_PROJECT_ERC}/`)
		);

		await expect(projectSelector).toContainText(
			new RegExp(`${escapeRegExp(UNASSIGNED_PROJECT_NAME)}$`)
		);
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PROJECTERC] redirects a project user away from a project they do not belong to', async ({
		page,
		signIn,
	}) => {
		await signIn('NULL_PROJECT_MEMBER');

		await gotoMyAccount(
			page,
			`${ACCOUNT_ERC}/project/${UNASSIGNED_PROJECT_ERC}/products`
		);

		await expect(page).toHaveURL(
			new RegExp(`#/${ACCOUNT_ERC}/project/${PROJECT_ERC}/`)
		);

		await expect(
			page.getByRole('button', {name: 'Select Project'})
		).not.toContainText(UNASSIGNED_PROJECT_NAME);
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PROJECT] tells a user with no project membership there are no projects', async ({
		page,
		signIn,
	}) => {
		await signIn('NULL_ROLE');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project`);

		test.fail(
			true,
			'A user with no account role and no project membership is shown the One-Time Purchases project, whose placed orders request returns 404, so the page renders a fetch error.'
		);

		test.info().annotations.push({
			description:
				'norole@customer.com on ACCNT-001: GET headless-commerce-delivery-order placed-orders returns 404 and the Products view shows "An error occurred while fetching the data." instead of "No Projects Yet" (LPD-95398 denies Projects to a null role).',
			type: 'issue',
		});

		await expect(
			page.getByText('An error occurred while fetching the data.')
		).toHaveCount(0);

		await expect(page.getByText('No Projects Yet')).toBeVisible({
			timeout: 5000,
		});
	});
});

test.describe('[FLOW-PROJECT-LIFECYCLE] products', () => {
	test.beforeEach(async ({page, signIn}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${PROJECT_PATH}/products`);

		await expect(
			page.getByText('Manage the products within your project')
		).toBeVisible();
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PRODUCTS] pages through and searches the project products', async ({
		page,
	}) => {
		await expect(page.getByText(/Showing 1 to 10 of \d+/)).toBeVisible();

		await page.getByLabel('Go to page, 2').click();

		await expect(page.getByText(/Showing 11 to \d+ of \d+/)).toBeVisible();

		await page
			.locator('liferay-one-custom-element[route="my-account"]')
			.getByPlaceholder('Search')
			.fill('Commerce');

		await expect(tableRow(page, 'Liferay Commerce')).toBeVisible();

		for (const row of await page.locator('tbody tr').all()) {
			await expect(row).toContainText(/Commerce/i);
		}
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PRODUCTERC] opens a product and keeps the selected tab in the URL', async ({
		page,
	}) => {
		await openItem(page, 'Liferay DXP - Free Tier');

		await expect(page).toHaveURL(
			new RegExp(`#/${PROJECT_PATH}/products/PRDCT-DXP`)
		);

		for (const tab of [
			'Details',
			'Environment',
			'Download',
			'Orders',
			'Help & Support',
		]) {
			await expect(page.getByRole('tab', {name: tab})).toBeVisible();
		}

		await page.getByRole('tab', {name: 'Download'}).click();

		await expect(page).toHaveURL(/\?tab=download$/);

		await expect(page.getByText('Bundle List')).toBeVisible();

		await page.reload();

		await expectSettled(page);

		await expect(page.getByRole('tab', {name: 'Download'})).toHaveAttribute(
			'aria-selected',
			'true'
		);

		await expect(page.getByText('Bundle List')).toBeVisible();

		await page.getByRole('tab', {name: 'Orders'}).click();

		await expect(page.getByText('Orders List')).toBeVisible();

		await page.getByRole('link', {name: 'View All Account Orders'}).click();

		await expect(page).toHaveURL(new RegExp(`#/${ACCOUNT_ERC}/orders$`));
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PRODUCTERC] returns from a product to the project', async ({
		page,
	}) => {
		await openItem(page, 'Liferay Commerce');

		await expect(page.getByRole('tab', {name: 'Activation'})).toBeVisible();

		await page.getByRole('link', {name: /Back to Project/}).click();

		await expect(page).toHaveURL(new RegExp(`#/${PROJECT_PATH}/products`));

		await expect(
			page.getByText('Manage the products within your project')
		).toBeVisible();
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PRODUCTERC] shows the project usage metrics on the Utilization tab', async ({
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Asserts the usage the stub serves; live usage depends on DataOps data.'
		);

		await stubExperienceDashboardProfile(springBoot);

		await springBoot.on('GET', '/projects/:projectERC/usage', {
			body: {metrics: USAGE_METRICS, usageDataAvailable: true},
		});

		await gotoMyAccount(
			page,
			`${PROJECT_PATH}/products/${PAAS_EXPERIENCE_PRODUCT_ERC}?tab=utilization`
		);

		await expect(page.getByText('Project Usage Metrics')).toBeVisible();

		await expect(page.getByText('Resource Usage')).toBeVisible();

		await expect(page.getByText('Extensions RAM')).toBeVisible();

		await expect(page.getByText('Usage Data Not Loaded')).toHaveCount(0);

		expect(
			springBoot.callsTo('GET', `/projects/${PROJECT_ERC}/usage`).length
		).toBeGreaterThan(0);
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-PRODUCTERC] warns when the usage data is not available', async ({
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Asserts the unavailable state the stub serves.'
		);

		await stubExperienceDashboardProfile(springBoot);

		await springBoot.on('GET', '/projects/:projectERC/usage', {
			body: {metrics: USAGE_METRICS, usageDataAvailable: false},
		});

		await gotoMyAccount(
			page,
			`${PROJECT_PATH}/products/${PAAS_EXPERIENCE_PRODUCT_ERC}?tab=utilization`
		);

		await expect(page.getByText('Usage Data Not Loaded')).toBeVisible();
	});
});

test.describe('[FLOW-PROJECT-LIFECYCLE] applications', () => {
	test.beforeEach(async ({signIn}) => {
		await signIn('ACCOUNT_ADMIN');
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-APPLICATIONS] [ROUTE-MY-ACCOUNT-APPLICATIONERC] lists the project applications and opens one', async ({
		page,
	}) => {
		await gotoMyAccount(page, `${PROJECT_PATH}/applications`);

		await expect(
			page.getByText('Manage the applications within your project')
		).toBeVisible();

		const row = tableRow(page, 'Test App');

		await expect(row).toContainText('Test Supplier');

		await expect(row).toContainText('Free');

		await row.getByRole('button', {name: 'Actions'}).click();

		await page.getByRole('menuitem', {name: 'View Details'}).click();

		await expect(page).toHaveURL(
			new RegExp(`#/${PROJECT_PATH}/applications/PRDCT-TEST-APP`)
		);

		await expect(page.getByRole('tab', {name: 'Details'})).toBeVisible();
	});

	test('[FLOW-PROJECT-LIFECYCLE] [ROUTE-MY-ACCOUNT-APPLICATIONERC] opens the download tab from Download App', async ({
		page,
	}) => {
		await gotoMyAccount(page, `${PROJECT_PATH}/applications`);

		await tableRow(page, 'Test App')
			.getByRole('button', {name: 'Actions'})
			.click();

		await page.getByRole('menuitem', {name: 'Download App'}).click();

		await expect(page).toHaveURL(
			new RegExp(`applications/PRDCT-TEST-APP\\?tab=download$`)
		);

		await expect(page.getByRole('tab', {name: 'Download'})).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	test('[FLOW-PROJECT-LIFECYCLE] [FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-APPLICATIONS] [ROUTE-MY-ACCOUNT-GENERATE] starts a license key for a paid one time purchase', async ({
		page,
	}) => {
		await gotoMyAccount(
			page,
			`${ACCOUNT_ERC}/project/one-time-purchases/applications`
		);

		await expect(
			page.getByRole('button', {name: 'Select Project'})
		).toContainText('One-Time Purchases');

		const row = tableRow(page, 'Test Client Extension');

		await expect(row).toContainText('Paid');

		await row.getByRole('button', {name: 'Actions'}).click();

		await expect(
			page.getByRole('menuitem', {name: 'Manage License Keys'})
		).toBeVisible();

		await page.getByRole('menuitem', {name: 'Create License Key'}).click();

		await expect(page).toHaveURL(
			/activation\/generate\?new=PRDCT-TEST-CLIENT-EXTENSION/
		);

		await expect(
			page.getByText('An unexpected error occurred.')
		).toHaveCount(0, {timeout: 10000});

		await expect(
			page.getByRole('heading', {name: 'Generate Activation Key'})
		).toBeVisible({timeout: 10000});
	});
});
