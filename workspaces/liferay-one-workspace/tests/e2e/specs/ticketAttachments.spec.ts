/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import {expect, oneTest as test} from '../fixtures/oneTest';
import HeadlessAPI from '../utils/HeadlessAPI';
import {selectCurrentAccount, selectProject} from '../utils/accountUtils';
import {gotoAndExpectRender} from '../utils/customElementUtils';
import {
	ACCOUNT_ERC,
	PROJECT_ERC,
	sitePath,
	uniqueName,
} from '../utils/environmentUtils';
import {PersonaKey} from '../utils/getPersona';
import {
	FakeJira,
	FakeTicketAttachmentBackend,
} from '../utils/supportFakesUtils';

/**
 * Ticket attachments are Liferay object entries whose files live in Google
 * Cloud Storage and whose tickets live in Jira, both reached through the
 * Spring Boot client extension. The list reads the object entries directly, so
 * the specs seed real rows. The upload, download, and delete calls go to
 * `FakeTicketAttachmentBackend` and `FakeJira` locally.
 */

const ATTACHMENTS_PATH = sitePath('/support/ticket-attachments');

type SeededAttachment = {
	externalReferenceCode: string;
	fileName: string;
	id: number;
};

async function openAttachments(
	page: Page,
	adminAPI: HeadlessAPI,
	path = ''
): Promise<void> {
	const project = await adminAPI.get<{name: string}>(
		`/o/c/projects/by-external-reference-code/${PROJECT_ERC}`
	);

	await selectCurrentAccount(page, ACCOUNT_ERC);

	await gotoAndExpectRender(page, `${ATTACHMENTS_PATH}#/${path}`);

	if (!path) {
		await selectProject(page, project.name);
	}
}

async function seedAttachment(
	adminAPI: HeadlessAPI,
	cleanup: SeededAttachment[]
): Promise<SeededAttachment> {
	const fileName = `${uniqueName('attachment').replace(/\s+/g, '-')}.txt`;

	const attachment = await adminAPI.post<SeededAttachment>(
		'/o/c/ticketattachments',
		{
			accountKey: ACCOUNT_ERC,
			fileName,
			fileSize: '2048',
			gcsBucketName: 'one-e2e-fake',
			jiraIssueKey: 'LRHC-1001',
			projectKey: PROJECT_ERC,
			r_accountEntryToTicketAttachment_accountEntryERC: ACCOUNT_ERC,
			state: 0,
			storageProvider: 'gcs',
		}
	);

	cleanup.push(attachment);

	return attachment;
}

function attachmentRow(page: Page, fileName: string) {
	return page.getByRole('row').filter({hasText: fileName});
}

