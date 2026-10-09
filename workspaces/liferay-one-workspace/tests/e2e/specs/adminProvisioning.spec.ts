/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, oneTest as test} from '../fixtures/oneTest';
import SpringBootStub from '../utils/SpringBootStub';
import {adminApp, gotoAdmin, rowWithText, toast} from '../utils/adminUtils';

/**
 * The provisioning tools of the admin dashboard, run as the Provisioning
 * Administrator persona.
 *
 * Pub/Sub dispatches a message straight into a Salesforce or Okta subscriber
 * on the Spring Boot client extension, which writes to Liferay and to the
 * external system behind it. Every test that submits a message therefore runs
 * only against the stub, which records what the page sent; nothing here ever
 * dispatches for real.
 *
 * Activation key uploads store a parsed license file. A local environment has
 * no license file the signer accepts, so the upload, download, and delete
 * journey runs against a stub that keeps the uploaded keys in memory and
 * answers a duplicate the way the real controller does: a 409 ProblemDetail.
 */

const COMMON_LICENSE_KEYS_PATH = '/common-license-keys';

const NO_EXTERNAL_DISPATCH =
	'Submitting dispatches a message to a live subscriber; this journey runs ' +
	'only against the Spring Boot stub.';

type CommonLicenseKey = {
	endDate: string;
	id: number;
	name: string;
	productEnvironment: string;
	productGroup: string;
	startDate: string;
};

async function stubCommonLicenseKeys(springBoot: SpringBootStub) {
	const commonLicenseKeys: CommonLicenseKey[] = [];

	let nextId = 1;

	await springBoot.on('GET', COMMON_LICENSE_KEYS_PATH, ({url}) => {
		const items = commonLicenseKeys.filter(
			({productGroup}) =>
				productGroup === url.searchParams.get('productGroup')
		);

		return {
			body: {
				items,
				lastPage: 1,
				page: 1,
				pageSize: 20,
				totalCount: items.length,
			},
			contentType: 'application/json',
		};
	});

	await springBoot.on('POST', COMMON_LICENSE_KEYS_PATH, ({body}) => {
		const multipart = String(body);

		const fileName = /filename="([^"]+)"/.exec(multipart)?.[1] ?? '';
		const productGroup =
			/name="productGroup"\r?\n\r?\n([A-Z_]+)/.exec(multipart)?.[1] ?? '';

		if (commonLicenseKeys.some(({name}) => name === fileName)) {
			return {
				body: {
					detail: `A common license key already exists for the file ${fileName}`,
					instance: COMMON_LICENSE_KEYS_PATH,
					status: 409,
					title: 'Conflict',
					type: 'about:blank',
				},
				contentType: 'application/problem+json',
				status: 409,
			};
		}

		commonLicenseKeys.push({
			endDate: '2027-12-31T00:00:00Z',
			id: nextId++,
			name: fileName,
			productEnvironment: 'production',
			productGroup,
			startDate: '2026-01-01T00:00:00Z',
		});

		return {status: 200};
	});

	await springBoot.on(
		'GET',
		`${COMMON_LICENSE_KEYS_PATH}/:id/download`,
		({params}) => {
			const commonLicenseKey = commonLicenseKeys.find(
				({id}) => id === Number(params.id)
			);

			return {
				body: '<license><product>Commerce</product></license>',
				contentType: 'application/xml',
				headers: {
					'Content-Disposition': `attachment; filename="${commonLicenseKey?.name}"`,
				},
			};
		}
	);

	await springBoot.on(
		'DELETE',
		`${COMMON_LICENSE_KEYS_PATH}/:id`,
		({params}) => {
			const index = commonLicenseKeys.findIndex(
				({id}) => id === Number(params.id)
			);

			if (index !== -1) {
				commonLicenseKeys.splice(index, 1);
			}

			return {status: 200};
		}
	);
}

function licenseFile(name: string) {
	return {
		buffer: Buffer.from(
			'<?xml version="1.0"?><license><product>Commerce</product></license>'
		),
		mimeType: 'text/xml',
		name,
	};
}

/**
 * A page with a Spring Boot stub loads without the HTTP cache (Playwright
 * disables it while a route is registered), so under parallel load its first
 * render can need the one reload gotoAdmin allows. The longer timeout leaves
 * room for that reload.
 */

