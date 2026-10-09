/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Enforces the account-level and project-level permission matrices (LPD-95398).
 *
 * Every row signs in as its own persona, so each persona needs a seeded user
 * whose email address and password are supplied through the environment. The
 * variables are listed in .env.example; nothing here falls back to the default
 * administrator, because a persona that silently resolves to an administrator
 * turns a denial row into a pass for the wrong reason.
 *
 * A block whose variables are unset is skipped with a reason naming them, so an
 * environment without seeded personas reports "not configured" rather than a
 * wall of failures. The hard failures below stay as a second line of defence
 * for a persona that slips past the skip guard.
 */

import {Locator, Page, expect, test} from '@playwright/test';

import {gotoAndExpectRender} from '../utils/customElementUtils';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

type Access = 'full' | 'none' | 'view';

type Feature = {
	action?: (page: Page) => Locator;
	content: (page: Page) => Locator;
	goto: (page: Page) => Promise<void>;
	name: string;
};

type Persona = {
	emailVariable: string;
	label: string;
	passwordVariable: string;
};

const ACCOUNT_ERC_VARIABLE = 'ONE_ACCOUNT_ERC';
const ACCOUNT_KEY_VARIABLE = 'ONE_ACCOUNT_KEY';
const PROJECT_ERC_VARIABLE = 'ONE_PROJECT_ERC';
const UNASSIGNED_PROJECT_ERC_VARIABLE = 'ONE_UNASSIGNED_PROJECT_ERC';

const LOADING_INDICATOR = '.loading-animation';

const RENDER_TIMEOUT = 30000;

function environmentValue(name: string): string {
	return process.env[name]?.trim() ?? '';
}

function missingVariables(names: string[]): string[] {
	return names.filter((name) => !environmentValue(name));
}

function personaVariables(persona: Persona): string[] {
	return [persona.emailVariable, persona.passwordVariable];
}

function requiredValue(name: string): string {
	const value = environmentValue(name);

	if (!value) {
		throw new Error(
			`Unable to build a permission matrix path because ${name} is not ` +
				`set. Set it in .env (see .env.example) and point it at the ` +
				`seeded record this matrix runs against.`
		);
	}

	return value;
}

function skipReason(names: string[]): string {
	return (
		`Persona credentials are not configured: ${[...names].sort().join(', ')}. ` +
		`Set them in .env (see .env.example) and seed a user per persona; ` +
		`running this matrix as the default administrator would pass rows ` +
		`that expect a denial.`
	);
}

async function signIn(page: Page, persona: Persona): Promise<void> {
	const missing = missingVariables(personaVariables(persona));

	if (missing.length) {
		throw new Error(
			`Unable to sign in as the ${persona.label} persona because ` +
				`${missing.join(' and ')} is not set. This matrix never falls ` +
				`back to the default administrator, because an administrator ` +
				`session would satisfy rows that expect no access.`
		);
	}

	await liferayLogin(
		page,
		environmentValue(persona.emailVariable),
		environmentValue(persona.passwordVariable)
	);
}

/**
 * Waits for the SPA to finish rendering. gotoAndExpectRender already proves the
 * custom element mounted and painted its first visible content; this adds the
 * loading indicators clearing, so an absence assertion made afterwards is about
 * content the app decided not to render rather than content it had not reached
 * yet.
 */

async function expectSettled(page: Page): Promise<void> {
	await expect(
		page.locator(LOADING_INDICATOR),
		'expected the SPA to finish loading before asserting what it rendered'
	).toHaveCount(0, {timeout: RENDER_TIMEOUT});
}

async function assertAccess(page: Page, feature: Feature, access: Access) {
	await feature.goto(page);

	await expectSettled(page);

	const content = feature.content(page);

	if (access === 'none') {
		await expect(
			content.first(),
			`expected ${feature.name} to be denied`
		).not.toBeVisible();

		return;
	}

	await expect(content.first()).toBeVisible({timeout: RENDER_TIMEOUT});

	if (feature.action) {
		const action = feature.action(page).first();

		if (access === 'full') {
			await expect(action).toBeVisible();
		}
		else {
			await expect(
				action,
				`expected ${feature.name} to be read only`
			).not.toBeVisible();
		}
	}
}

