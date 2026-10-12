/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI, {HeadlessPage} from '../utils/HeadlessAPI';
import {
	ACCOUNT_ERC,
	SSA_ACCOUNT_ERC,
	SWITCH_ACCOUNT_ERC,
	UNASSIGNED_PROJECT_NAME,
	uniqueName,
} from '../utils/environmentUtils';
import getPersona from '../utils/getPersona';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryMember,
	clickDropdownItemBesideCheckbox,
	createTemporaryAdministrator,
	createTemporaryMember,
	deleteTemporaryMember,
	expectSettled,
	expectToast,
	gotoMyAccount,
	tableRow,
} from '../utils/myAccountUtils';

/**
 * The My Account account level journeys: orders, account details, account
 * members, and project permissions, each signed in as the persona the
 * behavior belongs to. Every write a test makes is undone through the UI and
 * again through the headless APIs in cleanup, so the seed stays as it was.
 */

const LAST_ADMIN_ACCOUNT_ERC = process.env.ONE_LAST_ADMIN_ACCOUNT_ERC?.trim()
	? process.env.ONE_LAST_ADMIN_ACCOUNT_ERC.trim()
	: 'ACCNT-028';

async function deleteInvitations(adminAPI: HeadlessAPI, emailAddress: string) {
	const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
		`/o/c/accountinvitations?filter=${encodeURIComponent(
			`emailAddress eq '${emailAddress}'`
		)}`
	);

	for (const {id} of items) {
		await adminAPI.deleteIfExists(`/o/c/accountinvitations/${id}`);
	}
}

function ordersTableRows(page: Page) {
	return page.locator('.orders-table tbody tr');
}

async function openOrdersFilter(page: Page, category: 'Project' | 'Status') {
	await page.getByRole('button', {exact: true, name: 'Filter'}).click();

	await page
		.locator('.orders-filter-category')
		.filter({hasText: category})
		.click();
}

test.describe('[FLOW-MY-ACCOUNT-OVERVIEW] orders', () => {
	test.beforeEach(async ({page, signIn}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/orders`);

		await expect(
			page.getByText('Orders List', {exact: true})
		).toBeVisible();
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERS] lists the account orders and searches them by ID', async ({
		page,
	}) => {
		const rows = ordersTableRows(page);

		await expect(rows.first()).toBeVisible();

		const rowCount = await rows.count();

		const orderId = (
			await rows.first().locator('td').first().innerText()
		).trim();

		expect(orderId).toMatch(/^\d+$/);

		const search = page.locator('.orders-search input');

		await search.fill(orderId);

		await expect(rows).toHaveCount(1);

		await expect(rows.first().locator('td').first()).toHaveText(orderId);

		await search.fill('no-such-order-e2e');

		await expect(page.getByText('No Orders Yet')).toBeVisible();

		await search.fill('');

		await expect
			.poll(() => rows.count(), {
				message:
					'expected every order to return once the filter is cleared',
			})
			.toBeGreaterThanOrEqual(rowCount);
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERS] filters by status and removes the filter tag', async ({
		page,
	}) => {
		const rows = ordersTableRows(page);

		const rowCount = await rows.count();

		await openOrdersFilter(page, 'Status');

		await page.getByLabel('Completed', {exact: true}).check();

		await page.getByRole('button', {name: 'Add Filter'}).click();

		const tag = page
			.locator('.orders-filter-tag')
			.filter({hasText: 'Status: Completed'});

		await expect(tag).toBeVisible();

		await expect(rows.first()).toBeVisible();

		for (const row of await rows.all()) {
			await expect(row).toContainText('Completed');
		}

		await tag.getByRole('button').click();

		await expect(tag).toHaveCount(0);

		await expect
			.poll(() => rows.count(), {
				message:
					'expected every order to return once the filter is cleared',
			})
			.toBeGreaterThanOrEqual(rowCount);
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERS] filters by project, and excludes it', async ({
		page,
	}) => {
		const rows = ordersTableRows(page);

		const projectName = 'Omni Project';

		await openOrdersFilter(page, 'Project');

		await page.getByLabel(projectName, {exact: true}).check();

		await page.getByRole('button', {name: 'Add Filter'}).click();

		await expect(
			page
				.locator('.orders-filter-tag')
				.filter({hasText: `Project: ${projectName}`})
		).toBeVisible();

		await expect(rows.first()).toBeVisible();

		for (const row of await rows.all()) {
			await expect(row.locator('td').nth(3)).toHaveText(projectName);
		}

		await openOrdersFilter(page, 'Project');

		await page
			.locator('.orders-filter-exclude')
			.getByRole('switch')
			.click();

		await page.getByRole('button', {name: 'Add Filter'}).click();

		await expect(
			page
				.locator('.orders-filter-tag')
				.filter({hasText: `Project: Exclude ${projectName}`})
		).toBeVisible();

		for (const row of await rows.all()) {
			await expect(row.locator('td').nth(3)).not.toHaveText(projectName);
		}
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERID] opens an order and returns to the list', async ({
		page,
	}) => {
		const firstRow = ordersTableRows(page).first();

		const orderId = (
			await firstRow.locator('td').first().innerText()
		).trim();

		await firstRow.getByRole('button', {name: 'Actions'}).click();

		await page.getByRole('menuitem', {name: 'View Details'}).click();

		await expect(page).toHaveURL(
			new RegExp(`#/${ACCOUNT_ERC}/orders/${orderId}$`)
		);

		await expectSettled(page);

		await expect(
			page.getByText('Order Summary', {exact: true})
		).toBeVisible();

		await expect(
			page.getByText('Order Items', {exact: true})
		).toBeVisible();

		await expect(
			page.getByText(orderId, {exact: true}).first()
		).toBeVisible();

		await page.getByRole('link', {name: /Orders List/}).click();

		await expect(page).toHaveURL(new RegExp(`#/${ACCOUNT_ERC}/orders$`));

		await expect(
			page.getByText('Orders List', {exact: true})
		).toBeVisible();
	});
});

