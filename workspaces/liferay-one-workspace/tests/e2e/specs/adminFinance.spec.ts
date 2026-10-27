/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {readFile} from 'fs/promises';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI, {HeadlessPage} from '../utils/HeadlessAPI';
import {
	adminApp,
	clickRowAction,
	expectAdminSettled,
	gotoAdmin,
	rowWithText,
	tableRows,
	toast,
} from '../utils/adminUtils';
import {
	TemporaryBuyer,
	createTemporaryBuyer,
	deleteTemporaryBuyer,
} from '../utils/productPurchaseUtils';

const LIFERAY_SUPPLIER_ACCOUNT_ERC = 'ACCNT-020';

const ORDERS_PATH = '/o/headless-commerce-admin-order/v1.0/orders';

const ORDER_STATUS_PENDING = 1;

const PAYMENT_STATUS_PENDING = 1;

const SALES_SUMMARIES_PATH = '/o/c/publishersalessummaries';

const TEST_SUPPLIER_ACCOUNT_ERC = 'ACCNT-021';

type SalesSummary = {
	id: number;
	paidBy?: string;
	paidDate?: string;
	paymentStatus: {key: string};
	quarter: string;
	r_accountEntryToPublisherSalesSummary_accountEntryERC: string;
};

async function createUnpaidOrder(
	adminAPI: HeadlessAPI
): Promise<{buyer: TemporaryBuyer; orderId: number}> {
	const buyer = await createTemporaryBuyer(adminAPI, {label: 'Finance'});

	try {
		const [channel, skus] = await Promise.all([
			adminAPI.get<{id: number}>(
				'/o/headless-commerce-admin-channel/v1.0/channels/by-externalReferenceCode/LIFERAY_ONE_CHANNEL'
			),
			adminAPI.get<HeadlessPage<{id: number}>>(
				'/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/marketplace-product-18657298/skus'
			),
		]);

		const order = await adminAPI.post<{id: number}>(ORDERS_PATH, {
			accountId: buyer.account.id,
			channelId: channel.id,
			currencyCode: 'USD',
			orderItems: [
				{
					finalPrice: 99,
					quantity: 1,
					skuId: skus.items[0].id,
					unitPrice: 99,
				},
			],
			orderStatus: ORDER_STATUS_PENDING,
			orderTypeExternalReferenceCode: 'DXP_APP',
			paymentStatus: PAYMENT_STATUS_PENDING,
			subtotal: 99,
			total: 99,
		});

		return {buyer, orderId: order.id};
	}
	catch (error) {
		await deleteTemporaryBuyer(adminAPI, buyer);

		throw error;
	}
}

async function getSalesSummary(
	adminAPI: HeadlessAPI,
	accountExternalReferenceCode: string,
	quarter: string
): Promise<SalesSummary> {
	const {items} = await adminAPI.get<HeadlessPage<SalesSummary>>(
		`${SALES_SUMMARIES_PATH}?pageSize=50`
	);

	const salesSummary = items.find(
		(item) =>
			item.quarter === quarter &&
			item.r_accountEntryToPublisherSalesSummary_accountEntryERC ===
				accountExternalReferenceCode
	);

	if (!salesSummary) {
		throw new Error(
			`Unable to find the ${quarter} sales summary for ${accountExternalReferenceCode}`
		);
	}

	return salesSummary;
}

async function restoreSalesSummary(
	adminAPI: HeadlessAPI,
	salesSummary: SalesSummary
): Promise<void> {
	await adminAPI.patch(`${SALES_SUMMARIES_PATH}/${salesSummary.id}`, {
		paidBy: salesSummary.paidBy ?? '',
		paidDate: salesSummary.paidDate ?? '',
		paymentStatus: {key: salesSummary.paymentStatus.key},
	});
}

test.beforeEach(async ({signIn}) => {
	await signIn('FINANCE_ADMIN');
});

