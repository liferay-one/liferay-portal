/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI from '../utils/HeadlessAPI';
import {sitePath} from '../utils/environmentUtils';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryBuyer,
	createTemporaryBuyer,
	deleteTemporaryBuyer,
	getAccountOrders,
} from '../utils/productPurchaseUtils';
import {CHECKOUT_TIMEOUT, PORTAL_TIMEOUT} from '../utils/timeoutConstants';

/**
 * The product purchase wizard (`/web/one/product-purchase?productId=`), from
 * the product display page that enters it to the order it places.
 *
 * Every journey that writes (a cart, an order, a postal address, the account's
 * billing address and tax ID) runs as a temporary buyer: a new customer user
 * on a new business account, created through the headless APIs and deleted
 * afterwards with everything the purchase left on it. A temporary buyer
 * belongs to one account, so the wizard skips the account step for them. The
 * journeys that need the account step sign in as the seeded Account Admin,
 * who belongs to every seed account, and never write.
 *
 * The products are looked up by external reference code at runtime, because
 * the product IDs the wizard takes are generated per environment.
 */

const BANK_TRANSFER_COMPLETED_PATTERN =
	/#\/bank-transfer-completed\?orderId=(\d+)/;

const CONTACT_SALES_URL = 'https://www.liferay.com/contact-sales';

const CUSTOM_FIELDS_ISSUE =
	'Purchase App PATCHes the whole cart, including the order and cart item ' +
	'custom fields, and an Account Administrator is forbidden to write order ' +
	'custom fields (403 on PATCH /o/headless-commerce-delivery-cart/v1.0/' +
	'carts/{id} with {"customFields":{...}}, while {"paymentMethod":...} ' +
	'alone returns 200). Only a portal administrator can place a paid order.';

const PURCHASE_COMPLETED_PATTERN = /#\/purchase-completed\?orderId=(\d+)/;

const PRODUCT_ERCS = {
	aiHub: 'PRDCT-AI-HUB',
	contentMarketingPlatform: 'PRDCT-CONTENT-MARKETING',
	digitalSalesRoom: 'PRDCT-DSR',
	dxpFreeTier: 'PRDCT-DXP',
	paidApp: 'PRDCT-APP',
	sampleApp: 'PRDCT-SAMPLE-APP',
	seoStudio: 'PRDCT-SEO',
};

async function getProductId(
	adminAPI: HeadlessAPI,
	externalReferenceCode: string
): Promise<number> {
	const {productId} = await adminAPI.getProductByERC(externalReferenceCode);

	return productId;
}

function purchasePath(productId: number | string): string {
	return sitePath(`/product-purchase?productId=${productId}`);
}

function stepTitle(page: Page, name: string) {
	return page.getByRole('heading', {exact: true, name});
}

/**
 * Waits for Purchase Completed and returns the order ID the page shows.
 */

async function expectPurchaseCompleted(page: Page): Promise<number> {
	await expect(page).toHaveURL(PURCHASE_COMPLETED_PATTERN, {
		timeout: CHECKOUT_TIMEOUT,
	});

	const orderId = Number(PURCHASE_COMPLETED_PATTERN.exec(page.url())?.[1]);

	await expect(page.getByText('Purchase Completed')).toBeVisible({
		timeout: PORTAL_TIMEOUT,
	});

	await expect(page.getByText('Your Order ID is:')).toBeVisible();

	await expect(page.getByText(String(orderId)).first()).toBeVisible();

	await expect(
		page.getByRole('button', {name: 'Go to My Apps'})
	).toBeVisible();

	return orderId;
}

/**
 * Asserts the order left Open (2). A checkout the portal refused leaves the
 * order Open, and an Open order never becomes a placed order the buyer sees.
 */

async function expectOrderPlaced(
	adminAPI: HeadlessAPI,
	buyer: TemporaryBuyer,
	orderId: number
): Promise<void> {
	await expect
		.poll(
			async () => {
				const orders = await getAccountOrders(
					adminAPI,
					buyer.account.id
				);

				return orders.find(({id}) => id === orderId)?.orderStatus;
			},
			{
				message:
					'expected the checkout to move the order past Open (2)',
				timeout: PORTAL_TIMEOUT,
			}
		)
		.not.toBe(2);
}