test.describe('[FLOW-TICKET-UPLOAD] [FLOW-TICKET-DOWNLOAD] ticket attachments', () => {
	const seeded: SeededAttachment[] = [];

	test.afterEach(async ({adminAPI}) => {
		for (const {id} of seeded.splice(0)) {
			await adminAPI.deleteIfExists(`/o/c/ticketattachments/${id}`);
		}
	});

	test('[FLOW-TICKET-DOWNLOAD] [ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID] the list shows the project attachments with a download link', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		const attachment = await seedAttachment(adminAPI, seeded);

		await signIn('ACCOUNT_ADMIN');

		await openAttachments(page, adminAPI);

		await expect(
			page.getByRole('heading', {name: 'Ticket Attachments'})
		).toBeVisible();

		const row = attachmentRow(page, attachment.fileName);

		await expect(row).toBeVisible();
		await expect(row.getByRole('link', {name: 'LRHC-1001'})).toBeVisible();
		await expect(row.getByRole('link', {name: 'Download'})).toHaveAttribute(
			'href',
			`#/id/${attachment.id}`
		);
	});

	test('[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-NEW] [ROUTE-TICKET-ATTACHMENTS-NEW-TICKETID] a requester picks a ticket and uploads a file to it', async ({
		adminAPI,
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Uploads to a stubbed storage session; a live run would attach a file to a real ticket'
		);

		const jira = new FakeJira(springBoot);
		const storage = new FakeTicketAttachmentBackend(page, springBoot);

		await jira.install();
		await storage.install();

		await signIn('PROJECT_REQUESTER');

		await openAttachments(page, adminAPI);

		await page.getByRole('button', {name: 'New Attachment'}).click();

		await expect(
			page.getByRole('heading', {name: 'New Attachment'})
		).toBeVisible();

		const continueButton = page.getByRole('button', {name: 'Continue'});

		await expect(continueButton).toBeDisabled();

		await page.locator('#newAttachmentTicket').selectOption('LRHC-1002');

		await continueButton.click();

		await expect(page).toHaveURL(/#\/new\/LRHC-1002$/);

		await expect(
			page.getByText('Attach File to Ticket #LRHC-1002')
		).toBeVisible();

		const uploadButton = page.getByRole('button', {name: 'Upload'});

		await page.locator('input[type="file"]').setInputFiles({
			buffer: Buffer.from('E2E ticket attachment body'),
			mimeType: 'text/plain',
			name: 'e2e-ticket-attachment.txt',
		});

		await page
			.getByPlaceholder(/description of the file/i)
			.fill('Uploaded by the e2e suite.');

		await expect(
			uploadButton,
			'expected the upload to wait for the personal data confirmation'
		).toBeDisabled();

		await page.getByRole('checkbox').check();

		await uploadButton.click();

		await expect(page.getByText('Upload Confirmation')).toBeVisible({
			timeout: 30000,
		});
		await expect(
			page.getByText(
				/e2e-ticket-attachment\.txt was uploaded successfully/
			)
		).toBeVisible();

		expect(storage.uploadedBytes).toEqual([
			Buffer.byteLength('E2E ticket attachment body'),
		]);

		const [initiateCall] = springBoot.callsTo(
			'POST',
			'/ticket-attachments/initiate-upload'
		);

		expect(initiateCall.body).toMatchObject({
			fileName: 'e2e-ticket-attachment.txt',
			ticketId: 'LRHC-1002',
		});

		expect(
			springBoot.callsTo('POST', /\/complete-upload$/)[0].body
		).toMatchObject({commentBody: 'Uploaded by the e2e suite.'});
	});

	for (const {errorCode, message} of [
		{
			errorCode: 'FORBIDDEN_ACCESS',
			message: 'You do not have access to upload files.',
		},
		{
			errorCode: 'INVALID_TICKET_NUMBER',
			message: 'Invalid or non-existent ticket number.',
		},
		{
			errorCode: 'TICKET_IS_CLOSED',
			message: 'This ticket has been closed',
		},
	] as const) {
		test(`[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-TICKETID] the uploader explains ${errorCode}`, async ({
			adminAPI,
			page,
			signIn,
			springBoot,
		}) => {
			test.skip(
				!springBoot.enabled,
				'Forces an upload access check error, which only the stub can do'
			);

			const storage = new FakeTicketAttachmentBackend(page, springBoot);

			storage.accessError = errorCode;

			await storage.install();

			await signIn('PROJECT_REQUESTER');

			await openAttachments(page, adminAPI, 'LRHC-1001');

			await expect(page.getByText(message)).toBeVisible();

			await expect(
				page.getByRole('button', {name: 'Upload'})
			).toHaveCount(0);
		});
	}

	test('[FLOW-TICKET-DOWNLOAD] [ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID] [ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC] an attachment downloads by ID and by external reference code', async ({
		adminAPI,
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Downloads a seeded attachment whose file exists only in the stubbed storage, not in Google Cloud Storage'
		);

		const storage = new FakeTicketAttachmentBackend(page, springBoot);

		await storage.install();

		const attachment = await seedAttachment(adminAPI, seeded);

		await signIn('ACCOUNT_ADMIN');

		await openAttachments(page, adminAPI, `id/${attachment.id}`);

		await expect(page.getByText('Download in Progress')).toBeVisible();
		await expect(
			page.getByRole('link', {name: 'Download'})
		).toHaveAttribute('href', FakeTicketAttachmentBackend.DOWNLOAD_URL);

		await gotoAndExpectRender(
			page,
			`${ATTACHMENTS_PATH}#/erc/${attachment.externalReferenceCode}`
		);

		await expect(
			page.getByRole('link', {name: 'Download'})
		).toHaveAttribute('href', FakeTicketAttachmentBackend.DOWNLOAD_URL);

		expect(
			springBoot.callsTo(
				'GET',
				`/ticket-attachments/by-external-reference-code/${attachment.externalReferenceCode}/download`
			)
		).toHaveLength(1);
	});

	test('[FLOW-TICKET-DOWNLOAD] [ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID] a user without download access is refused', async ({
		adminAPI,
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Forces a download access check error, which only the stub can do'
		);

		const storage = new FakeTicketAttachmentBackend(page, springBoot);

		storage.accessError = 'FORBIDDEN_ACCESS';

		await storage.install();

		const attachment = await seedAttachment(adminAPI, seeded);

		await signIn('PROJECT_USER');

		await openAttachments(page, adminAPI, `id/${attachment.id}`);

		await expect(
			page.getByText('You do not have access to download files.')
		).toBeVisible();
		await expect(page.getByRole('link', {name: 'Download'})).toHaveCount(0);
	});

	test('[FLOW-TICKET-DOWNLOAD] [ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID] an unknown attachment ID is reported as invalid', async ({
		adminAPI,
		page,
		signIn,
	}) => {
		await signIn('ACCOUNT_ADMIN');

		await openAttachments(page, adminAPI, 'id/999999999');

		await expect(
			page.getByText('Invalid or non-existent attachment ID.')
		).toBeVisible();
		await expect(
			page.getByText('Make sure the attachment ID is correct.')
		).toBeVisible();
	});

	test('[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-NEW] an account administrator deletes an attachment', async ({
		adminAPI,
		page,
		signIn,
		springBoot,
	}) => {
		test.skip(
			!springBoot.enabled,
			'Deletes a seeded attachment whose file exists only in the stubbed storage; a live delete would reach Google Cloud Storage'
		);

		const storage = new FakeTicketAttachmentBackend(
			page,
			springBoot,
			(id) => adminAPI.deleteIfExists(`/o/c/ticketattachments/${id}`)
		);

		await storage.install();

		const attachment = await seedAttachment(adminAPI, seeded);

		await signIn('ACCOUNT_ADMIN');

		await openAttachments(page, adminAPI);

		const row = attachmentRow(page, attachment.fileName);

		await row.getByText('Delete', {exact: true}).click();

		const dialog = page.getByRole('dialog');

		await expect(
			dialog.getByText('Are you sure you want to delete this attachment?')
		).toBeVisible();

		await dialog.getByRole('button', {name: 'Confirm'}).click();

		await expect(
			page.getByText('Attachment deleted successfully.')
		).toBeVisible();
		await expect(row).toHaveCount(0);

		expect(storage.deletedIds).toEqual([String(attachment.id)]);
	});

	for (const {canDelete, persona} of [
		{canDelete: true, persona: 'ACCOUNT_ADMIN'},
		{canDelete: false, persona: 'PROJECT_USER'},
	] as {canDelete: boolean; persona: PersonaKey}[]) {
		test(`[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-NEW] ${persona} ${canDelete ? 'can' : 'cannot'} delete an attachment someone else uploaded`, async ({
			adminAPI,
			page,
			signIn,
		}) => {
			const attachment = await seedAttachment(adminAPI, seeded);

			await signIn(persona);

			await openAttachments(page, adminAPI);

			const row = attachmentRow(page, attachment.fileName);

			await expect(
				row.getByRole('link', {name: 'Download'})
			).toBeVisible();

			await expect(row.getByText('Delete', {exact: true})).toHaveCount(
				canDelete ? 1 : 0
			);
		});
	}

	test('[FLOW-TICKET-UPLOAD] [ROUTE-TICKET-ATTACHMENTS-NEW] a user without a project sees the restricted message', async ({
		page,
		signIn,
	}) => {
		await signIn('NULL_ROLE');

		await gotoAndExpectRender(page, ATTACHMENTS_PATH);

		await expect(
			page.getByRole('heading', {name: 'Ticket Attachments'})
		).toBeVisible();
		await expect(
			page.getByText(
				'Login as a user that has access to a project or contact your project administrator to add you to a project.'
			)
		).toBeVisible();
		await expect(
			page.getByRole('button', {name: 'New Attachment'})
		).toHaveCount(0);
	});
});
