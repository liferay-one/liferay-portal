/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI from '../utils/HeadlessAPI';
import {sitePath} from '../utils/environmentUtils';
import {liferayLogin} from '../utils/loginUtils';
import {expectSettled, tableRow} from '../utils/myAccountUtils';
import {
	TemporaryBuyer,
	createTemporaryBuyer,
	deleteTemporaryBuyer,
} from '../utils/productPurchaseUtils';
import {CHECKOUT_TIMEOUT, PORTAL_TIMEOUT} from '../utils/timeoutConstants';

type ActivationKey = {
	endDate: string;
	id: number;
	licenseKeyFamily: string;
	startDate: string;
};

type Entitlement = {
	endDate?: string;
	id: number;
	licenseKeyDurationDays?: number;
	name: string;
};

type HeadlessPage<T> = {
	items: T[];
};

type LicenseKey = {
	id: number;
	licenseKeyFamily: string;
};

type TrialProduct = {
	externalReferenceCode: string;
	solutionType: 'cmp' | 'dsr';
	trialExternalReferenceCode: string;
};

const CMP_TRIAL: TrialProduct = {
	externalReferenceCode: 'PRDCT-CONTENT-MARKETING',
	solutionType: 'cmp',
	trialExternalReferenceCode: 'PRDCT-CONTENT-MARKETING-TRIAL',
};

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

const DSR_TRIAL: TrialProduct = {
	externalReferenceCode: 'PRDCT-DSR',
	solutionType: 'dsr',
	trialExternalReferenceCode: 'PRDCT-DSR-TRIAL',
};

const PROSPECT_LICENSE_KEY_DURATION_DAYS = 30;

const TRIAL_TIMEOUT = 5 * 60 * 1000;

async function deleteAccountKeys(
	adminAPI: HeadlessAPI,
	buyer: TemporaryBuyer | undefined
) {
	if (!buyer) {
		return;
	}

	for (const [path, relationshipField] of [
		['/o/c/licensekeys', 'r_accountEntryToLicenseKey_accountEntryId'],
		['/o/c/activationkeys', 'r_accountEntryToActivationKey_accountEntryId'],
	]) {
		const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
			`${path}?filter=${encodeURIComponent(
				`${relationshipField} eq '${buyer.account.id}'`
			)}&pageSize=100`
		);

		for (const {id} of items) {
			await adminAPI.deleteIfExists(`${path}/${id}`);
		}
	}
}

async function expectTrialKeyListed(
	adminAPI: HeadlessAPI,
	page: Page,
	trialProduct: TrialProduct
) {
	await expect(page).toHaveURL(
		new RegExp(
			`/project/one-time-purchases/products/${trialProduct.trialExternalReferenceCode}$`
		),
		{timeout: CHECKOUT_TIMEOUT}
	);

	await expectSettled(page);

	const {name} = await adminAPI.getProductByERC(
		trialProduct.trialExternalReferenceCode
	);

	await expect(
		page.getByRole('heading', {exact: true, level: 1, name: name.en_US})
	).toBeVisible({timeout: PORTAL_TIMEOUT});

	await page
		.getByRole('link', {name: /Activation/})
		.first()
		.click();

	await expect(page).toHaveURL(/\/project\/one-time-purchases\/activation$/);

	await expectSettled(page);

	await expect(tableRow(page, getEnvironmentName(trialProduct))).toBeVisible({
		timeout: PORTAL_TIMEOUT,
	});
}

async function getAccountActivationKeys(
	adminAPI: HeadlessAPI,
	buyer: TemporaryBuyer
): Promise<ActivationKey[]> {
	const {items} = await adminAPI.get<HeadlessPage<ActivationKey>>(
		`/o/c/activationkeys?filter=${encodeURIComponent(
			`r_accountEntryToActivationKey_accountEntryId eq '${buyer.account.id}'`
		)}&pageSize=100`
	);

	return items;
}