async function signInAsBuyer(page: Page, buyer: TemporaryBuyer) {
	await liferayLogin(page, buyer.email, buyer.password);
}

/**
 * Drives a paid app from License Selection to Summary with a new billing
 * address and the chosen payment method, asserting each step on the way.
 */

async function goToPaidSummary(
	page: Page,
	productId: number,
	paymentMethod: 'Pay with Bank Transfer' | 'Pay with Card'
) {
	await page.goto(purchasePath(productId));

	await expect(stepTitle(page, 'License Selection')).toBeVisible({
		timeout: PORTAL_TIMEOUT,
	});

	const licenseCard = page.locator('.product-purchase-license-card').first();

	const continueButton = page.getByRole('button', {name: 'Continue'});

	await expect(continueButton).toBeDisabled();

	await licenseCard.getByRole('button', {name: 'Add'}).click();

	await expect(
		licenseCard.locator('.product-purchase-license-card-stepper-count')
	).toHaveText('1');

	await expect(continueButton).toBeEnabled();

	await continueButton.click();

	await expect(stepTitle(page, 'Payment Method')).toBeVisible();

	await expect(continueButton).toBeDisabled();

	await page.getByRole('button', {name: 'New Address'}).click();

	const saveButton = page.getByRole('button', {exact: true, name: 'Save'});

	await expect(saveButton).toBeDisabled();

	await page.locator('#name').fill('E2E Buyer');
	await page.locator('#street1').fill('1400 Montefino Avenue');
	await page.locator('select[name="country"]').selectOption('US');
	await page.locator('select[name="regionISOCode"]').selectOption('CA');
	await page.locator('#city').fill('Diamond Bar');
	await page.locator('#zip').fill('91765');
	await page.locator('#phoneNumber').fill('5555555555');

	await expect(saveButton).toBeEnabled();

	await saveButton.click();

	await expect(page.getByText('1400 Montefino Avenue').first()).toBeVisible();

	await page
		.locator('.product-purchase-radio-card', {hasText: paymentMethod})
		.click();

	await expect(continueButton).toBeEnabled();

	await continueButton.click();

	await expect(stepTitle(page, 'Summary')).toBeVisible({
		timeout: PORTAL_TIMEOUT,
	});
}