test.describe('[FLOW-MY-ACCOUNT-OVERVIEW] account access', () => {
	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ORDERS] denies the orders list to a user with no account role', async ({
		page,
		signIn,
	}) => {
		await signIn('NULL_ROLE');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/orders`);

		await expect(
			page.getByText('You do not have access to this page.')
		).toBeVisible();

		await expect(ordersTableRows(page)).toHaveCount(0);
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ACCOUNTERC] denies an account the user does not belong to', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${SSA_ACCOUNT_ERC}/account-details`);

		await expect(
			page.getByText('You do not have access to this account.')
		).toBeVisible();
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ACCOUNTERC] switches the current account from the URL', async ({
		adminAPI,
		page,
	}) => {

		/**
		 * The current account is stored per user on the server, so the switch
		 * runs as a throwaway member of both accounts rather than a persona
		 * that other specs sign in as.
		 */

		let member: TemporaryMember | undefined;

		try {
			member = await createTemporaryMember(adminAPI, [
				ACCOUNT_ERC,
				SWITCH_ACCOUNT_ERC,
			]);

			const {name} = await adminAPI.getAccountByERC(SWITCH_ACCOUNT_ERC);

			await liferayLogin(page, member.email, member.password);

			await gotoMyAccount(page, `${SWITCH_ACCOUNT_ERC}/account-details`);

			await expect(
				page.getByText(SWITCH_ACCOUNT_ERC, {exact: true})
			).toBeVisible();

			await expect(
				page.getByRole('button', {name: 'Select Account'})
			).toContainText(name);

			await gotoMyAccount(page, `${ACCOUNT_ERC}/account-details`);

			await expect(
				page.getByText(ACCOUNT_ERC, {exact: true})
			).toBeVisible();
		}
		finally {
			await deleteTemporaryMember(adminAPI, member);
		}
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS] [ROUTE-MY-ACCOUNT-ORDERS] resolves legacy links against the current account', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-details`);

		await gotoMyAccount(page, 'orders');

		await expect(page).toHaveURL(new RegExp(`#/${ACCOUNT_ERC}/orders$`));

		await expect(
			page.getByText('Orders List', {exact: true})
		).toBeVisible();

		await gotoMyAccount(page, 'account-details');

		await expect(page).toHaveURL(
			new RegExp(`#/${ACCOUNT_ERC}/account-details$`)
		);
	});
});

