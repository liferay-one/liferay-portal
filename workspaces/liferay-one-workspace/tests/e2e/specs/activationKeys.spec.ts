/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI from '../utils/HeadlessAPI';
import {ACCOUNT_ERC, PROJECT_ERC} from '../utils/environmentUtils';
import {expectSettled, gotoMyAccount, tableRow} from '../utils/myAccountUtils';

/**
 * The project Activation section: the activation and license keys a project
 * holds, who may generate and manage them, and the per key actions. The
 * journeys act on the license keys `scripts/seed` provisions on the project
 * (07-license-key), and restore any key they deactivate.
 */

const ACTIVATION_PATH = `${ACCOUNT_ERC}/project/${PROJECT_ERC}/activation`;

const LICENSE_KEY_ERC =
	process.env.ONE_LICENSE_KEY_ERC?.trim() ||
	'C_LICENSE_KEY_OMNI_STANDALONE_1';

const LICENSE_KEY_ENVIRONMENT =
	process.env.ONE_LICENSE_KEY_ENVIRONMENT?.trim() ||
	'Omni Standalone Production';

async function openRowActions(page: Page, environmentName: string) {
	await tableRow(page, environmentName).getByRole('button').last().click();
}

async function confirmRowAction(
	page: Page,
	action: 'Deactivate' | 'Reactivate',
	modalTitle: string
) {
	await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

	await page.getByRole('menuitem', {name: action}).click();

	await expect(page.getByText(modalTitle, {exact: true})).toBeVisible();

	const patchResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'PATCH' &&
			/\/active$/.test(new URL(response.url()).pathname)
	);

	await page.getByRole('button', {name: 'Confirm'}).click();

	expect((await patchResponse).ok()).toBe(true);
}

async function readLicenseKeyActive(adminAPI: HeadlessAPI): Promise<boolean> {
	const {active} = await adminAPI.get<{active: boolean}>(
		`/o/c/licensekeys/by-external-reference-code/${LICENSE_KEY_ERC}`
	);

	return active;
}

async function restoreLicenseKey(adminAPI: HeadlessAPI, active: boolean) {
	await adminAPI.patch(
		`/o/c/licensekeys/by-external-reference-code/${LICENSE_KEY_ERC}`,
		{active}
	);
}