test.describe('[FLOW-ADMIN-FINANCE] finance orders', () => {
	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-FINANCE-ORDERS] lists only orders that cost something', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-finance-orders');

		const app = adminApp(page);

		await expect(app.getByText('Last Orders', {exact: true})).toBeVisible();

		await expect(
			app.getByText('Section that shows the latest sales made.')
		).toBeVisible();

		for (const column of [
			'ID',
			'Date',
			'Account',
			'App',
			'Payment Status',
			'Total',
		]) {
			await expect(
				app.locator('main table thead').getByText(column, {exact: true})
			).toBeVisible();
		}

		const totals = await tableRows(page)
			.locator('td:nth-child(6)')
			.allInnerTexts();

		expect(totals.length).toBeGreaterThan(0);

		for (const total of totals) {
			expect(Number(total.replace(/[^\d.]/g, ''))).toBeGreaterThan(0);
		}
	});

	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-FINANCE-ORDERS] filters the orders by payment status from the URL', async ({
		page,
	}) => {
		test.info().annotations.push({
			description:
				'The Payment Status filter of the finance orders builds ' +
				'paymentStatusInfo/code eq <code>, which the admin order API ' +
				'rejects with "A property used in the filter criteria is not ' +
				'supported", so the list shows No Orders Yet for any status.',
			type: 'issue',
		});

		await gotoAdmin(page, 'mp-finance-orders', {
			filter: JSON.stringify({'paymentStatusInfo/code': ['0']}),
			filterSchema: 'financeDashboardOrders',
		});

		test.fail();

		const statuses = await tableRows(page)
			.locator('td:nth-child(5)')
			.allInnerTexts();

		expect(statuses.length).toBeGreaterThan(0);

		for (const status of statuses) {
			expect(status).toContain('Paid');
			expect(status).not.toContain('Unpaid');
		}
	});

	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-FINANCE-ORDERS] marks an unpaid order as paid from the list', async ({
		adminAPI,
		page,
	}) => {
		const {buyer, orderId} = await createUnpaidOrder(adminAPI);

		try {
			await gotoAdmin(page, 'mp-finance-orders');

			const row = rowWithText(page, String(orderId));

			await expect(row).toContainText('Unpaid');

			await clickRowAction(row, 'Mark as Paid');

			await expect(toast(page, 'Order marked as paid.')).toBeVisible();

			await expect(row).not.toContainText('Unpaid');
			await expect(row).toContainText('Paid');

			const order = await adminAPI.get<{paymentStatus: number}>(
				`${ORDERS_PATH}/${orderId}`
			);

			expect(order.paymentStatus).toBe(0);

			await row.getByRole('button', {name: /^actions$/i}).click();

			await expect(
				page.getByRole('menuitem', {name: 'Mark as Paid'})
			).toBeDisabled();
		}
		finally {
			await deleteTemporaryBuyer(adminAPI, buyer);
		}
	});

	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID] shows the order details and marks the order as paid from them', async ({
		adminAPI,
		page,
	}) => {
		const {buyer, orderId} = await createUnpaidOrder(adminAPI);

		try {
			await gotoAdmin(page, 'mp-finance-orders');

			await clickRowAction(
				rowWithText(page, String(orderId)),
				'View Details'
			);

			await expectAdminSettled(page);

			await expect(page).toHaveURL(
				new RegExp(`#/mp-finance-orders/${orderId}$`)
			);

			const app = adminApp(page);

			await expect(
				app.getByRole('heading', {name: String(orderId)})
			).toBeVisible();

			for (const card of [
				'Account Details',
				'Transaction Details',
				'Order Details',
			]) {
				await expect(app.getByText(card, {exact: true})).toBeVisible();
			}

			await expect(
				app
					.getByText('Liferay Commerce Connector to PunchOut2Go')
					.first()
			).toBeVisible();

			const markAsPaidButton = app.getByRole('button', {
				name: 'Mark as Paid',
			});

			await markAsPaidButton.click();

			await expect(toast(page, 'Order marked as paid.')).toBeVisible();

			await expect(markAsPaidButton).toBeHidden();

			await expect
				.poll(
					async () =>
						(
							await adminAPI.get<{paymentStatus: number}>(
								`${ORDERS_PATH}/${orderId}`
							)
						).paymentStatus
				)
				.toBe(0);

			await app
				.getByRole('link', {name: 'Back to Finance Orders'})
				.click();

			await expect(page).toHaveURL(/#\/mp-finance-orders$/);
		}
		finally {
			await deleteTemporaryBuyer(adminAPI, buyer);
		}
	});
});

