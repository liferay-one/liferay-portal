/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {HeadlessPage} from '../utils/HeadlessAPI';
import {
	adminApp,
	applyCheckboxFilter,
	clickRowAction,
	expectAdminSettled,
	firstColumnValues,
	gotoAdmin,
	rowWithText,
	searchList,
	tableRows,
} from '../utils/adminUtils';

/**
 * The Marketplace administrator dashboard: the summary, the orders, apps,
 * solutions, and publishers lists, and the read side of publisher requests.
 * Everything here reads Liferay headless APIs only, so it runs the same
 * against the local seed and against UAT. Order counts are matched by shape,
 * not by value, because other specs place orders while this one runs.
 *
 * Approving and declining a publisher request belongs to the publisher
 * journey (FLOW-ADMIN-PUBLISHER-REQUESTS); this spec only reads the list.
 */

const PAGINATION_RESULTS = /Showing (\d+) to (\d+) of (\d+)/;

function columnHeader(page: Page, name: string) {
	return adminApp(page)
		.locator('main table thead')
		.getByText(name, {exact: true});
}

test.beforeEach(async ({signIn}) => {
	await signIn('ADMINISTRATOR');
});

test.describe('[FLOW-ADMIN-DASHBOARD] marketplace summary', () => {
	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-SUMMARY] renders the KPIs, the account and order cards, and the recent lists', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-summary');

		const app = adminApp(page);

		await expect(
			app.getByText('Administrator Dashboard', {exact: true})
		).toBeVisible();

		for (const kpi of [
			'New Projects Using Marketplace Apps',
			'Technology Partnership With Integrations',
			'Publisher With Apps Supporting Quarterly Release',
			'Apps & Connectors Supporting Quarterly Release',
			'Low Code Configurations Published',
		]) {
			await expect(app.getByText(kpi, {exact: true})).toBeVisible();
		}

		for (const card of [
			'Publisher Accounts',
			'Customer Accounts',
			'Income',
			'Orders',
		]) {
			await expect(app.getByText(card, {exact: true})).toBeVisible();
		}

		await expect(
			app.getByText('Recent Orders', {exact: true})
		).toBeVisible();

		await expect(
			app.getByText('Published Apps', {exact: true})
		).toBeVisible();

		const recentOrders = app.locator('table').first().locator('tbody tr');

		await expect(recentOrders.first()).toBeVisible();

		expect(await recentOrders.count()).toBeLessThanOrEqual(5);
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-SUMMARY] [ROUTE-ADMIN-MP-ORDERS] [ROUTE-ADMIN-MP-APPS] View All opens the full orders and apps lists', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-summary');

		await adminApp(page)
			.getByRole('link', {name: 'View All'})
			.first()
			.click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-orders$/);

		await gotoAdmin(page, 'mp-summary');

		await adminApp(page)
			.getByRole('link', {name: 'View All'})
			.last()
			.click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-apps$/);
	});
});