test.describe('[FLOW-ACTIVATION-KEYS] activation keys', () => {

	/**
	 * Every test reads or toggles the same seeded license key, so they run in
	 * order on one worker; a parallel deactivation would fail the reads.
	 */

	test.describe.configure({mode: 'default'});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] lists the project keys and offers New Key to an account admin', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await expect(
			page.getByText('Manage the activation keys within your project')
		).toBeVisible();

		const row = tableRow(page, LICENSE_KEY_ENVIRONMENT);

		await expect(row).toContainText('Liferay DXP');

		await expect(row).toContainText('Production');

		await expect(page.getByRole('button', {name: 'New Key'})).toBeVisible();

		await page
			.locator('liferay-one-custom-element[route="my-account"]')
			.getByPlaceholder('Search')
			.fill(LICENSE_KEY_ENVIRONMENT);

		await expect(row).toBeVisible();

		for (const visibleRow of await page.locator('tbody tr').all()) {
			await expect(visibleRow).toContainText(LICENSE_KEY_ENVIRONMENT);
		}
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] offers New Key to a project admin', async ({
		page,
		signIn,
	}) => {
		await signIn('PROJECT_ADMIN');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await expect(tableRow(page, LICENSE_KEY_ENVIRONMENT)).toBeVisible();

		await expect(page.getByRole('button', {name: 'New Key'})).toBeVisible();
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] lists keys read only to a project user', async ({
		page,
		signIn,
	}) => {
		await signIn('PROJECT_USER');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await expect(tableRow(page, LICENSE_KEY_ENVIRONMENT)).toBeVisible();

		await expect(page.getByRole('button', {name: 'New Key'})).toHaveCount(
			0
		);

		await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

		await expect(page.getByRole('menuitem', {name: 'View'})).toBeVisible();

		await expect(
			page.getByRole('menuitem', {name: 'Deactivate'})
		).toHaveCount(0);
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-LICENSEKEYERC] opens a key and returns to the list', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

		await page.getByRole('menuitem', {name: 'View'}).click();

		await expectSettled(page);

		await expect(page).toHaveURL(
			new RegExp(`#/${ACTIVATION_PATH}/[^/?]+$`)
		);

		await expect(
			page.getByText(/^(Activation|License) Key Details$/)
		).toBeVisible();

		for (const label of ['Type', 'Start Date', 'End Date', 'Status']) {
			await expect(
				page.getByText(label, {exact: true}).first()
			).toBeVisible();
		}

		await expect(
			page.getByRole('button', {name: 'Download'})
		).toBeEnabled();

		await page
			.getByRole('link', {name: /Activation/})
			.first()
			.click();

		await expect(page).toHaveURL(new RegExp(`#/${ACTIVATION_PATH}$`));
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] downloads a key as XML', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

		const downloadPromise = page.waitForEvent('download');

		await page.getByRole('menuitem', {name: 'Download'}).click();

		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/\.xml$/);
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] deactivates a key and reactivates it', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const wasActive = await readLicenseKeyActive(adminAPI);

		try {
			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, ACTIVATION_PATH);

			await confirmRowAction(
				page,
				'Deactivate',
				'Deactivate Activation Key'
			);

			await page.reload();

			await expectSettled(page);

			await expect(
				tableRow(page, LICENSE_KEY_ENVIRONMENT).locator(
					'[title="Not Activated"]'
				)
			).toBeVisible();

			await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

			await expect(
				page.getByRole('menuitem', {name: 'Download'})
			).toBeDisabled();

			await page.keyboard.press('Escape');

			await confirmRowAction(
				page,
				'Reactivate',
				'Reactivate Activation Key'
			);

			await page.reload();

			await expectSettled(page);

			await expect(
				tableRow(page, LICENSE_KEY_ENVIRONMENT).locator(
					'[title="Not Activated"]'
				)
			).toHaveCount(0);

			await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

			await expect(
				page.getByRole('menuitem', {name: 'Deactivate'})
			).toBeVisible();
		}
		finally {
			await restoreLicenseKey(adminAPI, wasActive);
		}
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-ACTIVATION] shows a deactivated license key as inactive without a reload', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const wasActive = await readLicenseKeyActive(adminAPI);

		try {
			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, ACTIVATION_PATH);

			await confirmRowAction(
				page,
				'Deactivate',
				'Deactivate Activation Key'
			);

			await openRowActions(page, LICENSE_KEY_ENVIRONMENT);

			test.fail(
				true,
				'Deactivating a license key that belongs to no activation key saves the change but leaves the row showing it active until the page reloads.'
			);

			test.info().annotations.push({
				description:
					'useProjectActivationKeys returns the revalidate of /o/c/activationkeys only; the /o/c/licensekeys list behind the unaggregated rows is never revalidated after PATCH /license-keys/{id}/active.',
				type: 'issue',
			});

			await expect(
				page.getByRole('menuitem', {name: 'Reactivate'})
			).toBeVisible({timeout: 5000});
		}
		finally {
			await restoreLicenseKey(adminAPI, wasActive);
		}
	});

	test('[FLOW-ACTIVATION-KEYS] [ROUTE-MY-ACCOUNT-GENERATE] starts the generate wizard from New Key', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, ACTIVATION_PATH);

		await page.getByRole('button', {name: 'New Key'}).click();

		await expect(page).toHaveURL(
			new RegExp(`#/${ACTIVATION_PATH}/generate`)
		);

		await expectSettled(page);

		await expect(
			page.getByRole('heading', {name: 'Generate Activation Key'})
		).toBeVisible();

		await expect(
			page.getByText(
				'Select the product and key type you would like to generate.'
			)
		).toBeVisible();

		const next = page.getByRole('button', {exact: true, name: 'Next'});

		await page
			.locator('select[name="productExternalReferenceCode"]')
			.selectOption({label: 'Liferay DXP'});

		await page
			.locator('select[name="keyType"]')
			.selectOption({label: 'Non-Production'});

		await page.locator('input[type="radio"]').first().check();

		await expect(next).toBeEnabled();

		await page.getByRole('button', {name: 'Cancel'}).click();

		await expect(page).toHaveURL(new RegExp(`#/${ACTIVATION_PATH}$`));
	});
});