const ACCOUNT_ADMIN: Persona = {
	emailVariable: 'ONE_ACCOUNT_ADMIN_EMAIL',
	label: 'Account Admin',
	passwordVariable: 'ONE_ACCOUNT_ADMIN_PASSWORD',
};

const ACCOUNT_BUYER: Persona = {
	emailVariable: 'ONE_ACCOUNT_BUYER_EMAIL',
	label: 'Account Buyer',
	passwordVariable: 'ONE_ACCOUNT_BUYER_PASSWORD',
};

const ACCOUNT_MEMBER: Persona = {
	emailVariable: 'ONE_ACCOUNT_MEMBER_EMAIL',
	label: 'Account Member',
	passwordVariable: 'ONE_ACCOUNT_MEMBER_PASSWORD',
};

const NULL_PROJECT_MEMBER: Persona = {
	emailVariable: 'ONE_NULL_PROJECT_MEMBER_EMAIL',
	label: 'No Role (null), project member',
	passwordVariable: 'ONE_NULL_PROJECT_MEMBER_PASSWORD',
};

const NULL_ROLE: Persona = {
	emailVariable: 'ONE_NULL_ROLE_EMAIL',
	label: 'No Role (null)',
	passwordVariable: 'ONE_NULL_ROLE_PASSWORD',
};

const PARTNER_ACCOUNT_ADMIN: Persona = {
	emailVariable: 'ONE_PARTNER_ADMIN_EMAIL',
	label: 'Partner Account Admin',
	passwordVariable: 'ONE_PARTNER_ADMIN_PASSWORD',
};

const PROJECT_ADMIN: Persona = {
	emailVariable: 'ONE_PROJECT_ADMIN_EMAIL',
	label: 'Project Admin',
	passwordVariable: 'ONE_PROJECT_ADMIN_PASSWORD',
};

const PROJECT_REQUESTER: Persona = {
	emailVariable: 'ONE_PROJECT_REQUESTER_EMAIL',
	label: 'Project Requester',
	passwordVariable: 'ONE_PROJECT_REQUESTER_PASSWORD',
};

const PROJECT_USER: Persona = {
	emailVariable: 'ONE_PROJECT_USER_EMAIL',
	label: 'Project User',
	passwordVariable: 'ONE_PROJECT_USER_PASSWORD',
};

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

const ACCOUNT_DETAILS: Feature = {
	action: (page) => page.getByRole('button', {name: /edit/i}),
	content: (page) => page.getByRole('heading', {name: /account details/i}),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/account-details`
		),
	name: 'Account Details',
};

const ACCOUNT_MEMBERS: Feature = {
	action: (page) => page.getByRole('button', {name: /invite/i}),
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/account-members`
		),
	name: 'Account Members list',
};

const ACCOUNT_ORDERS: Feature = {
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(ACCOUNT_ERC_VARIABLE)}/orders`
		),
	name: 'Account Orders',
};

const PROJECTS: Feature = {
	action: (page) => page.getByRole('tab', {name: /project permissions/i}),
	content: (page) =>
		page.getByRole('link', {
			name: new RegExp(requiredValue(PROJECT_ERC_VARIABLE), 'i'),
		}),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(ACCOUNT_ERC_VARIABLE)}`
		),
	name: 'Projects',
};

