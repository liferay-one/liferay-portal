/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI, {HeadlessPage} from '../utils/HeadlessAPI';
import {
	adminApp,
	clickRowAction,
	expectAdminSettled,
	gotoAdmin,
	rowWithText,
	searchList,
	tableRows,
	toast,
} from '../utils/adminUtils';
import {
	SSA_ACCOUNT_ERC,
	SSA_TRIAL_PRODUCT_ERC,
	uniqueName,
} from '../utils/environmentUtils';

/**
 * The trial tools of the admin dashboard: the 7 day trials and the SSA SaaS
 * demos.
 *
 * Provisioning, extending, expiring, and deleting a trial all go through the
 * Spring Boot client extension to the provisioning backend, which a local
 * environment does not have. Those journeys run against the stub, which
 * records what the page sent, and skip when ONE_E2E_BACKEND=live so a spec
 * never extends or expires a real customer trial. The Liferay side of each
 * journey (the commerce order, the trial extension request, the account
 * roles) is real, and each test removes what it created.
 */

const DAY = 24 * 60 * 60 * 1000;

const ORDERS_PATH = '/o/headless-commerce-admin-order/v1.0/orders';

const ORDER_STATUS_IN_PROGRESS = 6;

const SSA_CHANNEL_PATH =
	'/o/headless-commerce-admin-channel/v1.0/channels/by-externalReferenceCode/LIFERAY_ONE_CHANNEL';

const SSA_GLOBEX_PROJECT = 'ssa-globex-demo';

const STUB_ONLY =
	'This journey reaches the trial provisioning backend; it runs only ' +
	'against the Spring Boot stub.';

const TRIAL_EXTENSION_REQUESTS_PATH = '/o/c/trialextensionrequests';

type TrialExtensionRequest = {
	dueStatus: {key: string};
	id: number;
	r_orderToTrialExtensionRequest_commerceOrderId: number;
};

/**
 * Records the ID of every extension request the browser creates, so cleanup
 * deletes exactly what the test made rather than reading the whole company
 * collection. The order relationship cannot be filtered on (the object API
 * answers 400), so the requests are tracked from their creation responses.
 */

function trackTrialExtensionRequests(page: Page): number[] {
	const ids: number[] = [];

	page.on('response', async (response) => {
		const request = response.request();

		if (
			request.method() !== 'POST' ||
			!response.ok() ||
			!new URL(response.url()).pathname.endsWith(
				TRIAL_EXTENSION_REQUESTS_PATH
			)
		) {
			return;
		}

		const {id} = (await response.json().catch(() => ({}))) as {
			id?: number;
		};

		if (id) {
			ids.push(id);
		}
	});

	return ids;
}

async function getTrialExtensionRequests(
	adminAPI: HeadlessAPI,
	ids: number[]
): Promise<TrialExtensionRequest[]> {
	return Promise.all(
		ids.map((id) =>
			adminAPI.get<TrialExtensionRequest>(
				`${TRIAL_EXTENSION_REQUESTS_PATH}/${id}`
			)
		)
	);
}

async function deleteTrialExtensionRequests(
	adminAPI: HeadlessAPI,
	ids: number[]
): Promise<void> {
	for (const id of ids) {
		await adminAPI.deleteIfExists(`${TRIAL_EXTENSION_REQUESTS_PATH}/${id}`);
	}
}

/**
 * Creates an SSA trial order the test owns: in progress, so the list shows it
 * as Active and offers its actions, and ending a week from now. The seeded
 * trials carry fixed dates, and the Spring Boot trial cron completes every
 * trial whose end date has passed, so a seeded trial cannot stay active.
 */

async function createActiveSSATrial(
	adminAPI: HeadlessAPI
): Promise<{orderId: number; projectId: string}> {
	const channel = await adminAPI.get<{id: number}>(SSA_CHANNEL_PATH);

	const product = await adminAPI.get<{skus: {id: number}[]}>(
		`/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/${SSA_TRIAL_PRODUCT_ERC}?nestedFields=skus`
	);

	const projectId = `ssae2e${Date.now().toString(36)}${Math.random()
		.toString(36)
		.slice(2, 6)}`;

	const now = Date.now();

	const order = await adminAPI.post<{id: number}>(ORDERS_PATH, {
		accountExternalReferenceCode: SSA_ACCOUNT_ERC,
		channelId: channel.id,
		currencyCode: 'USD',
		customFields: {
			'trial-end-date': new Date(now + 7 * DAY).toISOString(),
			'trial-settings': JSON.stringify({
				projectId,
				siteInitializerKey: 'com.liferay.site.initializer.welcome',
			}),
			'trial-start-date': new Date(now).toISOString(),
		},
		orderItems: [{quantity: 1, skuId: product.skus[0].id, unitPrice: 0}],
		orderStatus: ORDER_STATUS_IN_PROGRESS,
		orderTypeExternalReferenceCode: 'SSA_SAAS',
	});

	return {orderId: order.id, projectId};
}

