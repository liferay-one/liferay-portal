/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect} from '@playwright/test';

import HeadlessAPI from './HeadlessAPI';
import {gotoAndExpectRender} from './customElementUtils';
import {sitePath} from './environmentUtils';
import {Persona} from './getPersona';
import gotoStable from './gotoStable';
import {expectSettled} from './myAccountUtils';

const USERS_ADMIN_PORTLET =
	'com_liferay_users_admin_web_portlet_UsersAdminPortlet';

export type Impersonation = {
	doAsUserId: string;
	page: Page;
	userId: number;
};

export async function gotoMyAccountAs(
	impersonation: Impersonation,
	hashPath: string
) {
	await gotoAndExpectRender(
		impersonation.page,
		`${sitePath('/my-account')}?doAsUserId=${impersonation.doAsUserId}#/${hashPath}`
	);

	await expectSettled(impersonation.page);
}

export async function impersonate(
	adminAPI: HeadlessAPI,
	page: Page,
	persona: Persona
): Promise<Impersonation> {
	const {alternateName, id} = await adminAPI.get<{
		alternateName: string;
		id: number;
	}>(
		`/o/headless-admin-user/v1.0/user-accounts/by-email-address/${encodeURIComponent(persona.email)}`
	);

	await gotoStable(
		page,
		`/group/control_panel/manage?p_p_id=${USERS_ADMIN_PORTLET}&_${USERS_ADMIN_PORTLET}_keywords=${encodeURIComponent(persona.email)}`
	);

	await page
		.getByRole('row')
		.filter({
			has: page.getByRole('cell', {exact: true, name: alternateName}),
		})
		.getByRole('button', {name: 'Show Actions'})
		.click();

	const [impersonationPage] = await Promise.all([
		page.context().waitForEvent('page'),
		page.getByRole('menuitem', {name: /Impersonate User/}).click(),
	]);

	await impersonationPage.waitForLoadState('domcontentloaded');

	const doAsUserId = new URL(impersonationPage.url()).searchParams.get(
		'doAsUserId'
	);

	expect(
		doAsUserId,
		`expected Impersonate User to open a page as ${persona.email}`
	).toBeTruthy();

	return {doAsUserId: doAsUserId!, page: impersonationPage, userId: id};
}
