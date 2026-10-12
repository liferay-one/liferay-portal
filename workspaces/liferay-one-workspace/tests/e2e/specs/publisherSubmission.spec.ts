/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {selectCurrentAccount} from '../utils/accountUtils';
import {PUBLISHER_ACCOUNT_ERC, uniqueName} from '../utils/environmentUtils';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryMember,
	createTemporaryAdministrator,
	deleteTemporaryMember,
} from '../utils/myAccountUtils';
import {
	NEW_APP_DRAFT_STORAGE_KEY,
	PNG_FILE,
	ZIP_FILE,
	deleteSubmittedProduct,
	gotoPublisherDashboard,
	pickFirstMultiSelectOption,
} from '../utils/publisherUtils';

/**
 * A publisher creates an app and a solution through the publish flows of the
 * Publisher Dashboard and submits them for review. The journeys run as a
 * temporary administrator on the Test Supplier publisher account (see
 * publisherDashboard.spec.ts for why, and for why the seeded publisher
 * persona cannot).
 * Every product a test submits is removed with the records created beside it.
 */

function stepHeading(page: Page, name: string) {
	return page.getByRole('heading', {level: 1, name});
}

async function clickContinue(page: Page): Promise<void> {
	await page.getByRole('button', {exact: true, name: 'Continue'}).click();
}