/**
 * A page with a Spring Boot stub loads without the HTTP cache (Playwright
 * disables it while a route is registered), so under parallel load its first
 * render can need the one reload gotoAdmin allows. The longer timeout leaves
 * room for that reload.
 */

test.describe.configure({timeout: 240 * 1000});

test.beforeEach(async ({signIn}) => {
	await signIn('ADMINISTRATOR');
});

test.describe('[FLOW-ADMIN-SSA-TRIALS] 7 day trials', () => {
	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-TRIALS] shows the trial resources as active while capacity remains', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('GET', '/trial/availability', {
			body: {active: true, available: 3, max: 5},
		});

		await gotoAdmin(page, 'trials', undefined, (page) =>
			adminApp(page).getByRole('heading', {name: 'Trial Resources'})
		);

		const app = adminApp(page);

		await expect(
			app.getByRole('heading', {name: 'Trial Resources'})
		).toBeVisible();

		await expect(app.getByText('Active', {exact: true})).toBeVisible();

		await expect(app.getByRole('heading', {name: '2 / 5'})).toBeVisible();
		await expect(
			app.getByRole('heading', {exact: true, name: '3'})
		).toBeVisible();
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-TRIALS] shows the trial resources as limit reached when no capacity remains', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('GET', '/trial/availability', {
			body: {active: false, available: 0, max: 5},
		});

		await gotoAdmin(page, 'trials', undefined, (page) =>
			adminApp(page).getByRole('heading', {name: 'Trial Resources'})
		);

		await expect(
			adminApp(page).getByText('Limit Reached', {exact: true})
		).toBeVisible();

		await expect(
			adminApp(page).getByRole('heading', {name: '5 / 5'})
		).toBeVisible();
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-TRIALS] shows the trial resources as deactivated when availability cannot be read', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('GET', '/trial/availability', {
			body: {
				detail: 'An unexpected error occurred',
				status: 500,
				title: 'Internal Server Error',
			},
			contentType: 'application/problem+json',
			status: 500,
		});

		await gotoAdmin(page, 'trials', undefined, (page) =>
			adminApp(page).getByRole('heading', {name: 'Trial Resources'})
		);

		const app = adminApp(page);

		await expect(app.getByText('Deactivated', {exact: true})).toBeVisible();

		await expect(app.getByRole('heading', {name: '0 / 0'})).toBeVisible();
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-TRIALS] keeps New Trial disabled until a cloud app is chosen', async ({
		page,
	}) => {
		await gotoAdmin(page, 'trials', undefined, (page) =>
			adminApp(page).getByRole('heading', {name: 'Trial Resources'})
		);

		const app = adminApp(page);

		await app.getByRole('button', {name: 'New Trial'}).click();

		const dialog = page.getByRole('dialog');

		await expect(dialog.getByText('Cloud App')).toBeVisible();

		await expect(
			dialog.getByPlaceholder('Search for the app name')
		).toBeVisible();

		await expect(
			dialog.getByLabel('Account Selection', {exact: false})
		).toBeVisible();

		await expect(dialog.getByText('Invite Members')).toBeVisible();

		await expect(dialog.getByText('Send Notification Email')).toBeVisible();

		await expect(
			dialog.getByRole('button', {name: 'Create Trial'})
		).toBeDisabled();
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-TRIALS] creates a trial for a cloud app, provisions it, and deletes it', async ({
		adminAPI,
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('GET', '/trial/availability', {
			body: {active: true, available: 3, max: 5},
		});

		await springBoot.on('POST', '/trial/provisioning/:orderId', {
			status: 200,
		});

		await springBoot.on('DELETE', '/trial/:orderId', {status: 200});

		const createdOrderIds: number[] = [];

		try {
			await gotoAdmin(page, 'trials', undefined, (page) =>
				adminApp(page).getByRole('heading', {name: 'Trial Resources'})
			);

			const app = adminApp(page);

			await app.getByRole('button', {name: 'New Trial'}).click();

			const dialog = page.getByRole('dialog');

			await dialog
				.getByPlaceholder('Search for the app name')
				.fill('Sample Cloud App');

			await page
				.getByRole('option', {name: 'Sample Cloud App'})
				.or(page.getByRole('menuitem', {name: 'Sample Cloud App'}))
				.first()
				.click();

			await dialog.getByRole('button', {name: 'Create Trial'}).click();

			await expect(toast(page, 'Trial created successfully')).toBeVisible(
				{timeout: 30000}
			);

			await expect
				.poll(() =>
					springBoot.callsTo('POST', /^\/trial\/provisioning\//)
				)
				.toHaveLength(1);

			const [provisioning] = springBoot.callsTo(
				'POST',
				/^\/trial\/provisioning\//
			);

			const orderId = Number(provisioning.path.split('/').pop());

			createdOrderIds.push(orderId);

			const row = rowWithText(page, String(orderId));

			await expect(row).toContainText('Sample Cloud App');

			await clickRowAction(row, 'Delete');

			const confirmation = page
				.getByRole('dialog')
				.filter({hasText: 'Confirm Deletion'});

			await confirmation
				.getByRole('button', {name: /delete|confirm/i})
				.click();

			await expect(
				toast(page, 'Trial deleted successfully.')
			).toBeVisible();

			expect(
				springBoot.callsTo('DELETE', `/trial/${orderId}`)
			).toHaveLength(1);

			await expect(row).toHaveCount(0);
		}
		finally {
			for (const orderId of createdOrderIds) {
				await adminAPI.deleteIfExists(`${ORDERS_PATH}/${orderId}`);
			}
		}
	});
});