test.describe('[FLOW-PRODUCT-PURCHASE-ENTRY] entering the purchase wizard', () => {
	test('[FLOW-PRODUCT-PURCHASE-ENTRY] a guest is sent to sign in', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		await page.goto(purchasePath(productId));

		await expect(page).toHaveURL(/\/c\/portal\/login|login/);
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] Get App on the product display page opens the wizard for that product', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(sitePath('/p/sample-marketplace-app'));

		const getAppButton = page.locator('#get-app');

		await expect(getAppButton).toBeVisible({timeout: PORTAL_TIMEOUT});

		await getAppButton.click();

		await expect(page).toHaveURL(
			new RegExp(`/product-purchase\\?productId=${productId}`)
		);

		await expect(stepTitle(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] Account Selection lists every account, preselects the current one, and advances with the selected account', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		const persona = await signIn('ACCOUNT_ADMIN');

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(page.getByText(persona.email).first()).toBeVisible();

		const accountCards = page.locator('.product-purchase-account-card');

		await expect
			.poll(() => accountCards.count(), {
				message: 'expected one card per account the user belongs to',
			})
			.toBeGreaterThan(1);

		await expect(
			accountCards.locator('input[type="radio"]:checked')
		).toHaveCount(1);

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await expect(continueButton).toBeEnabled();

		const selectedCard = accountCards.filter({
			hasText: 'No Project Test Account',
		});

		await selectedCard.click();

		await expect(selectedCard.locator('input[type="radio"]')).toBeChecked();

		await continueButton.click();

		await expect(page).toHaveURL(/#\/summary/);

		await expect(stepTitle(page, 'Summary')).toBeVisible();

		await expect(
			page.locator('.product-purchase-banner-title', {
				hasText: 'Sample Marketplace App',
			})
		).toBeVisible();

		await expect(
			page.getByText('No Project Test Account').first()
		).toBeVisible();
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] Cancel returns to the marketplace', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await page.getByRole('button', {name: 'Cancel'}).click();

		await expect(page).toHaveURL(new RegExp(`${sitePath('/marketplace')}`));
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] an unknown product renders Product Unavailable', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await page.goto(purchasePath(999999999));

		await expect(page.getByText('Product Unavailable')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(
			page.getByText('This product is no longer available.')
		).toBeVisible();
	});

	for (const [label, externalReferenceCode] of [
		['Content Marketing Platform', PRODUCT_ERCS.contentMarketingPlatform],
		['Digital Sales Room', PRODUCT_ERCS.digitalSalesRoom],
	]) {
		test(`[FLOW-PRODUCT-PURCHASE-ENTRY] [FLOW-CMP-CONTACT-SALES] ${label} renders Contact Sales instead of the wizard`, async ({
			adminAPI,
			page,
			signIn,
		}) => {
			const productId = await getProductId(
				adminAPI,
				externalReferenceCode
			);

			await signIn('ACCOUNT_ADMIN');

			await page.goto(purchasePath(productId));

			const contactSalesLink = page.getByRole('link', {
				name: 'Contact Sales',
			});

			await expect(contactSalesLink).toBeVisible({
				timeout: PORTAL_TIMEOUT,
			});

			await expect(contactSalesLink).toHaveAttribute(
				'href',
				CONTACT_SALES_URL
			);

			await expect(stepTitle(page, 'Account Selection')).toHaveCount(0);

			await expect(page.locator('.product-purchase-steps')).toHaveCount(
				0
			);
		});
	}
});