const ACCOUNT_LEVEL_MATRIX: Array<{
	access: Record<string, Access>;
	feature: Feature;
}> = [
	{
		access: {
			'Account Admin': 'full',
			'Account Buyer': 'view',
			'Account Member': 'view',
			'No Role (null)': 'view',
			'Partner Account Admin': 'full',
		},
		feature: ACCOUNT_DETAILS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Account Buyer': 'none',
			'Account Member': 'view',
			'No Role (null)': 'view',
			'Partner Account Admin': 'full',
		},
		feature: ACCOUNT_MEMBERS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Account Buyer': 'view',
			'Account Member': 'view',
			'No Role (null)': 'none',
			'Partner Account Admin': 'full',
		},
		feature: ACCOUNT_ORDERS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Account Buyer': 'none',
			'Account Member': 'view',
			'No Role (null)': 'none',
			'Partner Account Admin': 'full',
		},
		feature: PROJECTS,
	},
];

const ACCOUNT_LEVEL_VARIABLES = [ACCOUNT_ERC_VARIABLE, PROJECT_ERC_VARIABLE];

const ACCOUNT_PERSONAS: Persona[] = [
	ACCOUNT_ADMIN,
	PARTNER_ACCOUNT_ADMIN,
	ACCOUNT_BUYER,
	ACCOUNT_MEMBER,
	NULL_ROLE,
];

test.describe('[FLOW-ROLE-ACCOUNT-PERMISSIONS] account-level pages permission matrix', () => {
	for (const account of ACCOUNT_PERSONAS) {
		test.describe(account.label, () => {
			const missing = missingVariables([
				...ACCOUNT_LEVEL_VARIABLES,
				...personaVariables(account),
			]);

			test.skip(Boolean(missing.length), skipReason(missing));

			for (const {access, feature} of ACCOUNT_LEVEL_MATRIX) {
				test(`[FLOW-ROLE-ACCOUNT-PERMISSIONS] ${account.label} — ${feature.name}: ${access[account.label]}`, async ({
					page,
				}) => {
					await signIn(page, account);

					await assertAccess(page, feature, access[account.label]);
				});
			}
		});
	}
});

const BUSINESS_EVENTS: Feature = {
	action: (page) => page.getByRole('button', {name: /add|new/i}),
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/support/business-events#/${requiredValue(
				ACCOUNT_KEY_VARIABLE
			)}/business-events`
		),
	name: 'Business Events (view)',
};

const PROJECT_DETAILS: Feature = {
	content: (page) => page.getByRole('heading', {level: 1}),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/${requiredValue(PROJECT_ERC_VARIABLE)}`
		),
	name: 'Project details (view)',
};