test.describe('[FLOW-ADMIN-SSA-TRIALS] SSA SaaS demos', () => {

	// Each test adds a trial to the same SSA account, and the list shows the
	// newest first, so a trial created by a parallel test moves the rows. The
	// table keys its rows by index, so an open row action menu then belongs to
	// another trial. The tests run one at a time to keep the rows still.

	test.describe.configure({mode: 'default'});

	let trial: {orderId: number; projectId: string};

	test.beforeEach(async ({adminAPI}) => {
		trial = await createActiveSSATrial(adminAPI);
	});

	test.afterEach(async ({adminAPI}) => {
		await adminAPI.deleteIfExists(`${ORDERS_PATH}/${trial.orderId}`);
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS] lists the team trials and searches them', async ({
		page,
	}) => {
		await gotoAdmin(page, 'ssa-saas-environments', undefined, (page) =>
			rowWithText(page, trial.projectId)
		);

		const app = adminApp(page);

		await expect(app.getByText('SaaS Demos', {exact: true})).toBeVisible();

		await expect(rowWithText(page, trial.projectId)).toContainText(
			'Active'
		);

		await expect(rowWithText(page, SSA_GLOBEX_PROJECT)).toContainText(
			'Expired'
		);

		await searchList(page, trial.projectId);

		await expect(tableRows(page)).toHaveCount(1);

		await expect(tableRows(page).first()).toContainText(trial.projectId);
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-DETAILS-ORDERID] opens a trial and returns to the list it came from', async ({
		page,
	}) => {
		await gotoAdmin(page, 'ssa-saas-environments', undefined, (page) =>
			rowWithText(page, trial.projectId)
		);

		const {orderId} = trial;

		await rowWithText(page, trial.projectId)
			.getByRole('link', {name: trial.projectId})
			.click();

		await expectAdminSettled(page);

		await expect(page).toHaveURL(
			new RegExp(`#/details/${orderId}\\?from=`)
		);

		const app = adminApp(page);

		await expect(app.getByText('SSA Trial Summary')).toBeVisible();

		await expect(app.getByText(trial.projectId).first()).toBeVisible();

		await app.getByRole('link', {name: 'Back to the list'}).click();

		await expect(page).toHaveURL(/#\/ssa-saas-environments$/);
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS] extends a trial, then reviews and rejects a second extension request', async ({
		adminAPI,
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('POST', '/trial/extend/:id', {status: 200});

		await gotoAdmin(page, 'ssa-saas-environments', undefined, (page) =>
			rowWithText(page, trial.projectId)
		);

		const {orderId} = trial;

		const createdRequestIds = trackTrialExtensionRequests(page);

		try {
			const row = rowWithText(page, trial.projectId);

			await clickRowAction(row, 'Extend Trial');

			let dialog = page
				.getByRole('dialog')
				.filter({hasText: `Extend ${orderId} Trial`});

			await dialog
				.getByRole('button', {exact: true, name: 'Submit'})
				.click();

			await expect(
				dialog.getByText('Please enter a valid number (1-90)')
			).toBeVisible();

			await dialog.getByPlaceholder('Value between 1 and 60').fill('5');

			await dialog
				.getByPlaceholder('Tell why you need to extend the trial')
				.fill('The customer asked for more evaluation time.');

			await dialog
				.getByRole('button', {exact: true, name: 'Submit'})
				.click();

			await expect(
				toast(page, 'Trial extended successfully')
			).toBeVisible();

			await expect
				.poll(() => springBoot.callsTo('POST', /^\/trial\/extend\//))
				.toHaveLength(1);

			await clickRowAction(row, 'Extend Trial');

			dialog = page
				.getByRole('dialog')
				.filter({hasText: `Extend ${orderId} Trial`});

			await dialog.getByPlaceholder('Value between 1 and 60').fill('10');

			await dialog
				.getByPlaceholder('Tell why you need to extend the trial')
				.fill('A second extension needs approval.');

			await dialog.getByRole('button', {name: 'Submit Request'}).click();

			await expect(row).toContainText('Pending', {timeout: 30000});

			expect(
				springBoot.callsTo('POST', /^\/trial\/extend\//)
			).toHaveLength(1);

			await clickRowAction(row, 'View Request');

			const requestDialog = page
				.getByRole('dialog')
				.filter({hasText: 'EXTENSION REQUEST'});

			await expect(
				requestDialog.getByText('A second extension needs approval.')
			).toBeVisible();

			await requestDialog
				.getByRole('button', {name: 'Reject Request'})
				.click();

			await expect(
				toast(page, 'Trial extension rejected successfully')
			).toBeVisible();

			await expect.poll(() => createdRequestIds.length).toBe(2);

			const items = await getTrialExtensionRequests(
				adminAPI,
				createdRequestIds
			);

			expect(
				items.every(
					(item) =>
						String(
							item.r_orderToTrialExtensionRequest_commerceOrderId
						) === String(orderId)
				)
			).toBe(true);

			expect(items.map(({dueStatus}) => dueStatus.key).sort()).toEqual([
				'autoApproved',
				'rejected',
			]);
		}
		finally {
			await deleteTrialExtensionRequests(adminAPI, createdRequestIds);
		}
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS] expires an active trial after a confirmation', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, STUB_ONLY);

		await springBoot.on('POST', '/trial/expire/:orderId', {status: 200});

		await gotoAdmin(page, 'ssa-saas-environments', undefined, (page) =>
			rowWithText(page, trial.projectId)
		);

		const {orderId} = trial;

		const row = rowWithText(page, trial.projectId);

		await clickRowAction(row, 'Expire Trial');

		const dialog = page
			.getByRole('dialog')
			.filter({hasText: `Expire ${orderId} Trial`});

		await expect(
			dialog.getByText('This action cannot be undone')
		).toBeVisible();

		await dialog.getByRole('button', {exact: true, name: 'cancel'}).click();

		await expect(dialog).toBeHidden();

		expect(springBoot.callsTo('POST', /^\/trial\/expire\//)).toHaveLength(
			0
		);

		await clickRowAction(row, 'Expire Trial');

		await page
			.getByRole('dialog')
			.filter({hasText: `Expire ${orderId} Trial`})
			.getByRole('button', {exact: true, name: 'close'})
			.click();

		await expect(toast(page, 'Trial expired successfully')).toBeVisible();

		expect(
			springBoot.callsTo('POST', `/trial/expire/${orderId}`)
		).toHaveLength(1);
	});

	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-MY-SSA-SAAS-DEMO] lists my demos and validates a new trial before creating it', async ({
		page,
	}) => {
		await gotoAdmin(page, 'my-ssa-saas-demo', undefined, (page) =>
			rowWithText(page, trial.projectId)
		);

		const app = adminApp(page);

		await expect(
			app.getByText('My SaaS Demos', {exact: true})
		).toBeVisible();

		await expect(app.getByText('Manage your current trials')).toBeVisible();

		await expect(rowWithText(page, trial.projectId)).toBeVisible();

		await app.getByRole('button', {name: 'Add New Trial'}).click();

		const dialog = page.getByRole('dialog');

		await expect(dialog.getByText('Add New Trial').first()).toBeVisible();

		await dialog.getByRole('button', {name: 'Create'}).click();

		await expect(
			dialog.getByText('Project ID must have at least 3 characters')
		).toBeVisible();

		await dialog.locator('input[name="projectId"]').fill('ab-c');

		await dialog.getByRole('button', {name: 'Create'}).click();

		await expect(
			dialog.getByText('Only alphanumeric characters are allowed')
		).toBeVisible();

		await dialog.getByRole('button', {name: 'Cancel'}).click();

		await expect(dialog).toBeHidden();
	});
});