async function getAccountEntitlements(
	adminAPI: HeadlessAPI,
	buyer: TemporaryBuyer
): Promise<Entitlement[]> {
	const {items} = await adminAPI.get<HeadlessPage<Entitlement>>(
		`/o/c/entitlements?filter=${encodeURIComponent(
			`r_accountEntryToEntitlement_accountEntryId eq '${buyer.account.id}'`
		)}&pageSize=100`
	);

	return items;
}

async function getActivationKeyLicenseKeys(
	activationKey: ActivationKey,
	adminAPI: HeadlessAPI
): Promise<LicenseKey[]> {
	const {items} = await adminAPI.get<HeadlessPage<LicenseKey>>(
		`/o/c/licensekeys?filter=${encodeURIComponent(
			`r_activationKeyToLicenseKey_c_activationKeyId eq '${activationKey.id}'`
		)}&pageSize=100`
	);

	return items;
}

function getEnvironmentName(trialProduct: TrialProduct) {
	return `E2E ${trialProduct.solutionType.toUpperCase()} Trial`;
}

function getDurationDays(activationKey: ActivationKey): number {
	return Math.round(
		(Date.parse(activationKey.endDate) -
			Date.parse(activationKey.startDate)) /
			DAY_MILLISECONDS
	);
}

async function startTrial(
	adminAPI: HeadlessAPI,
	page: Page,
	trialProduct: TrialProduct
) {
	const {urls} = await adminAPI.getProductByERC<{
		urls: Record<string, string>;
	}>(trialProduct.externalReferenceCode);

	await page.goto(sitePath(`/p/${urls.en_US}`));

	const startTrialButton = page.locator('button#start-trial');

	await expect(startTrialButton).toBeVisible({timeout: PORTAL_TIMEOUT});

	await startTrialButton.click();

	await expect(page).toHaveURL(/#\/activation-key-form/, {
		timeout: PORTAL_TIMEOUT,
	});

	await submitActivationKeyForm(page, trialProduct);
}

async function submitActivationKeyForm(page: Page, trialProduct: TrialProduct) {
	await expect(
		page.getByRole('heading', {
			exact: true,
			name: 'Activation Key Creation',
		})
	).toBeVisible();

	await expect(page.getByPlaceholder('Enter domain here')).toHaveCount(0);

	await page.getByPlaceholder('Enter your full name').fill('E2E Buyer');
	await page.locator('#companyName').fill('E2E Company');

	await page.locator('select[name="country"]').selectOption('United States');

	await page.locator('.activation-key-form-select-input').click();

	await page
		.locator('.dropdown-menu-purpose')
		.getByText('Proof of Concept (POC)')
		.click();

	await page
		.locator('#environmentName')
		.fill(getEnvironmentName(trialProduct));

	await page.getByRole('button', {name: 'IP Addresses'}).click();

	await page.locator('#serverValue').fill('not an ip');

	await expect(
		page.getByText('Enter a valid IP address on each line.')
	).toBeVisible();

	await page.getByRole('button', {name: 'Host Name'}).click();

	await page.locator('#serverValue').fill('e2e-trial.example.com');

	await page.locator('#terms-and-conditions').check();
	await page.locator('#user-agreement').check();

	await page.getByRole('button', {name: 'Get Activation Key'}).click();
}

