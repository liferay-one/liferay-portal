/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Locator, Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {selectCurrentAccount} from '../utils/accountUtils';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {
	ACCOUNT_ERC,
	PROJECT_ERC,
	PROJECT_NAME,
	UNASSIGNED_PROJECT_ERC,
	UNASSIGNED_PROJECT_NAME,
	sitePath,
} from '../utils/environmentUtils';
import getPersona, {PersonaKey} from '../utils/getPersona';
import {FakeJira} from '../utils/supportFakesUtils';

type Access = 'full' | 'none' | 'view';

type Feature = {
	action?: (page: Page) => Locator;
	content: (page: Page) => Locator;
	denial?: (page: Page) => Locator;
	goto: (page: Page) => Promise<void>;
	name: string;
};

const FETCH_ERROR_TEXT = 'An error occurred while fetching the data.';

const LOADING_INDICATOR = '.loading-animation';

const NO_ACCESS_TEXT = 'You do not have access to this page.';

const RENDER_TIMEOUT = 30000;

const PLACED_ORDERS_404 =
	'GET /o/headless-commerce-delivery-order/v1.0/channels/{channelId}/accounts/{accountId}/placed-orders answers 404 for every role but Account Administrator, so the page shows "An error occurred while fetching the data."';

const KNOWN_DEFECTS: Record<string, string> = {
	'Account Admin — Account Details':
		'Account Details renders no edit control for any role, so an administrator cannot change the account details the matrix grants them.',
	'Account Buyer — Account Orders': PLACED_ORDERS_404,
	'Account Buyer — Projects':
		'An Account Buyer with no project membership lands on the One-Time Purchases pseudo-project, whose Products tab shows "An error occurred while fetching the data." instead of a denial or "No Projects Yet", because ' +
		PLACED_ORDERS_404,
	'Account Member — Account Orders': PLACED_ORDERS_404,
	'No Role (null) — Projects':
		'A user without an account role or project lands on the One-Time Purchases pseudo-project, whose Products tab shows "An error occurred while fetching the data." instead of a denial or "No Projects Yet", because ' +
		PLACED_ORDERS_404,
	'No Role (null), project member — assigned project': `The assigned project opens, but its Products tab shows "An error occurred while fetching the data." because ${PLACED_ORDERS_404}`,
	'Partner Account Admin — Account Details':
		'Account Details renders no edit control for any role, so a partner administrator cannot change the account details the matrix grants them.',
	'Partner Account Admin — Account Orders': PLACED_ORDERS_404,
	'Project Admin — Project details (view)': `The project Products tab shows "An error occurred while fetching the data." because ${PLACED_ORDERS_404}`,
	'Project Requester — Project details (view)': `The project Products tab shows "An error occurred while fetching the data." because ${PLACED_ORDERS_404}`,
	'Project User — Project details (view)': `The project Products tab shows "An error occurred while fetching the data." because ${PLACED_ORDERS_404}`,
	'Project User — Submit support ticket':
		'The Support menu offers Submit a Request, an external Jira Service Management link, to every signed in user, so a Project User is not limited to viewing tickets.',
	'Project User — Ticket Attachments (view)':
		'Ticket Attachments shows New Attachment to every project member; the upload is refused only after the user picks a ticket, by the Spring Boot access check.',
};

function myAccountPath(path: string) {
	return sitePath(`/my-account#/${ACCOUNT_ERC}${path}`);
}

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

		await expect(
			page.getByText(FETCH_ERROR_TEXT),
			`expected ${feature.name} to be denied rather than broken`
		).toHaveCount(0);

		if (feature.denial) {
			await expect(
				feature.denial(page).first(),
				`expected ${feature.name} to say that access is denied`
			).toBeVisible();
		}

		return;
	}

	await expect(
		content.first(),
		`expected ${feature.name} to be visible`
	).toBeVisible({timeout: RENDER_TIMEOUT});

	if (feature.action) {
		const action = feature.action(page).first();

		if (access === 'full') {
			await expect(
				action,
				`expected ${feature.name} to offer its action`
			).toBeVisible();
		}
		else {
			await expect(
				action,
				`expected ${feature.name} to be read only`
			).not.toBeVisible();
		}
	}
}

async function signInOnAccount(
	page: Page,
	signIn: (key: PersonaKey) => Promise<unknown>,
	persona: PersonaKey
) {
	await signIn(persona);

	await selectCurrentAccount(page, ACCOUNT_ERC);
}