test.describe('[FLOW-ADMIN-SSA-TRIALS] SSA users', () => {
	test('[FLOW-ADMIN-SSA-TRIALS] [ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS] grants an SSA role to a member and then removes every role', async ({
		adminAPI,
		page,
	}) => {
		const accountPath = `/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${SSA_ACCOUNT_ERC}`;

		const users: Array<{id: number}> = [];

		const createSSAMember = async (roleName: string) => {
			const name = uniqueName('SSA');

			const emailAddress = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@liferay.com`;

			const user = await adminAPI.post<{id: number}>(
				'/o/headless-admin-user/v1.0/user-accounts',
				{
					alternateName: emailAddress
						.split('@')[0]
						.replace(/\./g, '-'),
					emailAddress,
					familyName: 'User',
					givenName: name,
				}
			);

			users.push(user);

			await adminAPI.post(
				`${accountPath}/user-accounts/by-email-address/${emailAddress}`,
				{}
			);

			const {items: accountRoles} = await adminAPI.get<
				HeadlessPage<{id: number; name: string}>
			>(`${accountPath}/account-roles?pageSize=200`);

			const accountRole = accountRoles.find(
				({name}) => name === roleName
			);

			await adminAPI.post(
				`${accountPath}/account-roles/${accountRole?.id}/user-accounts/by-email-address/${emailAddress}`,
				{}
			);

			return {emailAddress, user};
		};

		try {

			// Removing every role from the last SSA Administrator is refused
			// with 409 ("At least one account manager is required"), so a second
			// administrator keeps the account managed while the journey removes
			// the first one's roles

			await createSSAMember('SSA Administrator');

			const {emailAddress, user} = await createSSAMember('SSA User');

			await gotoAdmin(page, 'manage-ssa-saas-users', undefined, (page) =>
				rowWithText(page, emailAddress)
			);

			const app = adminApp(page);

			await expect(
				app.getByText('Manage Users', {exact: true})
			).toBeVisible();

			const row = rowWithText(page, emailAddress);

			await expect(row).toContainText('SSA User');

			await clickRowAction(row, 'Manage Roles');

			const dialog = page
				.getByRole('dialog')
				.filter({hasText: 'Manage User Roles'});

			const rolesInput = dialog.getByRole('combobox');

			await rolesInput.fill('SSA Admin');

			await page.getByRole('option', {name: 'SSA Administrator'}).click();

			await dialog.getByRole('button', {name: 'Apply'}).click();

			await expect(
				toast(page, 'User roles successfully updated')
			).toBeVisible();

			await expect(row).toContainText('SSA Administrator');

			await clickRowAction(row, 'Remove all roles');

			await page
				.getByRole('dialog')
				.filter({hasText: 'Remove User'})
				.getByRole('button', {name: 'Confirm'})
				.click();

			await expect(
				toast(page, 'Successfully removed roles')
			).toBeVisible();

			const account = await adminAPI.get<{
				accountBriefs: {
					externalReferenceCode: string;
					roleBriefs: {name: string}[];
				}[];
			}>(`/o/headless-admin-user/v1.0/user-accounts/${user.id}`);

			const ssaAccountBrief = account.accountBriefs.find(
				({externalReferenceCode}) =>
					externalReferenceCode === SSA_ACCOUNT_ERC
			);

			expect(ssaAccountBrief?.roleBriefs ?? []).toEqual([]);

			await expect(row).not.toContainText('SSA User');
			await expect(row).not.toContainText('SSA Administrator');
		}
		finally {
			for (const {id} of users) {
				await adminAPI.deleteIfExists(
					`/o/headless-admin-user/v1.0/user-accounts/${id}`
				);
			}
		}
	});
});