test.describe('[FLOW-SELF-SERVICE-TRIAL] CMP and DSR self service trials', () => {
	let buyer: TemporaryBuyer | undefined;

	test.beforeEach(async ({page}) => {
		await page.route('**://pages.liferay.com/**', (route) => route.abort());
	});

	test.afterEach(async ({adminAPI}) => {
		try {
			await deleteAccountKeys(adminAPI, buyer);
		}
		finally {
			await deleteTemporaryBuyer(adminAPI, buyer);

			buyer = undefined;
		}
	});

	test('[FLOW-SELF-SERVICE-TRIAL] a prospect starts a CMP trial from the product page and generates a 30 day DXP key', async ({
		adminAPI,
		page,
	}) => {
		test.setTimeout(TRIAL_TIMEOUT);

		buyer = await createTemporaryBuyer(adminAPI, {
			billingAddress: true,
			label: 'CMP Trial',
		});

		await liferayLogin(page, buyer.email, buyer.password);

		await startTrial(adminAPI, page, CMP_TRIAL);

		await expectTrialKeyListed(adminAPI, page, CMP_TRIAL);

		const [activationKey] = await getAccountActivationKeys(adminAPI, buyer);

		expect(getDurationDays(activationKey)).toBe(
			PROSPECT_LICENSE_KEY_DURATION_DAYS
		);

		expect(
			(await getActivationKeyLicenseKeys(activationKey, adminAPI))
				.map(({licenseKeyFamily}) => licenseKeyFamily)
				.sort()
		).toEqual(['CMP', 'DXP']);

		const entitlements = await getAccountEntitlements(adminAPI, buyer);

		expect(entitlements).toHaveLength(2);

		for (const entitlement of entitlements) {
			expect(entitlement.licenseKeyDurationDays).toBe(
				PROSPECT_LICENSE_KEY_DURATION_DAYS
			);
			expect(entitlement.endDate).toBeTruthy();
		}
	});

	test('[FLOW-SELF-SERVICE-TRIAL] an account that started a CMP trial starts a DSR trial and gets its own DXP key', async ({
		adminAPI,
		page,
	}) => {
		test.setTimeout(2 * TRIAL_TIMEOUT);

		buyer = await createTemporaryBuyer(adminAPI, {
			billingAddress: true,
			label: 'CMP and DSR Trials',
		});

		await liferayLogin(page, buyer.email, buyer.password);

		await startTrial(adminAPI, page, CMP_TRIAL);

		await expectTrialKeyListed(adminAPI, page, CMP_TRIAL);

		await startTrial(adminAPI, page, DSR_TRIAL);

		await expectTrialKeyListed(adminAPI, page, DSR_TRIAL);

		const activationKeys = await getAccountActivationKeys(adminAPI, buyer);

		expect(activationKeys).toHaveLength(2);

		const licenseKeyFamilies: string[][] = [];

		for (const activationKey of activationKeys) {
			expect(getDurationDays(activationKey)).toBe(
				PROSPECT_LICENSE_KEY_DURATION_DAYS
			);

			licenseKeyFamilies.push(
				(await getActivationKeyLicenseKeys(activationKey, adminAPI))
					.map(({licenseKeyFamily}) => licenseKeyFamily)
					.sort()
			);
		}

		expect(licenseKeyFamilies.sort()).toEqual([
			['CMP', 'DXP'],
			['DSR', 'DXP'],
		]);

		const entitlements = await getAccountEntitlements(adminAPI, buyer);

		expect(entitlements).toHaveLength(4);

		for (const entitlement of entitlements) {
			expect(entitlement.endDate).toBeTruthy();
		}
	});

	test('[FLOW-SELF-SERVICE-TRIAL] an account that started a CMP trial cannot start a second one', async ({
		adminAPI,
		page,
	}) => {
		test.setTimeout(TRIAL_TIMEOUT);

		const secondTrialBuyer = await createTemporaryBuyer(adminAPI, {
			billingAddress: true,
			label: 'Second CMP Trial',
		});

		buyer = secondTrialBuyer;

		await liferayLogin(
			page,
			secondTrialBuyer.email,
			secondTrialBuyer.password
		);

		await startTrial(adminAPI, page, CMP_TRIAL);

		await expectTrialKeyListed(adminAPI, page, CMP_TRIAL);

		await expect
			.poll(
				async () =>
					(await getAccountEntitlements(adminAPI, secondTrialBuyer))
						.length,
				{timeout: PORTAL_TIMEOUT}
			)
			.toBe(2);

		await startTrial(adminAPI, page, CMP_TRIAL);

		await expect(
			page.getByText(
				'This account has already started a trial of this product.'
			)
		).toBeVisible({timeout: PORTAL_TIMEOUT});

		await expect(page).toHaveURL(/#\/activation-key-form/);

		expect(
			await getAccountEntitlements(adminAPI, secondTrialBuyer)
		).toHaveLength(2);
	});
});
