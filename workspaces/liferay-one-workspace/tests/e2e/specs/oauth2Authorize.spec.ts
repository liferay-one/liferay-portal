/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import {HeadlessPage} from '../utils/HeadlessAPI';
import SpringBootStub from '../utils/SpringBootStub';
import {sitePath} from '../utils/environmentUtils';
import {liferayLogin} from '../utils/loginUtils';
import {
	TemporaryBuyer,
	createTemporaryBuyer,
	deleteTemporaryBuyer,
} from '../utils/productPurchaseUtils';
import {PORTAL_TIMEOUT} from '../utils/timeoutConstants';

/**
 * Connecting a Liferay DXP to Liferay One (`/web/one/authorize`). The DXP
 * opens the page in a popup with an authorization `code` and a `state` that
 * names its origin; the user picks an account, a cloud project, and an
 * environment, and the page hands the code and the chosen settings back to
 * the DXP with `window.opener.postMessage`.
 *
 * Project Selection reads the user's cloud projects from Liferay Cloud
 * Console through `GET /console/projects-usage` on the Spring Boot client
 * extension, which is stubbed here. The popup's opener is replaced with a
 * recorder so the handoff can be asserted.
 *
 * The full journey runs as a temporary buyer whose single business account
 * has a default billing address, which is the account the page preselects.
 */

const DXP_ORIGIN = 'https://dxp.e2e.example.com';

const AUTHORIZATION_CODE = 'e2e-authorization-code';

const CONNECTABLE_PROJECT = {
	environments: [
		{isExtensionEnvironment: false, projectId: 'e2econnect-prd'},
		{isExtensionEnvironment: true, projectId: 'e2econnect-extuat'},
	],
	rootProjectId: 'e2econnect',
	rootProjectPlanUsage: {
		cpu: {free: 6, limit: 8, used: 2},
		instance: {free: 3, limit: 4, used: 1},
		memory: {free: 12, limit: 16, used: 4},
	},
};

const UNCONNECTABLE_PROJECT = {
	environments: [{isExtensionEnvironment: false, projectId: 'e2elegacy-prd'}],
	rootProjectId: 'e2elegacy',
	rootProjectPlanUsage: {
		cpu: {free: 2, limit: 2, used: 0},
		instance: {free: 1, limit: 1, used: 0},
		memory: {free: 4, limit: 4, used: 0},
	},
};

const ACCOUNT_FILTER_ISSUE =
	'Account Selection loads the accounts with GET /o/headless-admin-user/' +
	'v1.0/accounts?filter=id in (...), and the endpoint rejects the filter ' +
	'with 400 "A property used in the filter criteria is not supported: id ' +
	'in (...)", so the page renders Something went wrong. for every user and ' +
	'no DXP can be connected.';

type HandoffMessage = {
	data: {
		code: string;
		serviceURL: string;
		settings: {
			account: {id: number; name: string};
			channelId: number;
			cloudProject?: string;
		};
	};
	targetOrigin: string;
};

function authorizePath({
	code = AUTHORIZATION_CODE,
	origin = DXP_ORIGIN,
}: {code?: string; origin?: string} = {}): string {
	const searchParams = new URLSearchParams();

	if (code) {
		searchParams.set('code', code);
	}

	if (origin) {
		searchParams.set('state', JSON.stringify({origin}));
	}

	return sitePath(`/authorize?${searchParams}`);
}

function expectAccountFilterIssue() {
	test.fail(true, ACCOUNT_FILTER_ISSUE);

	test.info().annotations.push({
		description: ACCOUNT_FILTER_ISSUE,
		type: 'issue',
	});
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', {name});
}

/**
 * Replaces the popup's opener with a recorder before the page loads, so the
 * message the page posts back to the DXP lands where the test can read it.
 */

async function recordOpenerMessages(page: Page) {
	await page.addInitScript(() => {
		const messages: unknown[] = [];

		Object.defineProperty(window, '__e2eOpenerMessages', {
			value: messages,
		});

		Object.defineProperty(window, 'opener', {
			configurable: true,
			value: {
				postMessage: (data: unknown, targetOrigin: string) => {
					messages.push({data, targetOrigin});
				},
			},
		});
	});
}

async function readOpenerMessages(page: Page): Promise<HandoffMessage[]> {
	return page.evaluate(
		() =>
			(window as unknown as {__e2eOpenerMessages: HandoffMessage[]})
				.__e2eOpenerMessages
	);
}

async function stubProjectsUsage(
	springBoot: SpringBootStub,
	userProjects: unknown[]
) {
	await springBoot.on('GET', '/console/projects-usage', {
		body: {userEmail: 'e2e@example.com', userProjects},
		contentType: 'application/json',
	});
}

