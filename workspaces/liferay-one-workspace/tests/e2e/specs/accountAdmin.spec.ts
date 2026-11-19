/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI from '../utils/HeadlessAPI';
import SpringBootStub from '../utils/SpringBootStub';
import {uniqueName} from '../utils/environmentUtils';
import {PersonaKey} from '../utils/getPersona';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryMember,
	createTemporaryMember,
	deleteTemporaryMember,
	expectToast,
	gotoMyAccount,
} from '../utils/myAccountUtils';
import {
	TemporaryBuyer,
	createTemporaryBuyer,
	deleteTemporaryBuyer,
} from '../utils/productPurchaseUtils';

type LicensingSettingName =
	| 'allowComplimentary'
	| 'allowPermanentLicenses'
	| 'allowSelfProvisioning';

type LicensingSettings = Record<LicensingSettingName, boolean | undefined>;

const LICENSING_SETTINGS: {label: string; name: LicensingSettingName}[] = [
	{label: 'Complimentary Key', name: 'allowComplimentary'},
	{label: 'Permanent Licenses', name: 'allowPermanentLicenses'},
	{label: 'Self Provisioning', name: 'allowSelfProvisioning'},
];

const LICENSING_SETTINGS_PATH = '/projects/:erc/licensing-settings';

const MANAGER_PERSONAS: PersonaKey[] = [
	'ADMINISTRATOR',
	'PROVISIONING_ADMIN',
	'PROVISIONING_WORKER',
];

type LicensingFixture = {
	buyer: TemporaryBuyer;
	projectERC: string;
	projectName: string;
};

async function createLicensingFixture(
	adminAPI: HeadlessAPI
): Promise<LicensingFixture> {
	const projectName = uniqueName('Licensing Project');

	const buyer = await createTemporaryBuyer(adminAPI, {
		label: 'Licensing Settings',
		projectName,
	});

	return {
		buyer,
		projectERC: `${buyer.account.externalReferenceCode}-PROJECT`,
		projectName,
	};
}

function getProject(adminAPI: HeadlessAPI, projectERC: string) {
	return adminAPI.get<LicensingSettings>(
		`/o/c/projects/by-external-reference-code/${projectERC}`
	);
}

async function createTemporaryLiferayStaff(
	adminAPI: HeadlessAPI
): Promise<TemporaryMember> {
	const member = await createTemporaryMember(adminAPI, []);

	try {
		const role = await adminAPI.get<{id: number}>(
			'/o/headless-admin-user/v1.0/roles/by-external-reference-code/C_LIFERAY_STAFF'
		);

		await adminAPI.post(
			`/o/headless-admin-user/v1.0/roles/${role.id}/association/user-account/${member.userId}`,
			{}
		);

		return member;
	}
	catch (error) {
		await deleteTemporaryMember(adminAPI, member);

		throw error;
	}
}

async function gotoAccountAdmin(page: Page, fixture: LicensingFixture) {
	await gotoMyAccount(
		page,
		`${fixture.buyer.account.externalReferenceCode}/account-admin`
	);
}

function licensingSwitch(page: Page, label: string, projectName: string) {
	return page.getByRole('switch', {name: `${label} ${projectName}`});
}

async function stubLicensingSettingsWithHeadlessWrite(
	adminAPI: HeadlessAPI,
	springBoot: SpringBootStub
) {
	await springBoot.on(
		'PATCH',
		LICENSING_SETTINGS_PATH,
		async ({body, params}) => ({
			body: await adminAPI.patch(
				`/o/c/projects/by-external-reference-code/${params.erc}`,
				body
			),
			contentType: 'application/json',
		})
	);
}