test.describe.configure({timeout: 240 * 1000});

test.beforeEach(async ({signIn}) => {
	await signIn('PROVISIONING_ADMIN');
});

test.describe('[FLOW-ADMIN-PROVISIONING-TOOLS] Pub/Sub', () => {
	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-PUB-SUB] renders the dispatch form', async ({
		page,
	}) => {
		await gotoAdmin(page, 'pub-sub', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Submit'})
		);

		const app = adminApp(page);

		await expect(app.getByLabel('Topic')).toBeVisible();
		await expect(app.getByLabel('Payload')).toBeVisible();
		await expect(app.getByLabel('Attributes')).toBeVisible();

		await expect(app.getByRole('button', {name: 'Submit'})).toBeVisible();
	});

	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-PUB-SUB] lists the subscribers, generates a sample, and dispatches it', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, NO_EXTERNAL_DISPATCH);

		await springBoot.on('GET', '/admin/pubsub/subscribers', {
			body: [
				{
					name: 'OktaAppCreatedPubsubSubscriber',
					topic: 'okta-app-created',
				},
				{
					name: 'SalesforceOpportunityPubsubSubscriber',
					topic: 'one-liferay-opp-entries',
				},
			],
		});

		await springBoot.on('POST', '/admin/pubsub/dispatch', {status: 200});

		await gotoAdmin(page, 'pub-sub', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Submit'})
		);

		const app = adminApp(page);

		await expect(app.getByRole('heading', {name: 'Topics'})).toBeVisible();

		await expect(
			app
				.getByRole('row')
				.filter({hasText: 'OktaAppCreatedPubsubSubscriber'})
		).toContainText('okta-app-created');

		await expect(app.getByLabel('Topic')).toHaveValue('okta-app-created');

		await app.getByRole('button', {name: 'Generate Sample'}).click();

		await expect(app.getByLabel('Payload')).toHaveValue(/accountKey/);

		await app.getByRole('button', {name: 'Submit'}).click();

		await expect(toast(page, 'Success')).toBeVisible();

		const [dispatch] = springBoot.callsTo('POST', '/admin/pubsub/dispatch');

		const {payload, topic} = dispatch.body as {
			payload: string;
			topic: string;
		};

		expect(topic).toBe('okta-app-created');
		expect(JSON.parse(payload)).toHaveProperty('appId');
	});

	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-PUB-SUB] picks a sample for the selected topic and reports a failed dispatch', async ({
		page,
		springBoot,
	}) => {
		test.skip(!springBoot.enabled, NO_EXTERNAL_DISPATCH);

		const failure =
			'Unable to dispatch message to Pubsub subscriber ' +
			'SalesforceOpportunityPubsubSubscriber';

		await springBoot.on('GET', '/admin/pubsub/subscribers', {
			body: [
				{
					name: 'OktaAppCreatedPubsubSubscriber',
					topic: 'okta-app-created',
				},
				{
					name: 'SalesforceOpportunityPubsubSubscriber',
					topic: 'one-liferay-opp-entries',
				},
			],
		});

		await springBoot.on('POST', '/admin/pubsub/dispatch', {
			body: {
				detail: failure,
				status: 502,
				title: 'Bad Gateway',
				type: 'about:blank',
			},
			contentType: 'application/problem+json',
			status: 502,
		});

		await gotoAdmin(page, 'pub-sub', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Submit'})
		);

		const app = adminApp(page);

		await app.getByLabel('Topic').selectOption('one-liferay-opp-entries');

		await app.getByRole('button', {name: 'Generate Sample'}).click();

		await page
			.getByRole('menuitem', {name: 'Renewal, Closed Lost'})
			.click();

		await expect(app.getByLabel('Payload')).toHaveValue(/Closed Lost/);

		await app.getByRole('button', {name: 'Submit'}).click();

		await expect(toast(page, failure)).toBeVisible();

		const [dispatch] = springBoot.callsTo('POST', '/admin/pubsub/dispatch');

		expect((dispatch.body as {topic: string}).topic).toBe(
			'one-liferay-opp-entries'
		);
	});
});