test.describe('[FLOW-MY-ACCOUNT-OVERVIEW] account details', () => {
	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS] shows the account and hides Sync to JSM from an account admin', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const {name} = await adminAPI.getAccountByERC(ACCOUNT_ERC);

		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-details`);

		await expect(
			page.getByText('Manage your account and organization details.')
		).toBeVisible();

		for (const label of [
			'Main Information',
			'Company Name',
			'Account ID',
			'Primary Contact',
			'Password Policy',
			'Okta SSO',
			'Two-Factor Authentication',
		]) {
			await expect(page.getByText(label, {exact: true})).toBeVisible();
		}

		await expect(page.getByText(ACCOUNT_ERC, {exact: true})).toBeVisible();

		await expect(page.getByText(name, {exact: true}).first()).toBeVisible();

		await expect(page.getByRole('tab', {name: 'Details'})).toBeVisible();

		await expect(
			page.getByRole('button', {name: 'Sync to JSM'})
		).toHaveCount(0);
	});

	test('[FLOW-MY-ACCOUNT-OVERVIEW] [ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS] syncs the account to JSM as an administrator', async ({
		adminAPI,
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Syncing would write the account to the real Jira Service Management'
		);

		await springBoot.on('POST', '/accounts/:erc/sync-to-jsm', {
			status: 200,
		});

		const administrator = await createTemporaryAdministrator(adminAPI, [
			ACCOUNT_ERC,
		]);

		try {
			await liferayLogin(
				page,
				administrator.email,
				administrator.password
			);

			await gotoMyAccount(page, `${ACCOUNT_ERC}/account-details`);

			const syncButton = page.getByRole('button', {name: 'Sync to JSM'});

			await expect(syncButton).toBeVisible();

			await syncButton.click();

			await expectToast(
				page,
				'The account was successfully synced to JSM.'
			);

			expect(
				springBoot.callsTo(
					'POST',
					`/accounts/${ACCOUNT_ERC}/sync-to-jsm`
				)
			).toHaveLength(1);
		}
		finally {
			await deleteTemporaryMember(adminAPI, administrator);
		}
	});
});

test.describe('[FLOW-ACCOUNT-TEAM-MEMBERS] account members', () => {
	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] paginates, searches, and filters members by role', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

		await expect(
			page.getByText('Invite, manage roles, designate incident contacts.')
		).toBeVisible();

		await expect(tableRow(page, /admin@customer\.com/)).toContainText(
			'(me)'
		);

		await expect(page.getByText(/Showing 1 to 10 of \d+/)).toBeVisible();

		await page.getByLabel('Go to page, 2').click();

		await expect(page.getByText(/Showing 11 to \d+ of \d+/)).toBeVisible();

		const buyer = getPersona('ACCOUNT_BUYER');

		await page.locator('#account-members-search').fill(buyer.email);

		await expect(page.locator('tbody tr')).toHaveCount(1);

		await expect(tableRow(page, buyer.email)).toContainText(
			'Account Buyer'
		);

		await page.locator('#account-members-search').fill('');

		await page.getByRole('button', {exact: true, name: 'Filter'}).click();

		await clickDropdownItemBesideCheckbox(
			page
				.locator('.dropdown-menu.show .dropdown-item')
				.filter({hasText: /^Account Buyer$/})
		);

		await page.keyboard.press('Escape');

		await expect(tableRow(page, buyer.email)).toBeVisible();

		for (const row of await page.locator('tbody tr').all()) {
			await expect(row).toContainText('Account Buyer');
		}
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] invites a member and revokes the invitation', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const name = uniqueName('Invitee');

		const emailAddress = `${name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '.')}@example.com`;

		try {
			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

			await page.getByRole('button', {name: 'Invite Member'}).click();

			const form = page.locator('#invite-member');

			await form.locator('input[name="invites.0.givenName"]').fill(name);
			await form
				.locator('input[name="invites.0.familyName"]')
				.fill('E2E');
			await form
				.locator('input[name="invites.0.emailAddress"]')
				.fill(emailAddress);

			await page.getByRole('button', {name: 'Send Invitation'}).click();

			await expectToast(page, 'Invitation successfully sent.');

			await page.locator('#account-members-search').fill(emailAddress);

			const row = tableRow(page, emailAddress);

			await expect(row).toContainText('Invited');

			await row
				.getByRole('button', {name: 'Manage User Options'})
				.click();

			await page
				.getByRole('menuitem', {name: 'Revoke Invitation'})
				.click();

			await expect(
				page.getByText(
					new RegExp(
						`Are you sure you want to revoke the invitation for ${emailAddress.replace(/\./g, '\\.')}`
					)
				)
			).toBeVisible();

			await page.getByRole('button', {name: 'Confirm'}).click();

			await expectToast(page, 'Invitation successfully revoked.');

			await expect(row).toHaveCount(0);
		}
		finally {
			await deleteInvitations(adminAPI, emailAddress);
		}
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] grants a member an account role and takes it back', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		let member: TemporaryMember | undefined;

		try {
			member = await createTemporaryMember(adminAPI, [ACCOUNT_ERC]);

			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

			await page.locator('#account-members-search').fill(member.email);

			const row = tableRow(page, member.email);

			await expect(row).not.toContainText('Account Member');

			const editRoles = async (roleLabel: string) => {
				await row
					.getByRole('button', {name: 'Manage User Options'})
					.click();

				await page
					.getByRole('menuitem', {name: 'Edit Permissions'})
					.click();

				const form = page.locator('#edit-permissions');

				await form.locator('.account-members-roles-trigger').click();

				await clickDropdownItemBesideCheckbox(
					page
						.locator('.account-members-roles-menu .dropdown-item')
						.filter({hasText: new RegExp(`^${roleLabel}$`)})
				);

				await page.keyboard.press('Escape');

				await page.getByRole('button', {name: 'Save Changes'}).click();

				await expectToast(page, 'Permissions successfully updated.');
			};

			await editRoles('Account Member');

			await expect(row).toContainText('Account Member');

			await editRoles('None');

			await expect(row).not.toContainText('Account Member');
		}
		finally {
			await deleteTemporaryMember(adminAPI, member);
		}
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] keeps the last account admin from dropping the role', async ({
		page,
		signIn,
	}) => {
		const accountAdmin = await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${LAST_ADMIN_ACCOUNT_ERC}/account-members`);

		await tableRow(page, accountAdmin.email)
			.getByRole('button', {name: 'Manage User Options'})
			.click();

		await page.getByRole('menuitem', {name: 'Edit Permissions'}).click();

		await expect(
			page.getByText(
				'At least one Account Admin is required. Assign another Account Admin before changing this role.'
			)
		).toBeVisible();

		await page.getByRole('button', {name: 'Cancel'}).click();
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] selects a role when the user clicks its checkbox in Edit Permissions', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		let member: TemporaryMember | undefined;

		try {
			member = await createTemporaryMember(adminAPI, [ACCOUNT_ERC]);

			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

			await page.locator('#account-members-search').fill(member.email);

			const row = tableRow(page, member.email);

			await row
				.getByRole('button', {name: 'Manage User Options'})
				.click();

			await page
				.getByRole('menuitem', {name: 'Edit Permissions'})
				.click();

			await page
				.locator('#edit-permissions .account-members-roles-trigger')
				.click();

			await page
				.locator('.account-members-roles-menu')
				.getByLabel('Account Member', {exact: true})
				.click();

			await page.keyboard.press('Escape');

			await page.getByRole('button', {name: 'Save Changes'}).click();

			await expectToast(page, 'Permissions successfully updated.');

			test.fail(
				true,
				'The role item and its checkbox both toggle the role, so a click on the checkbox toggles it twice and saves no change.'
			);

			test.info().annotations.push({
				description:
					'EditPermissionsModal and AccountRolesSelect call toggleRole from ClayDropDown.Item onClick and ClayCheckbox onChange; a click on the checkbox sends PUT account-roles with accountRoleIds [].',
				type: 'issue',
			});

			await expect(row).toContainText('Account Member', {timeout: 5000});
		}
		finally {
			await deleteTemporaryMember(adminAPI, member);
		}
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] checks a role filter when the user clicks its checkbox', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

		await page.getByRole('button', {exact: true, name: 'Filter'}).click();

		const checkbox = page
			.locator('.dropdown-menu.show')
			.getByLabel('Account Buyer', {exact: true});

		await checkbox.click();

		test.fail(
			true,
			'The role filter item and its checkbox both toggle the role, so a click on the checkbox leaves the filter unchecked.'
		);

		test.info().annotations.push({
			description:
				'AccountMembers filter dropdown calls toggleRole from ClayDropDown.Item onClick and ClayCheckbox onChange.',
			type: 'issue',
		});

		await expect(checkbox).toBeChecked({timeout: 5000});
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] hides the members tab and page from an account buyer', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_BUYER');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-details`);

		await expect(page.getByRole('tab', {name: 'Details'})).toBeVisible();

		await expect(page.getByRole('tab', {name: 'Members'})).toHaveCount(0);

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

		await expect(
			page.getByText('You do not have access to this page.')
		).toBeVisible();
	});

	test('[FLOW-ACCOUNT-TEAM-MEMBERS] [ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS] shows members read only to an account member', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_MEMBER');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/account-members`);

		await expect(
			tableRow(page, /accountmember@customer\.com/)
		).toBeVisible();

		await expect(
			page.getByRole('button', {name: 'Invite Member'})
		).toHaveCount(0);

		await expect(
			page.getByRole('button', {name: 'Manage User Options'})
		).toHaveCount(0);
	});
});