function markKnownDefect(cell: string) {
	const defect = KNOWN_DEFECTS[cell];

	if (defect) {
		test.info().annotations.push({description: defect, type: 'issue'});

		test.fail();
	}
}

const ACCOUNT_DETAILS: Feature = {
	action: (page) => page.getByRole('button', {name: /edit/i}),
	content: (page) => page.getByText('Main Information', {exact: true}),
	goto: (page) =>
		gotoAndExpectRender(page, myAccountPath('/account-details')),
	name: 'Account Details',
};

const ACCOUNT_MEMBERS: Feature = {
	action: (page) => page.getByRole('button', {name: 'Invite Member'}),
	content: (page) => page.getByRole('table'),
	denial: (page) => page.getByText(NO_ACCESS_TEXT),
	goto: (page) =>
		gotoAndExpectRender(page, myAccountPath('/account-members')),
	name: 'Account Members list',
};

const ACCOUNT_ORDERS: Feature = {
	content: (page) => page.getByRole('table'),
	denial: (page) => page.getByText(NO_ACCESS_TEXT),
	goto: (page) => gotoAndExpectRender(page, myAccountPath('/orders')),
	name: 'Account Orders',
};

const PROJECTS: Feature = {
	action: (page) =>
		page.getByRole('menuitem', {name: new RegExp(UNASSIGNED_PROJECT_NAME)}),
	content: (page) => page.getByText(PROJECT_NAME, {exact: true}),
	goto: async (page) => {
		await gotoAndExpectRender(page, myAccountPath('/project'));

		await expectSettled(page);

		const selector = page.getByRole('button', {name: 'Select Project'});

		if (await selector.count()) {
			await selector.click();
		}
	},
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
			'Account Member': 'full',
			'No Role (null)': 'none',
			'Partner Account Admin': 'full',
		},
		feature: PROJECTS,
	},
];

const ACCOUNT_PERSONAS: PersonaKey[] = [
	'ACCOUNT_ADMIN',
	'PARTNER_ADMIN',
	'ACCOUNT_BUYER',
	'ACCOUNT_MEMBER',
	'NULL_ROLE',
];

test.describe('[FLOW-ROLE-ACCOUNT-PERMISSIONS] account-level pages permission matrix', () => {
	for (const personaKey of ACCOUNT_PERSONAS) {
		const {label} = getPersona(personaKey);

		test.describe(label, () => {
			for (const {access, feature} of ACCOUNT_LEVEL_MATRIX) {
				const cell = `${label} — ${feature.name}`;

				test(`[FLOW-ROLE-ACCOUNT-PERMISSIONS] ${cell}: ${access[label]}`, async ({
					page,
					signIn,
				}) => {
					await signInOnAccount(page, signIn, personaKey);

					markKnownDefect(cell);

					await assertAccess(page, feature, access[label]);
				});
			}
		});
	}
});

const BUSINESS_EVENTS: Feature = {
	action: (page) => page.getByRole('link', {name: 'Create Event'}),
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			sitePath(`/support/business-events#/${PROJECT_ERC}/business-events`)
		),
	name: 'Business Events (view)',
};

const PROJECT_DETAILS: Feature = {
	content: (page) => page.getByRole('table'),
	goto: (page) =>
		gotoAndExpectRender(
			page,
			myAccountPath(`/project/${PROJECT_ERC}/products`)
		),
	name: 'Project details (view)',
};

const PROJECT_MEMBERS: Feature = {
	action: (page) =>
		page
			.getByRole('row')
			.filter({hasText: PROJECT_NAME})
			.getByRole('button', {name: 'Manage project options'}),
	content: (page) => page.getByRole('row').filter({hasText: PROJECT_NAME}),
	goto: (page) =>
		gotoAndExpectRender(page, myAccountPath('/project-members')),
	name: 'Project Members',
};

const SUBMIT_SUPPORT_TICKET: Feature = {
	action: (page) =>
		page.locator('.adt-navigation').getByRole('link', {
			name: /^Submit a Request/,
		}),
	content: (page) =>
		page.locator('.adt-navigation').getByRole('link', {
			name: /^View My Tickets/,
		}),
	goto: async (page) => {
		await page.goto(sitePath('/home'));

		await page
			.locator('.adt-navigation')
			.getByRole('button', {name: 'Support'})
			.click();
	},
	name: 'Submit support ticket',
};