test.describe('[FLOW-OAUTH2-DXP-CONNECT] connecting a DXP to Liferay One', () => {
	test('[FLOW-OAUTH2-DXP-CONNECT] a request without an authorization code is refused', async ({
		page,
		signIn,
		springBoot,
	}) => {
		await stubProjectsUsage(springBoot, []);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(authorizePath({code: ''}));

		await expect(heading(page, 'Something went wrong.')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(
			page.getByText('An unexpected error occurred.')
		).toBeVisible();

		await expect(page.getByRole('button', {name: 'Continue'})).toHaveCount(
			0
		);
	});

	test('[FLOW-OAUTH2-DXP-CONNECT] a state whose origin carries a path is refused and names no DXP', async ({
		page,
		signIn,
		springBoot,
	}) => {
		await stubProjectsUsage(springBoot, []);

		await signIn('ACCOUNT_ADMIN');

		await page.goto(authorizePath({origin: `${DXP_ORIGIN}/c/portal`}));

		await expect(heading(page, 'Something went wrong.')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(
			page.getByText(
				'This Liferay DXP is requesting access to your Liferay One account.'
			)
		).toHaveCount(0);
	});

	test('[FLOW-OAUTH2-DXP-CONNECT] Account Selection names the requesting DXP and blocks a business account without a billing address', async ({
		page,
		signIn,
		springBoot,
	}) => {
		await stubProjectsUsage(springBoot, [CONNECTABLE_PROJECT]);

		await signIn('ACCOUNT_ADMIN');

		expectAccountFilterIssue();

		await page.goto(authorizePath());

		await expect(heading(page, 'Account Selection')).toBeVisible({
			timeout: PORTAL_TIMEOUT,
		});

		await expect(page.getByText(DXP_ORIGIN, {exact: true})).toBeVisible();

		await expect(
			page.getByText(
				'This Liferay DXP is requesting access to your Liferay One account.'
			)
		).toBeVisible();

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await expect(continueButton).toBeDisabled();

		const accountCard = page
			.locator('.radio-card', {hasText: 'Omni Test Account'})
			.first();

		await expect(accountCard).toBeVisible({timeout: PORTAL_TIMEOUT});

		await accountCard.click();

		await expect(accountCard).toHaveClass(/radio-selected/);

		await expect(
			page.getByText(
				'This account has no default billing address, so a connected DXP cannot install products for it.'
			)
		).toBeVisible();

		await expect(continueButton).toBeDisabled();
	});

	test.describe('with a connectable account', () => {
		let buyer: TemporaryBuyer | undefined;

		test.afterEach(async ({adminAPI}) => {
			await deleteTemporaryBuyer(adminAPI, buyer);

			buyer = undefined;
		});

		test('[FLOW-OAUTH2-DXP-CONNECT] [ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION] [ROUTE-OAUTH2-AUTHORIZE-ENVIRONMENT-SELECTION] [ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS] hands the code, account, and environment back to the DXP', async ({
			adminAPI,
			page,
			springBoot,
		}) => {
			test.skip(
				!springBoot.enabled,
				'Project Selection asserts the stubbed Liferay Cloud Console projects'
			);

			await stubProjectsUsage(springBoot, [
				CONNECTABLE_PROJECT,
				UNCONNECTABLE_PROJECT,
			]);

			buyer = await createTemporaryBuyer(adminAPI, {
				billingAddress: true,
				label: 'DXP Connect',
			});

			await recordOpenerMessages(page);

			await liferayLogin(page, buyer.email, buyer.password);

			expectAccountFilterIssue();

			await page.goto(authorizePath());

			await expect(heading(page, 'Account Selection')).toBeVisible({
				timeout: PORTAL_TIMEOUT,
			});

			await expect(
				page.locator('.radio-card.radio-selected', {
					hasText: buyer.account.name,
				})
			).toBeVisible();

			const continueButton = page.getByRole('button', {name: 'Continue'});

			await expect(continueButton).toBeEnabled({timeout: PORTAL_TIMEOUT});

			await continueButton.click();

			await expect(heading(page, 'Project Selection')).toBeVisible();

			const unconnectableCard = page.locator('.radio-card', {
				hasText: 'E2ELEGACY',
			});

			await expect(unconnectableCard).toHaveClass(/radio-disabled/);

			await expect(
				unconnectableCard.getByText(
					'This project has no extension environments.'
				)
			).toBeVisible();

			await expect(continueButton).toBeDisabled();

			await unconnectableCard.click();

			await expect(continueButton).toBeDisabled();

			await page.locator('.radio-card', {hasText: 'E2ECONNECT'}).click();

			await expect(continueButton).toBeEnabled();

			await continueButton.click();

			await expect(heading(page, 'Environment Selection')).toBeVisible();

			const connectButton = page.getByRole('button', {
				exact: true,
				name: 'Connect',
			});

			await expect(connectButton).toBeDisabled();

			await page.locator('.radio-card', {hasText: 'extuat'}).click();

			await expect(connectButton).toBeEnabled();

			await connectButton.click();

			await expect(
				heading(page, 'DO NOT CLOSE THIS WINDOW')
			).toBeVisible();

			await expect
				.poll(async () => (await readOpenerMessages(page)).length, {
					message: 'expected the page to post the handoff to the DXP',
					timeout: 15000,
				})
				.toBe(1);

			const [message] = await readOpenerMessages(page);

			expect(message.targetOrigin).toBe(DXP_ORIGIN);
			expect(message.data.code).toBe(AUTHORIZATION_CODE);
			expect(message.data.serviceURL).toBeTruthy();
			expect(message.data.settings.account.id).toBe(buyer.account.id);
			expect(message.data.settings.cloudProject).toBe(
				'e2econnect-extuat'
			);

			const {items} = await adminAPI.get<
				HeadlessPage<{connectionSource: string}>
			>(
				`/o/c/oauth2dxpauthorizations?filter=${encodeURIComponent(
					`r_accountEntryToOAuth2DxpAuthorization_accountEntryId eq '${buyer.account.id}'`
				)}`
			);

			expect(
				items.map(({connectionSource}) => connectionSource),
				'expected the connection to be recorded on the account'
			).toEqual([DXP_ORIGIN]);
		});

		test('[FLOW-OAUTH2-DXP-CONNECT] [ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION] [ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS] a user without a connectable cloud project can connect anyway', async ({
			adminAPI,
			page,
			springBoot,
		}) => {
			test.skip(
				!springBoot.enabled,
				'Asserts the stubbed Liferay Cloud Console projects'
			);

			await stubProjectsUsage(springBoot, [UNCONNECTABLE_PROJECT]);

			buyer = await createTemporaryBuyer(adminAPI, {
				billingAddress: true,
				label: 'DXP Connect Anyway',
			});

			await recordOpenerMessages(page);

			await liferayLogin(page, buyer.email, buyer.password);

			expectAccountFilterIssue();

			await page.goto(authorizePath());

			await expect(
				page.getByRole('button', {name: 'Continue'}),
				'expected the account with a billing address to be preselected'
			).toBeEnabled({timeout: PORTAL_TIMEOUT});

			await page.getByRole('button', {name: 'Continue'}).click();

			await expect(heading(page, 'Project Selection')).toBeVisible({
				timeout: PORTAL_TIMEOUT,
			});

			await expect(
				page.getByText('No Cloud Projects Available')
			).toBeVisible();

			await page.getByRole('button', {name: 'Connect Anyway'}).click();

			await expect(
				heading(page, 'DO NOT CLOSE THIS WINDOW')
			).toBeVisible();

			await expect
				.poll(async () => (await readOpenerMessages(page)).length, {
					timeout: 15000,
				})
				.toBe(1);

			const [message] = await readOpenerMessages(page);

			expect(message.data.settings.account.id).toBe(buyer.account.id);
			expect(message.data.settings.cloudProject).toBeUndefined();
		});

		test('[FLOW-OAUTH2-DXP-CONNECT] [ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION] a Liferay Cloud Console failure stops the connection at Project Selection', async ({
			adminAPI,
			page,
			springBoot,
		}) => {
			test.skip(
				!springBoot.enabled,
				'Forces a Liferay Cloud Console failure through the stub'
			);

			await springBoot.on('GET', '/console/projects-usage', {
				body: {
					status: 'INTERNAL_SERVER_ERROR',
					title: 'Console is down',
				},
				contentType: 'application/json',
				status: 500,
			});

			buyer = await createTemporaryBuyer(adminAPI, {
				billingAddress: true,
				label: 'DXP Console Down',
			});

			await liferayLogin(page, buyer.email, buyer.password);

			expectAccountFilterIssue();

			await page.goto(authorizePath());

			await expect(
				page.getByRole('button', {name: 'Continue'}),
				'expected the account with a billing address to be preselected'
			).toBeEnabled({timeout: PORTAL_TIMEOUT});

			await page.getByRole('button', {name: 'Continue'}).click();

			await expect(heading(page, 'Project Selection')).toBeVisible({
				timeout: PORTAL_TIMEOUT,
			});

			await expect(
				page.getByText('An unexpected error occurred. Try again later.')
			).toBeVisible();

			await expect(
				page.getByRole('button', {name: 'Continue'})
			).toBeDisabled();

			await expect(
				page.getByRole('button', {name: 'Connect Anyway'})
			).toHaveCount(0);
		});
	});
});