test.describe('[FLOW-ADMIN-FINANCE] publisher payments', () => {
	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-PAYMENTS] lists the publisher payouts per quarter', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-payments');

		const app = adminApp(page);

		await expect(app.getByText('Payments', {exact: true})).toBeVisible();

		const liferaySupplierQ1 = rowWithText(
			page,
			'Liferay Supplier Account'
		).filter({hasText: 'Q1 2026'});

		await expect(liferaySupplierQ1).toContainText('$3,000.00');
		await expect(liferaySupplierQ1).toContainText('$600.00');
		await expect(liferaySupplierQ1).toContainText('$2,400.00');

		await expect(
			rowWithText(page, 'Liferay Supplier Account').filter({
				hasText: 'Q4 2025',
			})
		).toContainText('Paid');
	});

	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-PAYMENTS] marks a publisher payout as paid from the list', async ({
		adminAPI,
		page,
	}) => {
		const salesSummary = await getSalesSummary(
			adminAPI,
			TEST_SUPPLIER_ACCOUNT_ERC,
			'Q1 2026'
		);

		try {
			await gotoAdmin(page, 'mp-payments');

			const row = rowWithText(page, 'Test Supplier Account').filter({
				hasText: 'Q1 2026',
			});

			await expect(row).toContainText('Unpaid');

			await clickRowAction(row, 'Mark as Paid');

			await expect(toast(page, 'Marked as paid.')).toBeVisible();

			await expect(row).not.toContainText('Unpaid');

			const updatedSalesSummary = await getSalesSummary(
				adminAPI,
				TEST_SUPPLIER_ACCOUNT_ERC,
				'Q1 2026'
			);

			expect(updatedSalesSummary.paymentStatus.key).toBe('paid');
			expect(updatedSalesSummary.paidBy).toBe('Finance Admin');
			expect(updatedSalesSummary.paidDate).toBeTruthy();
		}
		finally {
			await restoreSalesSummary(adminAPI, salesSummary);
		}
	});

	test('[FLOW-ADMIN-FINANCE] [ROUTE-ADMIN-MP-PAYMENTS-ENTRYID] shows a payout, exports the apps sold, and marks it as paid', async ({
		adminAPI,
		page,
	}) => {
		const salesSummary = await getSalesSummary(
			adminAPI,
			LIFERAY_SUPPLIER_ACCOUNT_ERC,
			'Q1 2026'
		);

		try {
			await gotoAdmin(page, 'mp-payments');

			await clickRowAction(
				rowWithText(page, 'Liferay Supplier Account').filter({
					hasText: 'Q1 2026',
				}),
				'View Details'
			);

			await expectAdminSettled(page);

			await expect(page).toHaveURL(
				new RegExp(`#/mp-payments/${salesSummary.id}$`)
			);

			const app = adminApp(page);

			for (const card of ['Publisher Details', 'Payment Summary']) {
				await expect(app.getByText(card, {exact: true})).toBeVisible();
			}

			await expect(app.getByText('Apps Sold').first()).toBeVisible();

			const downloadPromise = page.waitForEvent('download');

			await app.getByRole('button', {name: 'Export CSV'}).click();

			const download = await downloadPromise;

			expect(download.suggestedFilename()).toMatch(/^orders\.\d+\.csv$/);

			const csv = await readFile(await download.path(), 'utf8');

			const [header, ...rows] = csv.trim().split(/\r?\n/);

			expect(header).toContain('App Name');
			expect(header).toContain('Account');
			expect(header).toContain('Net Price');
			expect(rows.length).toBe(3);

			await app.getByRole('button', {name: 'Mark as Paid'}).click();

			await expect
				.poll(
					async () =>
						(
							await getSalesSummary(
								adminAPI,
								LIFERAY_SUPPLIER_ACCOUNT_ERC,
								'Q1 2026'
							)
						).paymentStatus.key
				)
				.toBe('paid');

			await expect(
				app.getByRole('button', {name: 'Mark as Paid'})
			).toBeHidden();

			await expect(app.getByText('Finance Admin')).toBeVisible();

			await app.getByRole('link', {name: 'Back to Payments'}).click();

			await expect(page).toHaveURL(/#\/mp-payments$/);
		}
		finally {
			await restoreSalesSummary(adminAPI, salesSummary);
		}
	});
});
