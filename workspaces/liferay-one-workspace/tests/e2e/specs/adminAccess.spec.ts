/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, oneTest as test} from '../fixtures/oneTest';
import {
	ADMIN_NAV_ITEMS,
	adminApp,
	adminNavLinks,
	expectAdminSettled,
	gotoAdmin,
} from '../utils/adminUtils';
import {sitePath} from '../utils/environmentUtils';

/**
 * The Admin page group is gated twice. The portal grants VIEW on the hidden
 * /admin page only to Finance Administrator, Liferay Staff, and Provisioning
 * Administrator (and implicitly to the portal administrator). Inside the page,
 * the SPA removes every route the user's roles do not reach, from the side
 * navigation and from the router, and sends a forbidden hash to the first
 * route the user may open.
 *
 * The Liferay Staff and SSA User personas reach the page only through the
 * Employees user group, which is meant to carry the Liferay Staff role. The
 * seed does not apply that user group role binding today, so both personas
 * get the portal's 404 rather than the SPA. Their rows assert the intended
 * behavior and are expected to fail until the binding is fixed.
 */

const SEED_GROUP_ROLE_DEFECT =
	'The Employees user group does not carry the Liferay Staff role in the ' +
	'seeded environment (role/has-user-role with inheritance returns false), ' +
	'so the portal answers /admin with a 404 before the SPA runs.';

test.describe('[FLOW-ADMIN-ROUTE-GATING] admin route gating', () => {
	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-MP-SUMMARY] the administrator sees every admin route and lands on the marketplace summary', async ({
		page,
		signIn,
	}) => {
		await signIn('ADMINISTRATOR');

		await gotoAdmin(page, '', undefined, adminNavLinks);

		await expect(adminNavLinks(page)).toHaveText(ADMIN_NAV_ITEMS);

		await expect(page).toHaveURL(/#\/mp-summary$/);

		await expect(
			adminApp(page).getByText('Administrator Dashboard', {exact: true})
		).toBeVisible();
	});

	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-MP-SUMMARY] an unknown admin route falls back to the first route', async ({
		page,
		signIn,
	}) => {
		await signIn('ADMINISTRATOR');

		await gotoAdmin(page, 'no-such-route', undefined, adminNavLinks);

		await expect(page).toHaveURL(/#\/mp-summary$/);
	});

	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-PUB-SUB] [ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS] a provisioning administrator sees only the provisioning tools', async ({
		page,
		signIn,
	}) => {
		await signIn('PROVISIONING_ADMIN');

		await gotoAdmin(page, 'mp-summary', undefined, adminNavLinks);

		await expect(adminNavLinks(page)).toHaveText([
			'Pub/Sub',
			'Activation Key Uploads',
		]);

		await expect(page).toHaveURL(/#\/pub-sub$/);

		await expect(
			adminApp(page).getByText('Administrator Dashboard')
		).toHaveCount(0);
	});

	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-MP-FINANCE-ORDERS] [ROUTE-ADMIN-MP-PAYMENTS] a finance administrator sees only the finance routes', async ({
		page,
		signIn,
	}) => {
		await signIn('FINANCE_ADMIN');

		await gotoAdmin(page, 'mp-orders', undefined, adminNavLinks);

		await expect(adminNavLinks(page)).toHaveText([
			'Marketplace Finance Orders',
			'Marketplace Payments',
		]);

		await expect(page).toHaveURL(/#\/mp-finance-orders$/);

		await expect(
			adminApp(page).getByText('Last Orders', {exact: true})
		).toBeVisible();
	});

	test('[FLOW-ADMIN-ROUTE-GATING] Liferay Staff without an admin role sees the access required state', async ({
		page,
		signIn,
	}) => {
		await signIn('LIFERAY_STAFF');

		test.info().annotations.push({
			description: SEED_GROUP_ROLE_DEFECT,
			type: 'issue',
		});

		test.fail();

		await gotoAdmin(page, 'mp-summary');

		await expect(adminNavLinks(page)).toHaveCount(0);

		await expect(
			adminApp(page).getByText('Access required.')
		).toBeVisible();

		await expect(
			adminApp(page).getByText('You do not have access to this page.')
		).toBeVisible();
	});

	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-MY-SSA-SAAS-DEMO] an SSA user sees only their own SaaS demos', async ({
		page,
		signIn,
	}) => {
		await signIn('SSA_USER');

		test.info().annotations.push({
			description: SEED_GROUP_ROLE_DEFECT,
			type: 'issue',
		});

		test.fail();

		await gotoAdmin(page, 'mp-summary');

		await expect(adminNavLinks(page)).toHaveText(['My SSA SaaS Demo']);

		await expect(page).toHaveURL(/#\/my-ssa-saas-demo$/);
	});

	test('[FLOW-ADMIN-ROUTE-GATING] a customer without an admin role is refused the admin page by the portal', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		const response = await page.goto(sitePath('/admin#/mp-summary'));

		expect(response?.status()).toBe(404);

		await expect(page.getByText('Page Not Found')).toBeVisible();

		await expect(adminApp(page)).toHaveCount(0);
	});

	test('[FLOW-ADMIN-ROUTE-GATING] a guest is sent to sign in before the admin page renders', async ({
		page,
	}) => {
		await page.goto(sitePath('/admin#/mp-summary'));

		await expect(page).toHaveURL(/login.*redirect=%2Fweb%2Fone%2Fadmin/);

		await expect(adminApp(page)).toHaveCount(0);
	});

	test('[FLOW-ADMIN-ROUTE-GATING] [ROUTE-ADMIN-MP-ORDERS] the side navigation opens the matching admin route', async ({
		page,
		signIn,
	}) => {
		await signIn('ADMINISTRATOR');

		await gotoAdmin(page, 'mp-summary', undefined, adminNavLinks);

		await adminNavLinks(page)
			.filter({hasText: 'Marketplace Orders'})
			.click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(/#\/mp-orders$/);

		await expect(
			adminApp(page).getByText('Total Orders', {exact: true})
		).toBeVisible();
	});
});