async function startNewApp(page: Page): Promise<void> {
	await gotoPublisherDashboard(page, 'published-apps');

	await page.evaluate(
		(key) => window.sessionStorage.removeItem(key),
		NEW_APP_DRAFT_STORAGE_KEY
	);

	await page.getByRole('button', {name: 'Publish New App'}).click();

	await expect(page).toHaveURL(/#\/newapp\/publisher$/);

	await expect(stepHeading(page, 'Create new app')).toBeVisible();

	await clickContinue(page);

	await expect(stepHeading(page, 'Define the app profile')).toBeVisible();
}

async function fillAppProfile(page: Page, name: string): Promise<void> {
	await page.getByPlaceholder('Enter app name').fill(name);
	await page
		.getByPlaceholder('Enter app description')
		.fill('An app the e2e suite submits.');
	await page
		.getByRole('combobox', {name: 'Categories'})
		.selectOption({label: 'Other'});

	await pickFirstMultiSelectOption(page, 'Area');
	await pickFirstMultiSelectOption(page, 'Tags');
}

async function fillAppBuild(page: Page): Promise<void> {
	await page.getByRole('button', {name: 'Choose an Option'}).click();
	await page.getByRole('menuitem', {name: /^Client Extension/}).click();

	await page.getByRole('button', {name: 'Add Package(s)'}).click();

	const versionsDialog = page.getByRole('dialog', {
		name: 'Select Compatible Versions',
	});

	await versionsDialog.getByRole('checkbox').first().check();
	await versionsDialog.getByRole('button', {name: 'Confirm'}).click();

	await page.locator('input[type=file]').setInputFiles(ZIP_FILE);

	await expect(page.getByText(ZIP_FILE.name)).toBeVisible();
}

async function fillAppStorefront(page: Page): Promise<void> {
	await page.locator('input[type=file]').setInputFiles(PNG_FILE);

	await expect(page.getByText(PNG_FILE.name)).toBeVisible();
}

async function completeAppStepsThroughPricing(
	page: Page,
	name: string
): Promise<void> {
	await fillAppProfile(page, name);
	await clickContinue(page);

	await expect(stepHeading(page, 'Provide App Build')).toBeVisible();

	await fillAppBuild(page);
	await clickContinue(page);

	await expect(stepHeading(page, 'Customize app storefront')).toBeVisible();

	await fillAppStorefront(page);
	await clickContinue(page);

	await expect(stepHeading(page, 'Provide Version Details')).toBeVisible();

	await clickContinue(page);

	await expect(stepHeading(page, 'Choose pricing model')).toBeVisible();
}

async function submitFreeApp(page: Page, name: string): Promise<void> {
	await startNewApp(page);

	await completeAppStepsThroughPricing(page, name);

	await clickContinue(page);

	await expect(page).toHaveURL(/\/licensing$/);

	await clickContinue(page);

	await expect(page).toHaveURL(/\/support$/);

	await page
		.getByRole('textbox', {name: 'Support URL'})
		.fill('https://example.com/support');

	await clickContinue(page);

	await expect(stepHeading(page, 'Review and Submit App')).toBeVisible();

	await expect(page.getByText(ZIP_FILE.name)).toBeVisible();
	await expect(page.getByText(PNG_FILE.name)).toBeVisible();

	const submitButton = page.getByRole('button', {
		exact: true,
		name: 'Submit',
	});

	await expect(submitButton).toBeDisabled();

	await page.getByRole('checkbox').check();

	await submitButton.click();

	await expect(page).toHaveURL(/#\/published-apps$/, {timeout: 60000});
}

test.describe('publish flows', () => {
	let administrator: TemporaryMember | undefined;

	test.beforeEach(async ({adminAPI, page}) => {
		administrator = await createTemporaryAdministrator(adminAPI, [
			PUBLISHER_ACCOUNT_ERC,
		]);

		await liferayLogin(page, administrator.email, administrator.password);

		await selectCurrentAccount(page, PUBLISHER_ACCOUNT_ERC);
	});

	test.afterEach(async ({adminAPI}) => {
		await deleteTemporaryMember(adminAPI, administrator);

		administrator = undefined;
	});

	test.describe('[FLOW-PUBLISHER-APP-SUBMISSION] app submission', () => {
		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-NEWAPP] [ROUTE-PUBLISHER-DASHBOARD-PROFILE] [ROUTE-PUBLISHER-DASHBOARD-BUILD] holds each step until its fields are valid', async ({
			page,
		}) => {
			await startNewApp(page);

			const continueButton = page.getByRole('button', {
				exact: true,
				name: 'Continue',
			});

			await expect(continueButton).toBeDisabled();

			await page.getByPlaceholder('Enter app name').fill('Ab');
			await page
				.getByPlaceholder('Enter app description')
				.fill('An app description');
			await page
				.getByRole('combobox', {name: 'Categories'})
				.selectOption({label: 'Other'});
			await pickFirstMultiSelectOption(page, 'Area');
			await pickFirstMultiSelectOption(page, 'Tags');

			await expect(continueButton).toBeDisabled();

			await page.getByPlaceholder('Enter app name').fill('Abc');

			await expect(continueButton).toBeEnabled();

			await page
				.getByRole('button', {name: /^Remove /})
				.first()
				.click();

			await expect(continueButton).toBeDisabled();

			await pickFirstMultiSelectOption(page, 'Area');

			await expect(continueButton).toBeEnabled();

			await clickContinue(page);

			await expect(page).toHaveURL(/#\/newapp\/publisher\/build$/);

			await expect(continueButton).toBeDisabled();

			await page.getByRole('button', {name: 'Choose an Option'}).click();
			await page
				.getByRole('menuitem', {name: /^Client Extension/})
				.click();

			await expect(continueButton).toBeDisabled();

			await page.getByRole('button', {name: 'Add Package(s)'}).click();

			const versionsDialog = page.getByRole('dialog', {
				name: 'Select Compatible Versions',
			});

			await versionsDialog.getByRole('checkbox').first().check();
			await versionsDialog.getByRole('button', {name: 'Confirm'}).click();

			await expect(continueButton).toBeDisabled();

			await page.locator('input[type=file]').setInputFiles(ZIP_FILE);

			await expect(continueButton).toBeEnabled();
		});

		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-NEWAPP] exits the flow without creating an app', async ({
			adminAPI,
			page,
		}) => {
			const name = uniqueName('Exited App');

			try {
				await startNewApp(page);

				await page.getByPlaceholder('Enter app name').fill(name);

				await page.getByRole('button', {name: 'Exit'}).click();

				const dialog = page
					.getByRole('dialog')
					.filter({hasText: 'Exit from creating an app'});

				await expect(dialog).toContainText('Exit from creating an app');

				await dialog
					.getByRole('button', {exact: true, name: 'Exit'})
					.click();

				await expect(page).toHaveURL(/#\/published-apps$/);

				await expect(
					page.getByRole('row').filter({hasText: name})
				).toHaveCount(0);

				const {items} = await adminAPI.get<{
					items: Array<{name: {en_US: string}}>;
				}>(
					`/o/headless-commerce-admin-catalog/v1.0/products?search=${encodeURIComponent(
						name
					)}&pageSize=50`
				);

				expect(
					items.filter((product) => product.name.en_US === name)
				).toHaveLength(0);
			}
			finally {
				await deleteSubmittedProduct(adminAPI, name, {
					submitted: false,
				});
			}
		});

		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-PRICING] [ROUTE-PUBLISHER-DASHBOARD-LICENSING] [ROUTE-PUBLISHER-DASHBOARD-LICENSING-PRICES] asks for license prices only for a paid app', async ({
			page,
		}) => {
			await startNewApp(page);

			await completeAppStepsThroughPricing(
				page,
				uniqueName('Priced App')
			);

			await page.getByRole('button', {name: /^Paid /}).click();
			await clickContinue(page);

			await expect(page).toHaveURL(/\/licensing$/);
			await expect(
				page.getByRole('button', {name: /^Subscription License /})
			).toBeVisible();

			await clickContinue(page);

			await expect(page).toHaveURL(/\/licensing-prices$/);

			await page.getByRole('button', {exact: true, name: 'Back'}).click();
			await page.getByRole('button', {exact: true, name: 'Back'}).click();

			await expect(
				stepHeading(page, 'Choose pricing model')
			).toBeVisible();

			await page.getByRole('button', {name: /^Free /}).click();
			await clickContinue(page);

			await expect(page).toHaveURL(/\/licensing$/);

			await clickContinue(page);

			await expect(page).toHaveURL(/\/support$/);
			await expect(
				stepHeading(page, 'Provide app support and help')
			).toBeVisible();
		});

		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-STOREFRONT] [ROUTE-PUBLISHER-DASHBOARD-VERSION] [ROUTE-PUBLISHER-DASHBOARD-SUPPORT] [ROUTE-PUBLISHER-DASHBOARD-SUBMIT] submits a free app and lists it among the published apps', async ({
			adminAPI,
			page,
		}) => {
			test.slow();

			const name = uniqueName('Submitted App');

			let submitted = false;

			try {
				await submitFreeApp(page, name);

				submitted = true;

				await expect(
					page.getByRole('row').filter({hasText: name})
				).toContainText('Client Extension');
			}
			finally {
				await deleteSubmittedProduct(adminAPI, name, {submitted});
			}
		});

		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-SUBMIT] a submitted app enters review as pending', async ({
			adminAPI,
			page,
		}) => {
			test.slow();

			const name = uniqueName('Reviewed App');

			let submitted = false;

			try {
				await submitFreeApp(page, name);

				submitted = true;

				test.info().annotations.push({
					description:
						'AppPublish.updateProduct PATCHes productStatus and workflowStatusInfo 1 (pending), but the product stays at workflow status 2 (draft), so a submitted app never reaches the review queue. A submitted solution does reach pending.',
					type: 'issue',
				});

				test.fail();

				await page.reload();

				await expect(
					page.getByRole('row').filter({hasText: name})
				).toContainText('Pending');
			}
			finally {
				await deleteSubmittedProduct(adminAPI, name, {submitted});
			}
		});

		test('[FLOW-PUBLISHER-APP-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-NEWVERSION] [ROUTE-PUBLISHER-DASHBOARD-BUILD] opens a new version of a published app at its build step', async ({
			adminAPI,
			page,
		}) => {
			const {productId} =
				await adminAPI.getProductByERC('PRDCT-TEST-APP');

			await gotoPublisherDashboard(
				page,
				`newversion/${productId}/publisher`
			);

			await expect(page).toHaveURL(/\/build$/);

			await expect(stepHeading(page, 'Provide App Build')).toBeVisible();

			await expect(page.getByText('Test App').first()).toBeVisible();

			for (const step of ['Build', 'Version', 'Submit']) {
				await expect(
					page.getByRole('navigation').getByText(step, {exact: true})
				).toBeVisible();
			}

			await expect(
				page.getByRole('navigation').getByText('Pricing', {exact: true})
			).toHaveCount(0);
		});
	});

	test.describe('[FLOW-PUBLISHER-SOLUTION-SUBMISSION] solution submission', () => {
		test('[FLOW-PUBLISHER-SOLUTION-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-NEWSOLUTION] [ROUTE-PUBLISHER-DASHBOARD-HEADER] [ROUTE-PUBLISHER-DASHBOARD-DETAILS] [ROUTE-PUBLISHER-DASHBOARD-COMPANY] [ROUTE-PUBLISHER-DASHBOARD-CONTACT] submits a solution for review', async ({
			adminAPI,
			page,
		}) => {
			test.slow();

			const name = uniqueName('Submitted Solution').slice(0, 50);

			let submitted = false;

			const continueButton = page.getByRole('button', {
				exact: true,
				name: 'Continue',
			});

			try {
				await gotoPublisherDashboard(page, 'published-solutions');

				await page
					.getByRole('button', {name: 'New Solution Template'})
					.click();

				await expect(
					stepHeading(page, 'Create new solution')
				).toBeVisible();

				await clickContinue(page);

				await expect(
					stepHeading(page, 'Define the solution profile')
				).toBeVisible();

				await page.getByPlaceholder('Enter solution name').fill(name);
				await page
					.getByPlaceholder('Enter solution description')
					.fill('A solution the e2e suite submits.');
				await pickFirstMultiSelectOption(page, 'Categories');
				await pickFirstMultiSelectOption(page, 'Tags');

				await clickContinue(page);

				await expect(page).toHaveURL(/\/header$/);
				await expect(continueButton).toBeDisabled();

				await page
					.getByPlaceholder('Enter title header')
					.fill('An e2e solution header');
				await page.locator('.ql-editor').first().click();
				await page.keyboard.type('The header description.');
				await page.locator('input[type=file]').setInputFiles(PNG_FILE);

				await clickContinue(page);

				await expect(page).toHaveURL(/\/details$/);
				await expect(continueButton).toBeDisabled();

				for (const [index, title] of [
					'First block',
					'Second block',
				].entries()) {
					await page
						.getByRole('button', {name: 'Add Content Block'})
						.click();

					const dialog = page
						.getByRole('dialog')
						.filter({hasText: 'Select Content Block'});

					await dialog
						.getByRole('combobox', {name: 'Choose Block'})
						.selectOption({label: 'Text Block'});
					await dialog.getByRole('button', {name: 'Save'}).click();

					await page
						.getByPlaceholder('Enter title', {exact: true})
						.nth(index)
						.fill(title);
					await page.locator('.ql-editor').nth(index).click();
					await page.keyboard.type(`${title} text.`);

					if (!index) {
						await expect(continueButton).toBeDisabled();
					}
				}

				await expect(continueButton).toBeEnabled();

				await clickContinue(page);

				await expect(page).toHaveURL(/\/company$/);
				await expect(continueButton).toBeDisabled();

				await page.locator('.ql-editor').first().click();
				await page.keyboard.type('The company description.');
				await page
					.getByPlaceholder('http://www.yourdomain.com')
					.fill('https://example.com');
				await page
					.getByPlaceholder('name@yourdomain.com')
					.fill('company@example.com');
				await page
					.getByPlaceholder('+1 (123) 456-7890')
					.fill('+1 555 123 4567');

				await clickContinue(page);

				await expect(page).toHaveURL(/\/contact$/);

				const contactEmail = page.getByPlaceholder(
					'name@yourdomain.com'
				);

				await contactEmail.fill('not-an-email');

				await expect(continueButton).toBeDisabled();

				await contactEmail.fill('contact@example.com');

				await clickContinue(page);

				await expect(
					stepHeading(page, 'Review and Submit Solution')
				).toBeVisible();

				await expect(
					page.getByText('Second block text.')
				).toBeVisible();

				await page.getByRole('checkbox').check();

				await page
					.getByRole('button', {exact: true, name: 'Submit'})
					.click();

				await expect(page).not.toHaveURL(/\/submit$/, {timeout: 60000});

				submitted = true;

				await gotoPublisherDashboard(page, 'published-solutions');

				await expect(
					page.getByRole('row').filter({hasText: name})
				).toContainText('Pending');
			}
			finally {
				await deleteSubmittedProduct(adminAPI, name, {submitted});
			}
		});

		test('[FLOW-PUBLISHER-SOLUTION-SUBMISSION] [ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS] deletes a published solution', async ({
			adminAPI,
			page,
		}) => {
			const name = uniqueName('Deleted Solution');

			const {id: solutionCategoryId} = await adminAPI
				.get<{
					items: Array<{id: number; name: string}>;
				}>(
					'/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/PRDCT-TEST-PARTNER-PORTAL/categories'
				)
				.then(
					({items}) =>
						items.find((category) => category.name === 'solution')!
				);

			const {catalogId} = await adminAPI.getProductByERC<{
				catalogId: number;
			}>('PRDCT-TEST-PARTNER-PORTAL');

			const {productId} = await adminAPI.post<{productId: number}>(
				'/o/headless-commerce-admin-catalog/v1.0/products',
				{
					active: true,
					catalogId,
					categories: [{id: solutionCategoryId}],
					name: {en_US: name},
					productType: 'virtual',
				}
			);

			try {
				await gotoPublisherDashboard(page, 'published-solutions');

				const row = page.getByRole('row').filter({hasText: name});

				await expect(row).toContainText('Published');

				await row.getByRole('button', {name: 'actions'}).click();

				await page.getByRole('menuitem', {name: 'Delete'}).click();

				const dialog = page
					.getByRole('dialog')
					.filter({hasText: 'Confirm Deletion'});

				await expect(dialog).toContainText('Confirm Deletion');
				await expect(dialog).toContainText(`${name} will be deleted`);
				await expect(dialog).toContainText(
					/this action can.t be undone\./
				);

				await dialog.getByRole('button', {name: 'Confirm'}).click();

				await expect(
					page.getByText('Solution deleted successfully.')
				).toBeVisible();

				await expect(row).toHaveCount(0);
			}
			finally {
				await adminAPI.deleteIfExists(
					`/o/headless-commerce-admin-catalog/v1.0/products/${productId}`
				);
			}
		});
	});
});