test.describe('[FLOW-PROJECT-MEMBERSHIP] project permissions', () => {
	test('[FLOW-PROJECT-MEMBERSHIP] [ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] lists each project with its members', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project-members`);

		await expect(
			page.getByText(
				'Manage project roles and cloud contact designations.'
			)
		).toBeVisible();

		const row = tableRow(page, 'Omni Project 2');

		await expect(row).toContainText('Customer Admin · Admin');

		const moreButton = tableRow(page, /Omni Project(?! 2)/).getByRole(
			'button',
			{name: /^\+\d+ more$/}
		);

		await moreButton.click();

		await expect(
			tableRow(page, /Omni Project(?! 2)/).getByRole('button', {
				name: 'Show Less',
			})
		).toBeVisible();

		await expect(
			row.getByRole('button', {name: 'Manage project options'})
		).toBeVisible();
	});

	test('[FLOW-PROJECT-MEMBERSHIP] [ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] offers project management to a project admin only', async ({
		page,
		signIn,
	}) => {
		await signIn('PROJECT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project-members`);

		await expect(
			tableRow(page, /Omni Project(?! 2)/).getByRole('button', {
				name: 'Manage project options',
			})
		).toBeVisible();
	});

	test('[FLOW-PROJECT-MEMBERSHIP] [ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] hides project management from a project user', async ({
		page,
		signIn,
	}) => {
		await signIn('PROJECT_USER');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project-members`);

		await expect(tableRow(page, /Omni Project(?! 2)/)).toBeVisible();

		await expect(
			page.getByRole('button', {name: 'Manage project options'})
		).toHaveCount(0);
	});

	test('[FLOW-PROJECT-MEMBERSHIP] [ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] adds a project member and removes them', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		let member: TemporaryMember | undefined;

		try {
			member = await createTemporaryMember(adminAPI, [ACCOUNT_ERC]);

			const memberName = member.name;

			await signIn('ACCOUNT_ADMIN');

			await gotoMyAccount(page, `${ACCOUNT_ERC}/project-members`);

			const row = tableRow(page, UNASSIGNED_PROJECT_NAME);

			const openEditor = async () => {
				await row
					.getByRole('button', {name: 'Manage project options'})
					.click();

				await page
					.getByRole('menuitem', {name: 'Edit Project Permissions'})
					.click();

				await expect(
					page.locator('#edit-project-permissions')
				).toBeVisible();
			};

			await openEditor();

			const form = page.locator('#edit-project-permissions');

			await page.getByRole('button', {name: 'Add More People'}).click();

			const newRow = form.locator('.project-permissions-grid-row').last();

			await newRow.getByRole('button', {name: 'Select a member'}).click();

			await page
				.getByRole('menuitem', {exact: true, name: memberName})
				.click();

			await newRow.getByRole('button', {name: 'Select a role'}).click();

			await page
				.locator('.dropdown-menu.show')
				.getByLabel('User', {exact: true})
				.check();

			await page.keyboard.press('Escape');

			await page.getByRole('button', {name: 'Save Changes'}).click();

			await expectToast(page, 'Project members successfully updated.');

			await row.getByRole('button', {name: /^\+\d+ more$/}).click();

			await expect(row).toContainText(`${memberName} · User`);

			await openEditor();

			await form
				.locator('.project-permissions-grid-row')
				.filter({
					has: page.locator('.project-permissions-member-box', {
						hasText: new RegExp(`^${memberName}$`),
					}),
				})
				.getByRole('button', {name: 'Remove'})
				.click();

			await page.getByRole('button', {name: 'Save Changes'}).click();

			await expectToast(page, 'Project members successfully updated.');

			const showLess = row.getByRole('button', {name: 'Show Less'});

			if (await showLess.isVisible()) {
				await showLess.click();
			}

			const showMore = row.getByRole('button', {name: /^\+\d+ more$/});

			if (await showMore.isVisible()) {
				await showMore.click();
			}

			await expect(row).not.toContainText(`${memberName} · User`);
		}
		finally {
			await deleteTemporaryMember(adminAPI, member);
		}
	});

	test('[FLOW-PROJECT-MEMBERSHIP] [ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] requires a name, an email, and a role to invite a project member', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await gotoMyAccount(page, `${ACCOUNT_ERC}/project-members`);

		await tableRow(page, 'Omni Project 2')
			.getByRole('button', {name: 'Manage project options'})
			.click();

		await page
			.getByRole('menuitem', {name: 'Invite Project Member'})
			.click();

		await expect(page.locator('#invite-project-member')).toBeVisible();

		await page.getByRole('button', {name: 'Send Invitation'}).click();

		await expect(page.getByText('A role is required.')).toBeVisible();

		await page.getByRole('button', {name: 'Cancel'}).click();

		await expect(page.locator('#invite-project-member')).toHaveCount(0);
	});
});
