/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Locator, Page, expect} from '@playwright/test';

import HeadlessAPI, {HeadlessPage} from './HeadlessAPI';
import {gotoAndExpectRender} from './customElementUtils';
import {sitePath} from './environmentUtils';

const ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/accounts';

const RENDER_TIMEOUT = 30000;

const SETTLE_TIMEOUT = 60000;

const USER_ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/user-accounts';

/**
 * Opens a My Account route. Navigating to `#/{accountERC}/...` makes the SPA
 * switch the commerce account to that ERC and reload, so this waits for the
 * loading indicators to clear after the reload before a spec asserts.
 */

export async function gotoMyAccount(page: Page, hashPath: string) {
	await gotoAndExpectRender(page, `${sitePath('/my-account')}#/${hashPath}`);

	await expectSettled(page);
}

export async function expectSettled(page: Page) {
	const myAccount = page.locator(
		'liferay-one-custom-element[route="my-account"]'
	);

	await expect(myAccount.getByText('Loading…', {exact: true})).toHaveCount(
		0,
		{timeout: SETTLE_TIMEOUT}
	);

	await expect(
		myAccount.locator('.loading-animation, .loading-page, .loading-overlay')
	).toHaveCount(0, {timeout: SETTLE_TIMEOUT});
}

/**
 * Selects an item in an account role picker by clicking the item beside its
 * checkbox.
 *
 * The role pickers toggle a role from both the item's click handler and the
 * checkbox's change handler. A click on the checkbox toggles the role twice
 * and leaves it unchanged, and a click on the label can do the same. A click
 * on the item's empty edge reaches only the item handler, so it is the one
 * click that selects a role reliably. The specs that cover that defect click
 * the checkbox on purpose.
 */

export async function clickDropdownItemBesideCheckbox(item: Locator) {
	const box = await item.boundingBox();

	expect(box, 'expected the dropdown item to be visible').toBeTruthy();

	await item.click({position: {x: box!.width - 5, y: box!.height / 2}});
}

export function expectToast(page: Page, message: RegExp | string) {
	return expect(
		page.locator('.alert').filter({hasText: message}).first()
	).toBeVisible({timeout: RENDER_TIMEOUT});
}

export function tableRow(page: Page, text: RegExp | string): Locator {
	return page.getByRole('row').filter({hasText: text});
}

export type TemporaryMember = {
	email: string;
	name: string;
	password: string;
	userId: number;
};

/**
 * Creates a user the test owns outright: a member of each given account with
 * no account role, in the Customers and Everyone user groups like a seeded
 * customer. A journey that grants it a role, adds it to a project, or switches
 * its current account changes nothing that another spec, or a parallel
 * worker, reads through a shared persona. `deleteTemporaryMember` removes it.
 */

export async function createTemporaryMember(
	adminAPI: HeadlessAPI,
	accountERCs: string[]
): Promise<TemporaryMember> {
	const suffix = `${Date.now().toString(36)}${Math.random()
		.toString(36)
		.slice(2, 6)}`;

	const email = `e2e-${suffix}@example.com`;
	const password = 'test';

	const user = await adminAPI.post<{id: number; name: string}>(
		USER_ACCOUNTS_PATH,
		{
			alternateName: `e2e${suffix}`,
			emailAddress: email,
			familyName: suffix,
			givenName: 'E2E',
			password,
		}
	);

	const member = {email, name: user.name, password, userId: user.id};

	try {
		for (const userGroupERC of ['C_CUSTOMERS', 'C_EVERYONE']) {
			await adminAPI.post(
				`/o/headless-admin-user/v1.0/user-groups/by-external-reference-code/${userGroupERC}/user-group-users`,
				[user.id]
			);
		}

		for (const accountERC of accountERCs) {
			await adminAPI.post(
				`${ACCOUNTS_PATH}/by-external-reference-code/${accountERC}/user-accounts/by-email-address/${email}`,
				{}
			);
		}

		return member;
	}
	catch (error) {
		await deleteTemporaryMember(adminAPI, member);

		throw error;
	}
}

/**
 * Deletes the project memberships of a temporary member, then the member. A
 * membership left behind points at a deleted user and renders as an unknown
 * member chip on Project Permissions.
 */

export async function deleteTemporaryMember(
	adminAPI: HeadlessAPI,
	member: TemporaryMember | undefined
): Promise<void> {
	if (!member) {
		return;
	}

	try {
		const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
			`/o/c/projectmemberships?filter=${encodeURIComponent(
				`r_userToProjectMembership_userId eq '${member.userId}'`
			)}&pageSize=100`
		);

		for (const {id} of items) {
			await adminAPI.deleteIfExists(`/o/c/projectmemberships/${id}`);
		}
	}
	finally {
		await adminAPI.deleteIfExists(`${USER_ACCOUNTS_PATH}/${member.userId}`);
	}
}
