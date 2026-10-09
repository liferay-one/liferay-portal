/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {sitePath, uniqueName} from '../utils/environmentUtils';
import {deletePublisherAccountRequests} from '../utils/publisherUtils';

/**
 * A user asks to become a Marketplace publisher, and an administrator reviews
 * the request. The request is a PublisherAccountRequest object entry; every
 * test deletes the entries it created.
 */

const BECOME_A_PUBLISHER_PATH = sitePath('/marketplace/become-a-publisher');

const PUBLISHER_REQUESTS_PATH = sitePath('/admin#/publisher-requests');

async function openRequestForm(page: Page): Promise<void> {
	await gotoAndExpectRender(page, BECOME_A_PUBLISHER_PATH);

	await page.getByRole('button', {name: 'Request Account'}).click();

	await expect(
		page.getByText('Request a Marketplace Publisher Account')
	).toBeVisible();
}

async function fillRequest(
	page: Page,
	requestDescription: string
): Promise<void> {
	await openRequestForm(page);

	await page.getByPlaceholder('___–___–____').fill('5551234567');

	await page
		.getByPlaceholder(/Enter the name and a brief description/)
		.fill(requestDescription);

	await page.keyboard.press('Tab');

	await page.getByRole('button', {name: 'Continue'}).click();

	await expect(
		page.getByText('Complete Publisher Account Request')
	).toBeVisible();

	await expect(page.getByText(requestDescription)).toBeVisible();
}

async function submitRequest(
	page: Page,
	requestDescription: string
): Promise<void> {
	await fillRequest(page, requestDescription);

	await page.getByRole('button', {name: 'Request Account'}).click();
}

test.describe('[FLOW-BECOME-A-PUBLISHER] become a publisher', () => {
	test('[FLOW-BECOME-A-PUBLISHER] [ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT] presents the publisher program and opens the request form', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_MEMBER');

		await gotoAndExpectRender(page, BECOME_A_PUBLISHER_PATH);

		await expect(
			page.getByText('Becoming a Liferay Marketplace publisher')
		).toBeVisible();
		await expect(
			page.getByRole('heading', {
				name: 'Publish apps to the Liferay Marketplace',
			})
		).toBeVisible();
		await expect(
			page.getByRole('heading', {
				name: 'Monetize Your Apps and Solutions',
			})
		).toBeVisible();
		await expect(
			page.getByRole('button', {name: 'Go Back to Marketplace'})
		).toBeVisible();

		await page.getByRole('button', {name: 'Request Account'}).click();

		await expect(page).toHaveURL(/#\/request-account$/);

		await expect(page.getByPlaceholder('Enter first name')).toHaveValue(
			'Account'
		);
		await expect(page.getByPlaceholder('Enter last name')).toHaveValue(
			'Member'
		);
		await expect(page.getByPlaceholder('Enter email address')).toHaveValue(
			'accountmember@customer.com'
		);
		await expect(
			page.getByRole('checkbox', {name: 'App Publisher'})
		).toBeChecked();
	});

	test('[FLOW-BECOME-A-PUBLISHER] [ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT] holds the request until every required field is valid', async ({
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_MEMBER');

		await openRequestForm(page);

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await expect(continueButton).toBeDisabled();

		await page.getByPlaceholder('___–___–____').fill('5551234567');
		await page
			.getByPlaceholder(/Enter the name and a brief description/)
			.fill('A request description');
		await page.keyboard.press('Tab');

		await expect(continueButton).toBeEnabled();

		const emailInput = page.getByPlaceholder('Enter email address');

		await emailInput.fill('not-an-email');
		await emailInput.blur();

		await expect(page.getByText(/valid email/i)).toBeVisible();
		await expect(continueButton).toBeDisabled();

		await emailInput.fill('accountmember@customer.com');
		await emailInput.blur();

		await expect(continueButton).toBeEnabled();

		const firstNameInput = page.getByPlaceholder('Enter first name');

		await firstNameInput.fill('');
		await firstNameInput.blur();

		await expect(page.getByText('This field is required.')).toBeVisible();
		await expect(continueButton).toBeDisabled();

		await firstNameInput.fill('Account');
		await firstNameInput.blur();

		await expect(continueButton).toBeEnabled();

		await page.getByRole('checkbox', {name: 'App Publisher'}).uncheck();
		await page.keyboard.press('Tab');

		await expect(continueButton).toBeDisabled();

		await page.getByRole('checkbox', {name: 'Solution Publisher'}).check();
		await page.keyboard.press('Tab');

		await expect(continueButton).toBeEnabled();
	});

	test('[FLOW-BECOME-A-PUBLISHER] [ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT] a signed in customer submits a publisher request', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		test.slow();

		const requestDescription = uniqueName('Publisher request');

		try {
			await signIn('ACCOUNT_MEMBER');

			await fillRequest(page, requestDescription);

			test.info().annotations.push({
				description:
					'POST /o/c/publisheraccountrequests returns 403 for a non administrator: resource-permissions.json grants ADD_OBJECT_ENTRY on PublisherAccountRequest to no role, so the request page shows "An unexpected error occurred." to every real applicant.',
				type: 'issue',
			});

			test.fail();

			await page.getByRole('button', {name: 'Request Account'}).click();

			await expect(
				page.getByText('Thank you for your Publisher Account Request')
			).toBeVisible();
		}
		finally {
			await deletePublisherAccountRequests(adminAPI, requestDescription);
		}
	});

	test.describe('reviewed by an administrator', () => {
		for (const {decision, status} of [
			{decision: 'Approve', status: 'Completed'},
			{decision: 'Decline', status: 'Rejected'},
		]) {
			test(`[FLOW-BECOME-A-PUBLISHER] [FLOW-ADMIN-PUBLISHER-REQUESTS] [ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT] [ROUTE-ADMIN-PUBLISHER-REQUESTS] a submitted request is reviewed with ${decision}`, async ({
				adminAPI,
				page,
				signIn,
			}) => {
				const requestDescription = uniqueName('Publisher request');

				try {
					await signIn('ADMINISTRATOR');

					await submitRequest(page, requestDescription);

					await expect(
						page.getByText(
							'Thank you for your Publisher Account Request'
						)
					).toBeVisible();

					await gotoAndExpectRender(page, PUBLISHER_REQUESTS_PATH);

					const row = page
						.getByRole('row')
						.filter({hasText: requestDescription});

					await expect(row).toContainText('Open');

					await row.getByText(requestDescription).click();

					const dialog = page
						.getByRole('dialog')
						.filter({hasText: 'Review Request'});

					await expect(dialog).toContainText('Review Request - Open');
					await expect(dialog).toContainText(requestDescription);

					await dialog.getByRole('button', {name: decision}).click();

					await expect(
						page.getByText('Your request completed successfully')
					).toBeVisible();

					await expect(row).toContainText(status);

					await row.getByText(requestDescription).click();

					await expect(dialog).toContainText(
						`Review Request - ${status}`
					);
					await expect(
						dialog.getByRole('button', {name: 'Approve'})
					).toHaveCount(0);
					await expect(
						dialog.getByRole('button', {name: 'Decline'})
					).toHaveCount(0);
				}
				finally {
					await deletePublisherAccountRequests(
						adminAPI,
						requestDescription
					);
				}
			});
		}
	});
});