test.describe('[FLOW-ADMIN-DASHBOARD] marketplace orders', () => {
	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] renders the order cards and the orders table', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		const app = adminApp(page);

		for (const card of [
			'Total Orders',
			'Monthly Orders',
			'Current Year Orders',
		]) {
			await expect(app.getByText(card, {exact: true})).toBeVisible();
		}

		for (const column of [
			'ID',
			'App Name',
			'User Account',
			'App Type',
			'Amount',
			'Order Status',
			'Payment Status',
			'Customer Project',
			'Created At',
		]) {
			await expect(columnHeader(page, column)).toBeVisible();
		}

		await expect(tableRows(page)).toHaveCount(10);

		await expect(app.getByText(PAGINATION_RESULTS)).toHaveText(
			/Showing 1 to 10 of \d+/
		);
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] pages through the orders and keeps the page in the URL', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		const firstPageIDs = await firstColumnValues(page);

		await adminApp(page)
			.getByRole('navigation', {name: 'Pagination'})
			.getByText('2', {exact: true})
			.click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/page=2/);

		await expect(adminApp(page).getByText(PAGINATION_RESULTS)).toHaveText(
			/Showing 11 to \d+ of \d+/
		);

		const secondPageIDs = await firstColumnValues(page);

		expect(secondPageIDs.length).toBeGreaterThan(0);

		expect(secondPageIDs.filter((id) => firstPageIDs.includes(id))).toEqual(
			[]
		);
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] reads the page size from the URL', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders', {pageSize: '20'});

		await expect(tableRows(page)).toHaveCount(20);

		await expect(adminApp(page).getByText(PAGINATION_RESULTS)).toHaveText(
			/Showing 1 to 20 of \d+/
		);
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] sorts the orders by creation date in both directions', async ({
		adminAPI,
		page,
	}) => {
		const oldestOrders = await adminAPI.get<HeadlessPage<{id: number}>>(
			'/o/headless-commerce-admin-order/v1.0/orders?pageSize=10&sort=createDate:asc'
		);

		await gotoAdmin(page, 'mp-orders');

		const createdAtHeader = columnHeader(page, 'Created At');

		// The first click applies the default newest first order again, so
		// the second click is the one that reverses it

		await createdAtHeader.click();
		await createdAtHeader.click();

		await expect
			.poll(() => firstColumnValues(page))
			.toEqual(oldestOrders.items.map(({id}) => String(id)));

		await createdAtHeader.click();

		const newestOrders = await adminAPI.get<HeadlessPage<{id: number}>>(
			'/o/headless-commerce-admin-order/v1.0/orders?pageSize=10&sort=createDate:desc'
		);

		await expect
			.poll(() => firstColumnValues(page))
			.toEqual(newestOrders.items.map(({id}) => String(id)));
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] filters the orders by app type from the toolbar', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		await applyCheckboxFilter(page, 'App Type', 'Client Extension');

		await expect(page).toHaveURL(/filter=/);

		await expect(tableRows(page).first()).toBeVisible();

		const appTypes = await tableRows(page)
			.locator('td:nth-child(4)')
			.allInnerTexts();

		expect(appTypes.length).toBeGreaterThan(0);

		for (const appType of appTypes) {
			expect(appType.trim()).toBe('Client Extension');
		}

		const filterTag = adminApp(page).locator(
			'.management-toolbar-filter-tag'
		);

		await expect(filterTag).toContainText('App Type');

		await filterTag.locator('.management-toolbar-filter-tag-close').click();

		await expectAdminSettled(page);

		await expect(filterTag).toHaveCount(0);

		await expect(page).not.toHaveURL(/filter=/);
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] filters the orders by order status from the URL', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders', {
			filter: JSON.stringify({orderStatus: ['0']}),
			filterSchema: 'administratorOrders',
		});

		await expect(tableRows(page).first()).toBeVisible();

		const statuses = await tableRows(page)
			.locator('td:nth-child(6)')
			.allInnerTexts();

		expect(statuses.length).toBeGreaterThan(0);

		for (const status of statuses) {
			expect(status.trim()).toBe('Completed');
		}
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] searches the orders and shows the empty state when nothing matches', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		const [firstID] = await firstColumnValues(page);

		await searchList(page, firstID);

		await expect(rowWithText(page, firstID).first()).toBeVisible();

		await searchList(page, 'qqxvzk');

		await expect(tableRows(page)).toHaveCount(0);

		await expect(adminApp(page).getByText('No Orders Yet')).toBeVisible();
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] Order Details opens the order in the control panel in a new tab', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		const row = tableRows(page).first();

		const [orderID] = await firstColumnValues(page);

		const popupPromise = page.waitForEvent('popup');

		await clickRowAction(row, 'Order Details');

		const popup = await popupPromise;

		await popup.waitForLoadState('domcontentloaded');

		expect(popup.url()).toContain('control_panel');
		expect(popup.url()).toContain(`commerceOrderId=${orderID}`);

		await popup.close();
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] Customer Dashboard opens the order project in My Account', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		await clickRowAction(tableRows(page).first(), 'Customer Dashboard');

		await expect(page).toHaveURL(/\/my-account#\/project\//, {
			timeout: 30000,
		});
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-ORDERS] Export downloads the filtered orders as a CSV file', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-orders');

		await expect(
			adminApp(page).getByRole('button', {name: 'Export'})
		).toBeEnabled();

		test.info().annotations.push({
			description:
				'The Export button calls GET /orders/export on the Spring Boot ' +
				'client extension, which has no /orders controller, so the ' +
				'request returns 404 and no file is downloaded.',
			type: 'issue',
		});

		test.fail();

		const downloadPromise = page.waitForEvent('download', {
			timeout: 15000,
		});

		await adminApp(page).getByRole('button', {name: 'Export'}).click();

		const download = await downloadPromise;

		expect(download.suggestedFilename()).toBe('orders.csv');
	});
});