const PROJECT_MEMBERS: Feature = {
	action: (page) => page.getByRole('button', {name: /edit|assign|manage/i}),
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/project-members`
		),
	name: 'Project Members',
};

const SUBMIT_SUPPORT_TICKET: Feature = {
	action: (page) =>
		page.getByRole('button', {name: /submit|new ticket|create/i}),
	content: (page) => page.getByRole('heading', {name: /support|tickets/i}),
	goto: (page) => gotoAndExpectRender(page, '/web/one/support'),
	name: 'Submit support ticket',
};

const TICKET_ATTACHMENTS: Feature = {
	action: (page) => page.getByRole('button', {name: /upload|attach/i}),
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(page, '/web/one/support/ticket-attachments#/'),
	name: 'Ticket Attachments (view)',
};

const PROJECT_LEVEL_MATRIX: Array<{
	access: Record<string, Access>;
	feature: Feature;
}> = [
	{
		access: {
			'Account Admin': 'view',
			'Project Admin': 'view',
			'Project Requester': 'view',
			'Project User': 'view',
		},
		feature: PROJECT_DETAILS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Project Admin': 'full',
			'Project Requester': 'view',
			'Project User': 'view',
		},
		feature: PROJECT_MEMBERS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Project Admin': 'full',
			'Project Requester': 'full',
			'Project User': 'view',
		},
		feature: BUSINESS_EVENTS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Project Admin': 'full',
			'Project Requester': 'full',
			'Project User': 'view',
		},
		feature: TICKET_ATTACHMENTS,
	},
	{
		access: {
			'Account Admin': 'full',
			'Project Admin': 'full',
			'Project Requester': 'full',
			'Project User': 'view',
		},
		feature: SUBMIT_SUPPORT_TICKET,
	},
];

const PROJECT_LEVEL_VARIABLES = [
	ACCOUNT_ERC_VARIABLE,
	ACCOUNT_KEY_VARIABLE,
	PROJECT_ERC_VARIABLE,
];

const PROJECT_PERSONAS: Persona[] = [
	ACCOUNT_ADMIN,
	PROJECT_ADMIN,
	PROJECT_REQUESTER,
	PROJECT_USER,
];

test.describe('[FLOW-ROLE-PROJECT-PERMISSIONS] project-level pages permission matrix', () => {
	for (const projectPersona of PROJECT_PERSONAS) {
		test.describe(projectPersona.label, () => {
			const missing = missingVariables([
				...PROJECT_LEVEL_VARIABLES,
				...personaVariables(projectPersona),
			]);

			test.skip(Boolean(missing.length), skipReason(missing));

			for (const {access, feature} of PROJECT_LEVEL_MATRIX) {
				test(`[FLOW-ROLE-PROJECT-PERMISSIONS] ${projectPersona.label} — ${feature.name}: ${access[projectPersona.label]}`, async ({
					page,
				}) => {
					await signIn(page, projectPersona);

					await assertAccess(
						page,
						feature,
						access[projectPersona.label]
					);
				});
			}
		});
	}
});

const NULL_PROJECT_ACCESS_VARIABLES = [
	ACCOUNT_ERC_VARIABLE,
	PROJECT_ERC_VARIABLE,
	UNASSIGNED_PROJECT_ERC_VARIABLE,
	...personaVariables(NULL_PROJECT_MEMBER),
	...personaVariables(NULL_ROLE),
];

test.describe('[FLOW-ROLE-NULL-PROJECT-ACCESS] null role project access', () => {
	const missing = missingVariables(NULL_PROJECT_ACCESS_VARIABLES);

	test.skip(Boolean(missing.length), skipReason(missing));

	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] with no project membership, only account-level pages are reachable', async ({
		page,
	}) => {
		await signIn(page, NULL_ROLE);

		await assertAccess(page, ACCOUNT_DETAILS, 'view');
		await assertAccess(page, ACCOUNT_MEMBERS, 'view');

		await gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/${requiredValue(PROJECT_ERC_VARIABLE)}`
		);

		await expectSettled(page);

		await expect(
			page.getByRole('table').first(),
			'expected a project the user is not a member of to render no data'
		).not.toBeVisible();
	});

	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] with a project membership, account-level and that project are reachable', async ({
		page,
	}) => {
		await signIn(page, NULL_PROJECT_MEMBER);

		await assertAccess(page, ACCOUNT_DETAILS, 'view');

		await gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/${requiredValue(PROJECT_ERC_VARIABLE)}`
		);

		await expectSettled(page);

		await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible(
			{
				timeout: RENDER_TIMEOUT,
			}
		);
	});

	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] a project the user is not assigned to is not displayed', async ({
		page,
	}) => {
		await signIn(page, NULL_PROJECT_MEMBER);

		const unassignedProjectERC = requiredValue(
			UNASSIGNED_PROJECT_ERC_VARIABLE
		);

		await gotoAndExpectRender(
			page,
			`/web/one/my-account#/${requiredValue(
				ACCOUNT_ERC_VARIABLE
			)}/${unassignedProjectERC}`
		);

		await expectSettled(page);

		await expect(
			page
				.getByRole('link', {
					name: new RegExp(unassignedProjectERC, 'i'),
				})
				.first(),
			'expected an unassigned project to stay out of the navigation'
		).not.toBeVisible();

		await expect(
			page.getByRole('table').first(),
			'expected an unassigned project to render no data'
		).not.toBeVisible();
	});
});