test.describe('[FLOW-ADMIN-PROVISIONING-TOOLS] activation key uploads', () => {
	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS] switches between the Commerce and Elasticsearch key types', async ({
		page,
	}) => {
		await gotoAdmin(page, 'activation-key-uploads', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Upload'})
		);

		const app = adminApp(page);

		const fileInput = app.locator('input[type="file"]');

		await expect(app.getByRole('tab', {name: 'Commerce'})).toHaveAttribute(
			'aria-selected',
			'true'
		);

		await expect(fileInput).toHaveAttribute('accept', '.xml');

		await expect(app.getByRole('button', {name: 'Upload'})).toBeDisabled();

		for (const column of [
			'Name',
			'Product Environment',
			'Start Date',
			'End Date',
		]) {
			await expect(
				app
					.getByRole('columnheader', {name: column})
					.or(
						app
							.locator('table thead')
							.getByText(column, {exact: true})
					)
			).toBeVisible();
		}

		await app.getByRole('tab', {name: 'Elasticsearch'}).click();

		await expect(page).toHaveURL(/tab=elasticsearch/);

		await expect(fileInput).toHaveAttribute('accept', '.json');
	});

	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS] uploads, downloads, and deletes a Commerce activation key', async ({
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'A live upload needs a license file the signer accepts.'
		);

		await stubCommonLicenseKeys(springBoot);

		await gotoAdmin(page, 'activation-key-uploads', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Upload'})
		);

		const app = adminApp(page);

		const fileName = `e2e-commerce-${Date.now()}.xml`;

		await app
			.locator('input[type="file"]')
			.setInputFiles(licenseFile(fileName));

		await app.getByRole('button', {name: 'Upload'}).click();

		await expect(
			toast(page, 'Activation keys uploaded successfully.')
		).toBeVisible();

		const row = rowWithText(page, fileName);

		await expect(row).toContainText('production');

		const [upload] = springBoot.callsTo('POST', COMMON_LICENSE_KEYS_PATH);

		expect(String(upload.body)).toContain('COMMERCE');

		const downloadPromise = page.waitForEvent('download');

		await row.getByRole('button', {name: 'Actions'}).click();
		await page.getByRole('menuitem', {name: 'Download'}).click();

		expect((await downloadPromise).suggestedFilename()).toBe(fileName);

		await row.getByRole('button', {name: 'Actions'}).click();
		await page.getByRole('menuitem', {name: 'Delete'}).click();

		const dialog = page.getByRole('dialog');

		await expect(
			dialog.getByText(
				'Are you sure you want to delete this common activation key?'
			)
		).toBeVisible();

		await dialog.getByRole('button', {name: 'Delete'}).click();

		await expect(
			toast(page, 'Activation key deleted successfully.')
		).toBeVisible();

		await expect(row).toHaveCount(0);
	});

	test('[FLOW-ADMIN-PROVISIONING-TOOLS] [ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS] explains that a file was already uploaded', async ({
		page,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'A live upload needs a license file the signer accepts.'
		);

		await stubCommonLicenseKeys(springBoot);

		await gotoAdmin(page, 'activation-key-uploads', undefined, (page) =>
			adminApp(page).getByRole('button', {name: 'Upload'})
		);

		const app = adminApp(page);

		const fileName = `e2e-duplicate-${Date.now()}.xml`;

		const upload = async () => {
			await app
				.locator('input[type="file"]')
				.setInputFiles(licenseFile(fileName));

			await app.getByRole('button', {name: 'Upload'}).click();

			await expect(
				app.getByRole('button', {name: 'Upload'})
			).toBeVisible();
		};

		await upload();

		await expect(rowWithText(page, fileName)).toBeVisible();

		await upload();

		test.info().annotations.push({
			description:
				'The Spring Boot controller answers a duplicate with the ' +
				'ProblemDetail of a ResponseStatusException (title Conflict, ' +
				'detail "A common license key already exists for the file ' +
				'..."), but the page only recognizes a type or title that ' +
				'contains DuplicateCommonLicenseKey, so it shows "Conflict".',
			type: 'issue',
		});

		test.fail();

		await expect(
			app.getByText('The file has already been uploaded.')
		).toBeVisible();
	});
});