const TICKET_ATTACHMENTS: Feature = {
	action: (page) => page.getByRole('button', {name: 'New Attachment'}),
	content: (page) =>
		page
			.getByRole('table')
			.or(page.getByText('No ticket attachments were found.')),
	goto: (page) =>
		gotoAndExpectRender(page, sitePath('/support/ticket-attachments#/')),
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

const PROJECT_PERSONAS: PersonaKey[] = [
	'ACCOUNT_ADMIN',
	'PROJECT_ADMIN',
	'PROJECT_REQUESTER',
	'PROJECT_USER',
];

test.describe('[FLOW-ROLE-PROJECT-PERMISSIONS] project-level pages permission matrix', () => {
	for (const personaKey of PROJECT_PERSONAS) {
		const {label} = getPersona(personaKey);

		test.describe(label, () => {
			for (const {access, feature} of PROJECT_LEVEL_MATRIX) {
				const cell = `${label} — ${feature.name}`;

				test(`[FLOW-ROLE-PROJECT-PERMISSIONS] ${cell}: ${access[label]}`, async ({
					page,
					signIn,
					springBoot,
				}) => {
					if (feature === BUSINESS_EVENTS) {
						test.skip(
							!springBoot.enabled,
							'The business events table needs an event, which only the stubbed Jira can seed'
						);

						const jira = new FakeJira(springBoot);

						await jira.install();

						jira.addEvent({name: 'Matrix Event'});
					}

					await signInOnAccount(page, signIn, personaKey);

					markKnownDefect(cell);

					await assertAccess(page, feature, access[label]);
				});
			}
		});
	}
});

test.describe('[FLOW-ROLE-NULL-PROJECT-ACCESS] null role project access', () => {
	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] with no project membership, only account-level pages are reachable', async ({
		page,
		signIn,
	}) => {
		await signInOnAccount(page, signIn, 'NULL_ROLE');

		markKnownDefect('No Role (null) — no project membership');

		await assertAccess(page, ACCOUNT_DETAILS, 'view');
		await assertAccess(page, ACCOUNT_MEMBERS, 'view');

		await gotoAndExpectRender(
			page,
			myAccountPath(`/project/${PROJECT_ERC}/products`)
		);

		await expectSettled(page);

		await expect(
			page.getByText(PROJECT_NAME, {exact: true}),
			'expected a project the user is not a member of to stay hidden'
		).toHaveCount(0);

		await expect(
			page.getByRole('table'),
			'expected a project the user is not a member of to render no data'
		).toHaveCount(0);
	});

	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] with a project membership, account-level and that project are reachable', async ({
		page,
		signIn,
	}) => {
		await signInOnAccount(page, signIn, 'NULL_PROJECT_MEMBER');

		markKnownDefect('No Role (null), project member — assigned project');

		await assertAccess(page, ACCOUNT_DETAILS, 'view');

		await gotoAndExpectRender(
			page,
			myAccountPath(`/project/${PROJECT_ERC}/products`)
		);

		await expectSettled(page);

		await expect(page).toHaveURL(new RegExp(`/project/${PROJECT_ERC}/`));

		await expect(
			page.getByText(PROJECT_NAME, {exact: true}).first()
		).toBeVisible();
		await expect(page.getByRole('table')).toBeVisible({
			timeout: RENDER_TIMEOUT,
		});
	});

	test('[FLOW-ROLE-NULL-PROJECT-ACCESS] a project the user is not assigned to is not displayed', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const unassignedProject = await adminAPI.get<{name: string}>(
			`/o/c/projects/by-external-reference-code/${UNASSIGNED_PROJECT_ERC}`
		);

		await signInOnAccount(page, signIn, 'NULL_PROJECT_MEMBER');

		await gotoAndExpectRender(
			page,
			myAccountPath(`/project/${UNASSIGNED_PROJECT_ERC}/products`)
		);

		await expectSettled(page);

		await expect(
			page,
			'expected an unassigned project to redirect to one the user belongs to'
		).not.toHaveURL(new RegExp(`/project/${UNASSIGNED_PROJECT_ERC}/`));

		await expect(
			page.getByText(unassignedProject.name, {exact: true}),
			'expected an unassigned project to stay out of the navigation'
		).toHaveCount(0);
	});
});