test.describe('[FLOW-MY-ACCOUNT-OVERVIEW] licensing settings on the Admin tab', () => {
	let fixture: LicensingFixture | undefined;
	let staff: TemporaryMember | undefined;

	test.afterEach(async ({adminAPI}) => {
		try {
			await deleteTemporaryMember(adminAPI, staff);
		}
		finally {
			await deleteTemporaryBuyer(adminAPI, fixture?.buyer);

			fixture = undefined;
			staff = undefined;
		}
	});

	for (const personaKey of MANAGER_PERSONAS) {
		test(`[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] [HOOK-MYACCOUNT-ACCOUNTADMIN-USEPROJECTLICENSINGSETTINGS] [REST-PATCH-PROJECTS-EXTERNALREFERENCECODE-LICENSING-SETTINGS] turns each licensing setting off and on as ${personaKey}`, async ({
			adminAPI,
			page,
			signIn,
			springBoot,
		}) => {
			fixture = await createLicensingFixture(adminAPI);

			await stubLicensingSettingsWithHeadlessWrite(adminAPI, springBoot);

			const {projectERC, projectName} = fixture;

			const initial = await getProject(adminAPI, projectERC);

			await signIn(personaKey);

			await gotoMyAccount(
				page,
				`${fixture.buyer.account.externalReferenceCode}/account-details`
			);

			await page.getByRole('tab', {name: 'Admin'}).click();

			await expect(page).toHaveURL(/\/account-admin$/);

			for (const {label, name} of LICENSING_SETTINGS) {
				const toggle = licensingSwitch(page, label, projectName);

				const before = Boolean(initial[name]);

				await expect(toggle).toBeEnabled();

				await expect(toggle).toBeChecked({checked: before});

				for (const expected of [!before, before]) {
					await toggle.click();

					await expectToast(
						page,
						'The changes were saved successfully.'
					);

					await expect(toggle).toBeChecked({checked: expected});

					await expect(toggle).toBeEnabled();

					await expect
						.poll(
							async () =>
								Boolean(
									(await getProject(adminAPI, projectERC))[
										name
									]
								),
							{message: `${name} after the save`}
						)
						.toBe(expected);

					if (expected !== before) {
						await gotoAccountAdmin(page, fixture);

						await expect(toggle).toBeChecked({checked: expected});
					}
				}
			}

			if (springBoot.enabled) {
				const calls = springBoot.callsTo(
					'PATCH',
					`/projects/${projectERC}/licensing-settings`
				);

				expect(calls.map(({body}) => body)).toEqual(
					LICENSING_SETTINGS.flatMap(({name}) => [
						{[name]: !initial[name]},
						{[name]: Boolean(initial[name])},
					])
				);
			}
		});
	}

	test('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] shows the licensing settings to Liferay Staff without letting them change any', async ({
		adminAPI,
		page,
		springBoot,
	}) => {
		fixture = await createLicensingFixture(adminAPI);

		staff = await createTemporaryLiferayStaff(adminAPI);

		await stubLicensingSettingsWithHeadlessWrite(adminAPI, springBoot);

		const initial = await getProject(adminAPI, fixture.projectERC);

		await liferayLogin(page, staff.email, staff.password);

		await gotoAccountAdmin(page, fixture);

		await expect(page.getByRole('tab', {name: 'Admin'})).toBeVisible();

		for (const {label, name} of LICENSING_SETTINGS) {
			const toggle = licensingSwitch(page, label, fixture.projectName);

			await expect(toggle).toBeDisabled();

			await expect(toggle).toBeChecked({checked: Boolean(initial[name])});
		}

		await expect(
			page.getByRole('button', {name: 'Sync to JSM'})
		).toBeDisabled();

		expect(
			springBoot.callsTo('PATCH', /\/licensing-settings$/)
		).toHaveLength(0);

		const after = await getProject(adminAPI, fixture.projectERC);

		for (const {name} of LICENSING_SETTINGS) {
			expect(Boolean(after[name])).toBe(Boolean(initial[name]));
		}
	});

	test('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] hides the Admin tab and denies the page to a Finance Administrator', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		fixture = await createLicensingFixture(adminAPI);

		await signIn('FINANCE_ADMIN');

		await expectNoAccountAdmin(page, fixture);
	});

	test('[ROUTE-MY-ACCOUNT-ACCOUNT-ADMIN] hides the Admin tab and denies the page to an account administrator', async ({
		adminAPI,
		page,
	}) => {
		fixture = await createLicensingFixture(adminAPI);

		await liferayLogin(page, fixture.buyer.email, fixture.buyer.password);

		await expectNoAccountAdmin(page, fixture);
	});

	test('[REST-PATCH-PROJECTS-EXTERNALREFERENCECODE-LICENSING-SETTINGS] keeps the setting and shows the reason when the save is refused', async ({
		adminAPI,
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'The real endpoint accepts the change for an administrator'
		);

		const detail =
			'Only an administrator, a Provisioning Administrator, or a Provisioning Worker can change the licensing settings';

		fixture = await createLicensingFixture(adminAPI);

		await springBoot.on('PATCH', LICENSING_SETTINGS_PATH, {
			body: {detail, status: 403, title: 'Forbidden'},
			contentType: 'application/problem+json',
			status: 403,
		});

		const initial = await getProject(adminAPI, fixture.projectERC);

		await signIn('ADMINISTRATOR');

		await gotoAccountAdmin(page, fixture);

		const toggle = licensingSwitch(
			page,
			'Permanent Licenses',
			fixture.projectName
		);

		await expect(toggle).toBeChecked({
			checked: Boolean(initial.allowPermanentLicenses),
		});

		await toggle.click();

		await expectToast(page, detail);

		await expect(toggle).toBeChecked({
			checked: Boolean(initial.allowPermanentLicenses),
		});

		await expect(toggle).toBeEnabled();

		const after = await getProject(adminAPI, fixture.projectERC);

		expect(Boolean(after.allowPermanentLicenses)).toBe(
			Boolean(initial.allowPermanentLicenses)
		);
	});
});

async function expectNoAccountAdmin(page: Page, fixture: LicensingFixture) {
	await gotoMyAccount(
		page,
		`${fixture.buyer.account.externalReferenceCode}/account-details`
	);

	await expect(page.getByRole('tab', {name: 'Details'})).toBeVisible();

	await expect(page.getByRole('tab', {name: 'Admin'})).toHaveCount(0);

	await gotoAccountAdmin(page, fixture);

	await expect(
		page.getByText('You do not have access to this page.')
	).toBeVisible();

	await expect(page.getByRole('switch')).toHaveCount(0);
}