test.describe('[FLOW-CHECKOUT-FREE] free app checkout', () => {
	let buyer: TemporaryBuyer | undefined;

	test.afterEach(async ({adminAPI}) => {
		await deleteTemporaryBuyer(adminAPI, buyer);

		buyer = undefined;
	});

	test('[FLOW-CHECKOUT-FREE] [ROUTE-PRODUCT-PURCHASE-SUMMARY] [ROUTE-PRODUCT-PURCHASE-PURCHASE-COMPLETED] places a $0 order that appears in My Account', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		buyer = await createTemporaryBuyer(adminAPI, {
			billingAddress: true,
			label: 'Free Checkout',
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(page).toHaveURL(/#\/summary/, {timeout: PORTAL_TIMEOUT});

		await expect(stepTitle(page, 'Summary')).toBeVisible();

		await expect(page.getByText(buyer.account.name).first()).toBeVisible();

		await expect(page.getByText('Order Summary')).toBeVisible();

		await expect(page.getByText('$0.00').first()).toBeVisible();

		await expect(
			page.getByRole('button', {name: 'Back'}),
			'expected no Back button when the account step was skipped'
		).toHaveCount(0);

		const getAppButton = page.getByRole('button', {name: 'Get App'});

		await expect(getAppButton).toBeDisabled();

		await page.getByRole('checkbox').check();

		await expect(getAppButton).toBeEnabled();

		await getAppButton.click();

		const orderId = await expectPurchaseCompleted(page);

		await expectOrderPlaced(adminAPI, buyer, orderId);

		await page.goto(
			sitePath(
				`/my-account#/${buyer.account.externalReferenceCode}/orders`
			)
		);

		await expect(page.getByText('Orders List')).toBeVisible({
			timeout: CHECKOUT_TIMEOUT,
		});

		await expect(
			page.getByRole('table').getByText(String(orderId))
		).toBeVisible({timeout: PORTAL_TIMEOUT});
	});

	test('[FLOW-CHECKOUT-FREE] an account without a billing address is told the checkout failed rather than shown Purchase Completed', async ({
		adminAPI,
		page,
	}) => {
		const issue =
			'The checkout answers 200 with {"valid":true,"errorMessages":' +
			'["Invalid billing address"]} and leaves the order Open, while ' +
			'ProductPurchase.createOrder only rejects valid === false (the ' +
			'LPD-108267 fix). The wizard shows Purchase Completed for an order ' +
			'that was never placed, and placed-orders answers 404 for it.';

		test.info().annotations.push({description: issue, type: 'issue'});

		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		buyer = await createTemporaryBuyer(adminAPI, {
			label: 'No Billing Address',
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Summary')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await page.getByRole('checkbox').check();

		test.fail(true, issue);

		await page.getByRole('button', {name: 'Get App'}).click();

		await expect(
			page.getByText('An unexpected error occurred.')
		).toBeVisible({timeout: PORTAL_TIMEOUT});

		await expect(page).not.toHaveURL(PURCHASE_COMPLETED_PATTERN);
	});

	test('[FLOW-CHECKOUT-FREE] a member without an account role cannot place the order', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.sampleApp);

		buyer = await createTemporaryBuyer(adminAPI, {
			accountRole: null,
			billingAddress: true,
			label: 'No Role Checkout',
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Summary')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await page.getByRole('checkbox').check();

		await page.getByRole('button', {name: 'Get App'}).click();

		await expect(
			page.getByText('An unexpected error occurred.')
		).toBeVisible({timeout: PORTAL_TIMEOUT});

		await expect(page).not.toHaveURL(PURCHASE_COMPLETED_PATTERN);

		const orders = await getAccountOrders(adminAPI, buyer.account.id);

		expect(
			orders.filter(({orderStatus}) => orderStatus !== 2),
			'expected no placed order on the account'
		).toHaveLength(0);
	});
});

test.describe('[FLOW-CHECKOUT-PAID] paid app checkout', () => {
	let buyer: TemporaryBuyer | undefined;

	test.afterEach(async ({adminAPI}) => {
		await deleteTemporaryBuyer(adminAPI, buyer);

		buyer = undefined;
	});

	test('[FLOW-CHECKOUT-PAID] [ROUTE-PRODUCT-PURCHASE-LICENSE] the license stepper gates Continue on a quantity above zero', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.paidApp);

		buyer = await createTemporaryBuyer(adminAPI, {
			label: 'License Stepper',
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'License Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(page.getByText('1 License: $ 99.00')).toBeVisible();

		const licenseCard = page
			.locator('.product-purchase-license-card')
			.first();

		const count = licenseCard.locator(
			'.product-purchase-license-card-stepper-count'
		);

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await expect(count).toHaveText('0');
		await expect(continueButton).toBeDisabled();

		for (const expectedCount of ['1', '2']) {
			await licenseCard.getByRole('button', {name: 'Add'}).click();

			await expect(count).toHaveText(expectedCount);
		}

		await expect(continueButton).toBeEnabled();

		for (const expectedCount of ['1', '0']) {
			await licenseCard.getByRole('button', {name: 'Remove'}).click();

			await expect(count).toHaveText(expectedCount);
		}

		await expect(continueButton).toBeDisabled();
	});

	test('[FLOW-CHECKOUT-PAID] [ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] [ROUTE-PRODUCT-PURCHASE-SUMMARY] a new billing address and bank transfer reach a priced summary', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.paidApp);

		buyer = await createTemporaryBuyer(adminAPI, {label: 'Paid Summary'});

		await signInAsBuyer(page, buyer);

		await goToPaidSummary(page, productId, 'Pay with Bank Transfer');

		await expect(page.getByText('Pay with Bank Transfer')).toBeVisible();
		await expect(
			page.getByText('1400 Montefino Avenue').first()
		).toBeVisible();

		for (const label of ['Net Price:', 'VAT:', 'Total:']) {
			await expect(page.getByText(label)).toBeVisible();
		}

		await expect(page.getByText('$ 99.00').first()).toBeVisible();

		const purchaseButton = page.getByRole('button', {name: 'Purchase App'});

		await expect(purchaseButton).toBeDisabled();

		await page.getByRole('checkbox').check();

		await expect(purchaseButton).toBeEnabled();

		const account = await adminAPI.get<{
			defaultBillingAddressId?: number;
			postalAddresses?: Array<{id: number; streetAddressLine1: string}>;
		}>(
			`/o/headless-admin-user/v1.0/accounts/${buyer.account.id}?nestedFields=postalAddresses`
		);

		expect(
			account.defaultBillingAddressId,
			'expected the new address to become the default billing address'
		).toBeTruthy();
	});

	test('[FLOW-CHECKOUT-PAID] [ROUTE-PRODUCT-PURCHASE-BANK-TRANSFER-COMPLETED] Purchase App with bank transfer places the order', async ({
		adminAPI,
		page,
	}) => {
		test.info().annotations.push({
			description: CUSTOM_FIELDS_ISSUE,
			type: 'issue',
		});

		const productId = await getProductId(adminAPI, PRODUCT_ERCS.paidApp);

		buyer = await createTemporaryBuyer(adminAPI, {label: 'Bank Transfer'});

		await signInAsBuyer(page, buyer);

		await goToPaidSummary(page, productId, 'Pay with Bank Transfer');

		await page.getByRole('checkbox').check();

		test.fail(true, CUSTOM_FIELDS_ISSUE);

		await page.getByRole('button', {name: 'Purchase App'}).click();

		await expect(page).toHaveURL(BANK_TRANSFER_COMPLETED_PATTERN, {
			timeout: PORTAL_TIMEOUT,
		});

		await expect(page.getByText('Order Confirmation')).toBeVisible();

		await expect(
			page.getByText(
				'You will receive an invoice via email with the instructions to complete your bank transfer payment.'
			)
		).toBeVisible();
	});

	test('[FLOW-CHECKOUT-PAID] Purchase App with a card hands the buyer to PayPal', async ({
		adminAPI,
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Paying by card leaves for PayPal, which is only intercepted when stubbed'
		);

		test.info().annotations.push({
			description: CUSTOM_FIELDS_ISSUE,
			type: 'issue',
		});

		const payPalURL = 'https://www.sandbox.paypal.com/e2e-checkout';

		const productId = await getProductId(adminAPI, PRODUCT_ERCS.paidApp);

		buyer = await createTemporaryBuyer(adminAPI, {label: 'Card Payment'});

		await signInAsBuyer(page, buyer);

		await goToPaidSummary(page, productId, 'Pay with Card');

		await page.route('**/carts/*/payment-url*', (route) =>
			route.fulfill({body: payPalURL, contentType: 'text/plain'})
		);

		await page.route(`${payPalURL}**`, (route) =>
			route.fulfill({body: 'PayPal', contentType: 'text/html'})
		);

		await page.getByRole('checkbox').check();

		test.fail(true, CUSTOM_FIELDS_ISSUE);

		await page.getByRole('button', {name: 'Purchase App'}).click();

		await expect(page).toHaveURL(new RegExp(payPalURL), {
			timeout: PORTAL_TIMEOUT,
		});
	});
});

test.describe('[FLOW-PRODUCT-PURCHASE-ENTRY] product specific steps', () => {
	let buyer: TemporaryBuyer | undefined;

	test.afterEach(async ({adminAPI}) => {
		await deleteTemporaryBuyer(adminAPI, buyer);

		buyer = undefined;
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] [ROUTE-PRODUCT-PURCHASE-ACTIVATION-KEY-FORM] the DXP free tier form validates before it offers the key', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(
			adminAPI,
			PRODUCT_ERCS.dxpFreeTier
		);

		buyer = await createTemporaryBuyer(adminAPI, {label: 'DXP Free'});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(page).toHaveURL(/#\/activation-key-form/, {
			timeout: PORTAL_TIMEOUT,
		});

		await expect(stepTitle(page, 'Activation Key Creation')).toBeVisible();

		const getKeyButton = page.getByRole('button', {
			name: 'Get Activation Key',
		});

		await expect(getKeyButton).toBeDisabled();

		const fullName = page.getByPlaceholder('Enter your full name');

		await fullName.fill('');
		await fullName.blur();

		await expect(page.getByText('Full name is required')).toBeVisible();

		const companyName = page.locator('#companyName');

		await companyName.fill('ab');
		await companyName.blur();

		await expect(page.getByText('Company name is required')).toBeVisible();

		await fullName.fill('E2E Buyer');
		await companyName.fill('E2E Company');

		await page
			.locator('select[name="country"]')
			.selectOption('United States');

		await page.locator('.activation-key-form-select-input').click();

		await page
			.locator('.dropdown-menu-purpose')
			.getByText('Proof of Concept (POC)')
			.click();

		await page
			.getByPlaceholder('Enter domain here')
			.fill('e2e.example.com');

		await expect(getKeyButton).toBeDisabled();

		await page.locator('#terms-and-conditions').check();
		await page.locator('#user-agreement').check();

		await expect(getKeyButton).toBeEnabled();

		await expect(page.getByText('Full name is required')).toHaveCount(0);
		await expect(page.getByText('Company name is required')).toHaveCount(0);
	});

	test('[FLOW-PRODUCT-PURCHASE-ENTRY] [ROUTE-PRODUCT-PURCHASE-PROJECT] AI Hub holds a buyer with no project on Project Selection', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.aiHub);

		buyer = await createTemporaryBuyer(adminAPI, {
			label: 'AI Hub No Project',
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Project Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(
			page.getByRole('button', {name: 'Continue'})
		).toBeDisabled();
	});

	test('[FLOW-PRODUCT-PURCHASE-CONTRACT] [ROUTE-PRODUCT-PURCHASE-CONTRACT] AI Hub invites a project without contracts to contact sales', async ({
		adminAPI,
		page,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.aiHub);

		const projectName = 'E2E Contractless Project';

		buyer = await createTemporaryBuyer(adminAPI, {
			label: 'AI Hub No Contract',
			projectName,
		});

		await signInAsBuyer(page, buyer);

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Project Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await page.getByText(projectName).click();

		await expect(continueButton).toBeEnabled();

		await continueButton.click();

		await expect(stepTitle(page, 'Contract Selection')).toBeVisible();

		await expect(
			page.getByText(
				/It looks like this project does not have any contracts yet/
			)
		).toBeVisible();

		await expect(continueButton).toBeDisabled();
	});

	test('[FLOW-PRODUCT-PURCHASE-CONTRACT] [ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM] AI Hub holds the buyer on Contract Selection until a contract is chosen', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.aiHub);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await page
			.locator('.product-purchase-account-card', {
				hasText: 'Omni Test Account',
			})
			.first()
			.click();

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await continueButton.click();

		await expect(stepTitle(page, 'Project Selection')).toBeVisible();

		await page.getByText('Omni Project', {exact: true}).click();

		await continueButton.click();

		await expect(stepTitle(page, 'Contract Selection')).toBeVisible();

		await expect(continueButton).toBeDisabled();

		const contractCard = page.locator('.radio-card').first();

		await contractCard.click();

		await expect(contractCard).toHaveClass(/radio-selected/);

		await expect(continueButton).toBeEnabled();

		await continueButton.click();

		await expect(stepTitle(page, 'AI Hub Account Details')).toBeVisible();
	});

	test('[FLOW-SEO-STUDIO-SIGNUP] [ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM] an account without an AI Hub order gets the requirements modal instead of the next step', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const productId = await getProductId(adminAPI, PRODUCT_ERCS.seoStudio);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(purchasePath(productId));

		await expect(stepTitle(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await page
			.locator('.product-purchase-account-card', {
				hasText: 'Omni Test Account',
			})
			.first()
			.click();

		await page.getByRole('button', {name: 'Continue'}).click();

		const modal = page.getByRole('dialog');

		await expect(
			modal.getByText('SEO&AEO Studio Beta Requirements')
		).toBeVisible();

		await expect(
			modal.getByText(
				'This product is only available for AI Hub customers.'
			)
		).toBeVisible();

		await modal.getByRole('button', {name: 'Cancel'}).click();

		await expect(modal).toHaveCount(0);

		await expect(stepTitle(page, 'Account Selection')).toBeVisible();

		await expect(page).not.toHaveURL(/#\/project/);
	});
});
