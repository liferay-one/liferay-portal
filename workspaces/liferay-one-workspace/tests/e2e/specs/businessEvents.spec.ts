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
	sitePath,
	uniqueName,
} from '../utils/environmentUtils';
import {FakeJira} from '../utils/supportFakesUtils';

/**
 * Business events are Jira Assets objects that the Spring Boot client
 * extension reads and writes. Locally `FakeJira` answers those calls. With
 * `ONE_E2E_BACKEND=live` the lifecycle journey creates a real event and always
 * cancels it before the test ends, even when a step fails, because Jira offers
 * no delete; recording the actual date would complete the real event, so that
 * step runs only against the stub. The tests that need seeded or broken Jira
 * data skip in live mode, and each skip states why.
 */

const LIST_PATH = sitePath(
	`/support/business-events#/${PROJECT_ERC}/business-events`
);

const ADD_PATH = sitePath(
	`/support/business-events#/${PROJECT_ERC}/business-events/add`
);

function eventPath(id: string, suffix = '') {
	return sitePath(
		`/support/business-events#/${PROJECT_ERC}/business-events/${id}${suffix}`
	);
}

function dateFromToday(daysAhead: number) {
	const date = new Date();

	date.setDate(date.getDate() + daysAhead);

	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${month}-${day}-${date.getFullYear()}`;
}

async function fillTime(scope: Locator, hours: string, minutes: string) {
	const hoursInput = scope.getByRole('textbox', {
		name: 'Enter the hour in 00:00 format',
	});
	const minutesInput = scope.getByRole('textbox', {
		name: 'Enter the minutes in 00:00 format',
	});

	await hoursInput.click();
	await hoursInput.pressSequentially(hours);
	await minutesInput.click();
	await minutesInput.pressSequentially(minutes);
}

async function openRowAction(page: Page, eventName: string, action: string) {
	const row = page.getByRole('row').filter({hasText: eventName});

	await row.getByRole('button', {name: 'Manage User Options'}).click();

	await page.getByRole('menuitem', {name: action}).click();
}

/**
 * Applies one filter value. The filter menu reopens on the category it last
 * showed, where the only category button is the one that leads back to the
 * category list, so the helper goes back first when it lands there.
 */

async function applyFilter(page: Page, category: string, value: string) {
	await page.getByRole('button', {name: 'Filters'}).click();

	const categoryButtons = page.getByRole('button', {
		name: /^Event (Status|Type)$/,
	});

	if ((await categoryButtons.count()) === 1) {
		await categoryButtons.click();
	}

	await page.getByRole('button', {name: category}).click();
	await page.getByRole('checkbox', {name: value}).check();
	await page.getByRole('button', {name: 'Apply'}).click();
	await page.keyboard.press('Escape');
}

function eventRow(page: Page, eventName: string) {
	return page.getByRole('row').filter({hasText: eventName});
}

async function cancelEvent(page: Page, eventName: string, reason: string) {
	await gotoAndExpectRender(page, LIST_PATH);

	await openRowAction(page, eventName, 'Cancel Event');

	const cancelModal = page.getByRole('dialog');

	await cancelModal.getByRole('textbox').fill(reason);

	await cancelModal
		.getByRole('button', {name: 'Cancel Business Event'})
		.click();

	await expect(eventRow(page, eventName)).toContainText('Canceled');
}

test.describe('[FLOW-BUSINESS-EVENT-LIFECYCLE] business event lifecycle', () => {
	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-ADD] [ROUTE-BUSINESS-EVENTS-EDIT] [ROUTE-BUSINESS-EVENTS-ID] [ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY] a requester creates, edits, and reviews the history of an event, then closes it', async ({
		page,
		signIn,
		springBoot,
	}) => {
		const jira = new FakeJira(springBoot);

		await jira.install();

		const eventName = uniqueName('Go Live');

		await signIn('PROJECT_REQUESTER');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, LIST_PATH);

		await page.getByRole('link', {name: 'Create Event'}).click();

		await expect(
			page.getByText('Create Business Event', {exact: true})
		).toBeVisible();

		const createButton = page.getByRole('button', {name: 'Create Event'});

		await expect(createButton).toBeDisabled();

		await page.getByLabel('Event Type').selectOption('Migration');

		await expect(
			page.getByLabel('New Version'),
			'expected a migration to ask for the version it moves to'
		).toBeVisible();

		await page.getByLabel('Event Type').selectOption('Go Live');

		await expect(page.getByLabel('New Version')).toBeHidden();

		await page.getByPlaceholder('Event Name').fill(eventName);
		await page
			.getByLabel('Your Current Liferay Version')
			.selectOption({label: 'Liferay DXP 7.4'});
		await page.getByPlaceholder('MM-DD-YYYY').fill(dateFromToday(30));
		await page.getByLabel('Time Zone').selectOption('UTC +0');
		await fillTime(page.getByRole('main'), '10', '30');

		await expect(createButton).toBeEnabled();

		let isClosed = false;

		try {
			await createButton.click();

			await expect(
				page.getByText('Business event created successfully.')
			).toBeVisible();

			await expect(eventRow(page, eventName)).toBeVisible();

			await openRowAction(page, eventName, 'View Details');

			await expect(
				page.getByRole('heading', {name: eventName})
			).toBeVisible();
			await expect(page.getByText('Go Live').first()).toBeVisible();

			await page.getByRole('button', {name: 'Actions'}).click();
			await page.getByRole('menuitem', {name: 'Edit Event'}).click();

			await page.getByPlaceholder('MM-DD-YYYY').fill(dateFromToday(45));

			await page.getByRole('button', {name: 'Save Changes'}).click();

			const changeDateModal = page.getByRole('dialog');

			await expect(
				changeDateModal.getByText('Change Planned Event Date')
			).toBeVisible();

			await changeDateModal
				.getByRole('textbox')
				.fill('The customer moved the launch.');

			await changeDateModal
				.getByRole('button', {name: /save|confirm/i})
				.click();

			await expect(
				page.getByText('The changes were saved successfully.')
			).toBeVisible();

			await gotoAndExpectRender(page, LIST_PATH);

			await openRowAction(page, eventName, 'View Details');

			await page
				.getByRole('button', {name: 'Switch to Activity History'})
				.click();

			await expect(page.getByRole('table')).toContainText(
				'The customer moved the launch.'
			);

			if (!springBoot.enabled) {
				await cancelEvent(
					page,
					eventName,
					'The e2e suite closes the event it created.'
				);

				isClosed = true;

				return;
			}

			await gotoAndExpectRender(page, LIST_PATH);

			await openRowAction(page, eventName, 'Record Actual Event Date');

			const recordModal = page.getByRole('dialog');

			await recordModal
				.getByPlaceholder('MM-DD-YYYY')
				.fill(dateFromToday(0));
			await recordModal.getByLabel('Time Zone').selectOption('UTC +0');
			await fillTime(recordModal, '00', '01');

			await recordModal
				.getByRole('button', {name: 'Record Actual Event Date'})
				.click();

			await expect(eventRow(page, eventName)).toContainText('Completed');

			isClosed = true;
		}
		finally {
			if (!springBoot.enabled && !isClosed) {
				await cancelEvent(
					page,
					eventName,
					'The e2e suite closes the event it created.'
				).catch((error: Error) => {
					test.info().annotations.push({
						description: `Unable to cancel the live business event ${eventName}: ${error.message}`,
						type: 'cleanup-failed',
					});
				});
			}
		}
	});

	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] cancelling an event closes it to further edits', async ({
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Cancels a seeded Jira event, which only the stub provides; a live lifecycle run cancels its own event instead'
		);

		const jira = new FakeJira(springBoot);

		await jira.install();

		const eventName = uniqueName('Upgrade');

		jira.addEvent({name: eventName});

		await signIn('PROJECT_ADMIN');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, LIST_PATH);

		await openRowAction(page, eventName, 'Cancel Event');

		const cancelModal = page.getByRole('dialog');

		const cancelButton = cancelModal.getByRole('button', {
			name: 'Cancel Business Event',
		});

		await expect(
			cancelButton,
			'expected a cancellation to require a reason'
		).toBeDisabled();

		await cancelModal.getByRole('textbox').fill('The project was paused.');

		await cancelButton.click();

		await expect(
			page.getByText('Business event canceled successfully')
		).toBeVisible();

		await expect(eventRow(page, eventName)).toContainText('Canceled');

		await eventRow(page, eventName)
			.getByRole('button', {name: 'Manage User Options'})
			.click();

		await expect(
			page.getByRole('menuitem', {name: 'View Details'})
		).toBeVisible();
		await expect(
			page.getByRole('menuitem', {name: 'Edit Event'})
		).toHaveCount(0);

		await page.keyboard.press('Escape');

		const [id] = [...jira.events.values()]
			.filter(({name}) => name === eventName)
			.map((event) => event.id);

		await gotoAndExpectRender(page, eventPath(id, '/edit'));

		await expect(
			page.getByText('Cannot edit canceled or completed events.')
		).toBeVisible();
	});

	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] search, status, and type filters narrow the list', async ({
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Asserts on Jira events that only the stub can seed'
		);

		const jira = new FakeJira(springBoot);

		await jira.install();

		const goLive = jira.addEvent({name: uniqueName('Filter Go Live')});
		const migration = jira.addEvent({
			eventType: {key: 'Migration', name: 'Migration'},
			name: uniqueName('Filter Migration'),
		});
		const canceled = jira.addEvent({
			eventStatus: {key: 'Canceled', name: 'Canceled'},
			name: uniqueName('Filter Canceled'),
			plannedEventDate: new Date().toISOString(),
		});

		await signIn('PROJECT_ADMIN');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, LIST_PATH);

		for (const {name} of [goLive, migration, canceled]) {
			await expect(eventRow(page, name)).toBeVisible();
		}

		const search = page.getByPlaceholder('Search Event Name');

		await search.fill(migration.name);
		await search.press('Enter');

		await expect(eventRow(page, migration.name)).toBeVisible();
		await expect(eventRow(page, goLive.name)).toHaveCount(0);

		await page.getByRole('button', {name: 'Clear'}).click();

		await expect(eventRow(page, goLive.name)).toBeVisible();

		await applyFilter(page, 'Event Status', 'Canceled');

		await expect(eventRow(page, canceled.name)).toBeVisible();
		await expect(eventRow(page, goLive.name)).toHaveCount(0);

		await page.getByRole('button', {name: 'Clear All Filters'}).click();

		await applyFilter(page, 'Event Type', 'Migration');

		await expect(eventRow(page, migration.name)).toBeVisible();
		await expect(eventRow(page, goLive.name)).toHaveCount(0);

		await page.getByRole('button', {name: 'Clear All Filters'}).click();

		await expect(eventRow(page, goLive.name)).toBeVisible();
	});
});

test.describe('[FLOW-BUSINESS-EVENT-LIFECYCLE] business event permissions', () => {
	for (const persona of [
		'ACCOUNT_ADMIN',
		'PROJECT_ADMIN',
		'PROJECT_REQUESTER',
	] as const) {
		test(`[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] ${persona} can create and manage events`, async ({
			page,
			signIn,
			springBoot,
		}) => {
			test.skip(
				!springBoot.enabled,
				'Asserts on a Jira event that only the stub can seed'
			);

			const jira = new FakeJira(springBoot);

			await jira.install();

			const businessEvent = jira.addEvent({
				name: uniqueName('Permission'),
			});

			await signIn(persona);

			await selectCurrentAccount(page, ACCOUNT_ERC);

			await gotoAndExpectRender(page, LIST_PATH);

			await expect(
				page.getByRole('link', {name: 'Create Event'})
			).toBeVisible();

			await eventRow(page, businessEvent.name)
				.getByRole('button', {name: 'Manage User Options'})
				.click();

			await expect(
				page.getByRole('menuitem', {name: 'Edit Event'})
			).toBeVisible();
			await expect(
				page.getByRole('menuitem', {name: 'Cancel Event'})
			).toBeVisible();
		});
	}

	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] a project user views events but cannot create or change them', async ({
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Asserts on a Jira event that only the stub can seed'
		);

		const jira = new FakeJira(springBoot);

		await jira.install();

		const businessEvent = jira.addEvent({name: uniqueName('Read Only')});

		await signIn('PROJECT_USER');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, LIST_PATH);

		await expect(eventRow(page, businessEvent.name)).toBeVisible();
		await expect(
			page.getByRole('link', {name: 'Create Event'})
		).toHaveCount(0);

		await eventRow(page, businessEvent.name)
			.getByRole('button', {name: 'Manage User Options'})
			.click();

		await expect(
			page.getByRole('menuitem', {name: 'View Details'})
		).toBeVisible();
		await expect(
			page.getByRole('menuitem', {name: 'Edit Event'})
		).toHaveCount(0);
		await expect(
			page.getByRole('menuitem', {name: 'Cancel Event'})
		).toHaveCount(0);

		await page.keyboard.press('Escape');

		await gotoAndExpectRender(page, ADD_PATH);

		await expect(
			page.getByText(
				'Make sure the project link is correct and that you have access to this project.'
			)
		).toBeVisible();
	});

	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS] a user without a project sees the restricted message', async ({
		page,
		signIn,
	}) => {
		await signIn('NULL_ROLE');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, sitePath('/support/business-events'));

		await expect(
			page.getByRole('heading', {name: 'Business Events'})
		).toBeVisible();

		await expect(
			page.getByText(
				'Login as a user that has access to a project or contact your project administrator to add you to a project.'
			)
		).toBeVisible();

		await expect(
			page.getByRole('link', {name: 'Create Event'})
		).toHaveCount(0);
	});
});

test.describe('[FLOW-BUSINESS-EVENT-LIFECYCLE] business event error states', () => {
	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-ADD] a project whose Jira organization cannot be resolved shows the system error', async ({
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Forces the Jira object key lookup to fail, which only the stub can do'
		);

		const jira = new FakeJira(springBoot);

		jira.failObjectKey = true;

		await jira.install();

		await signIn('PROJECT_REQUESTER');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, ADD_PATH);

		await expect(
			page.getByText(/detected a system error with this project/)
		).toBeVisible();

		await expect(
			page.getByRole('button', {name: 'Create Event'})
		).toHaveCount(0);
	});

	test('[FLOW-BUSINESS-EVENT-LIFECYCLE] [ROUTE-BUSINESS-EVENTS-ID] an event Jira cannot return sends the user back to the list', async ({
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Forces the Jira event lookup to fail, which only the stub can do'
		);

		const jira = new FakeJira(springBoot);

		await jira.install();

		const businessEvent = jira.addEvent({name: uniqueName('Missing')});

		jira.failDetail = true;

		await signIn('PROJECT_ADMIN');

		await selectCurrentAccount(page, ACCOUNT_ERC);

		await gotoAndExpectRender(page, eventPath(businessEvent.id));

		await expect(
			page.getByText('An unexpected error occurred.')
		).toBeVisible();

		await expect(page).toHaveURL(/business-events$/);
		await expect(eventRow(page, businessEvent.name)).toBeVisible();
	});
});