test.describe('[FLOW-ADMIN-DASHBOARD] marketplace apps', () => {
	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-APPS] renders the app cards and filters the apps by type', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-apps');

		const app = adminApp(page);

		await expect(
			app.getByText('App Awaiting Review', {exact: true})
		).toBeVisible();

		await expect(
			app.getByText('Recently Published', {exact: true})
		).toBeVisible();

		await applyCheckboxFilter(page, 'App Type', 'Client Extension');

		const appTypes = await tableRows(page)
			.locator('td:nth-child(2)')
			.allInnerTexts();

		expect(appTypes.length).toBeGreaterThan(0);

		for (const appType of appTypes) {
			expect(appType.trim()).toBe('Client Extension');
		}
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-APPS] [ROUTE-ADMIN-MP-APPS-PRODUCTID] searches an app, opens its details, and returns to the list', async ({
		adminAPI,
		page,
	}) => {
		const product = await adminAPI.getProductByERC('PRDCT-DYNATRACE-APM');

		await gotoAdmin(page, 'mp-apps');

		await searchList(page, 'Dynatrace');

		await expect(tableRows(page)).toHaveCount(1);

		const row = rowWithText(page, product.name.en_US).first();

		await expect(row).toBeVisible();

		await row.locator('td').first().click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(
			new RegExp(`#/mp-apps/${product.productId}$`)
		);

		const app = adminApp(page);

		await expect(
			app.getByRole('heading', {name: product.name.en_US})
		).toBeVisible();

		for (const section of [
			'Description',
			'Pricing',
			'Storefront',
			'Support & Help',
		]) {
			await expect(
				app.getByRole('heading', {exact: true, name: section})
			).toBeVisible();
		}

		await app.getByRole('link', {name: 'Back to Apps'}).click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-apps$/);
	});
});

test.describe('[FLOW-ADMIN-DASHBOARD] marketplace solutions', () => {
	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-MP-SOLUTIONS] [ROUTE-ADMIN-MP-SOLUTIONS-PRODUCTID] lists the solutions and opens one with View Details', async ({
		page,
	}) => {
		await gotoAdmin(page, 'mp-solutions');

		const app = adminApp(page);

		await expect(app.getByText('Solutions', {exact: true})).toBeVisible();

		const row = rowWithText(page, 'Test Supplier CRM Accelerator');

		await expect(row).toBeVisible();

		await clickRowAction(row, 'View Details');

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-solutions\/\d+$/);

		await expect(
			app.getByRole('heading', {name: 'Test Supplier CRM Accelerator'})
		).toBeVisible();

		await expect(
			app.getByText('Company Profile', {exact: true})
		).toBeVisible();

		await app.getByRole('link', {name: 'Back to Solutions'}).click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-solutions$/);
	});
});

test.describe('[FLOW-ADMIN-DASHBOARD] publishers and publisher requests', () => {
	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-PUBLISHERS] lists the publisher accounts and searches them', async ({
		page,
	}) => {
		await gotoAdmin(page, 'publishers');

		await expect(rowWithText(page, 'Test Supplier')).toBeVisible();
		await expect(rowWithText(page, 'Liferay, Inc.')).toBeVisible();

		await expect(rowWithText(page, 'Test Supplier')).toContainText(
			'ACCNT-021'
		);

		await searchList(page, 'Test Supplier');

		await expect(tableRows(page)).toHaveCount(1);

		await expect(tableRows(page).first()).toContainText('Test Supplier');
	});

	test('[FLOW-ADMIN-DASHBOARD] [ROUTE-ADMIN-PUBLISHER-REQUESTS] lists the publisher account requests with their status', async ({
		page,
	}) => {
		await gotoAdmin(page, 'publisher-requests');

		const app = adminApp(page);

		await expect(
			app.getByText('Users requests to become a publisher')
		).toBeVisible();

		await expect(rowWithText(page, 'Dana Rivera')).toContainText(
			'Completed'
		);

		await expect(rowWithText(page, 'priya@nimbusworks.dev')).toContainText(
			'Priya Sharma'
		);
	});
});
