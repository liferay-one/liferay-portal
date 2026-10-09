/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';

const cronTriggerURL = process.env.CRON_TRIGGER_URL ?? '';
const attachmentId = Number(process.env.ONE_RETENTION_ATTACHMENT_ID ?? '0');

const STATUS_IN_TRASH = 'STATUS_IN_TRASH';

interface ITicketAttachment {
	id: number;
	state: string;
}

async function triggerCron(
	request: APIRequestContext,
	name: string
): Promise<void> {
	const response = await request.post(`${cronTriggerURL}/${name}`);

	expect(response.ok(), await response.text()).toBeTruthy();
}

async function attachmentState(
	api: APIHelpers,
	id: number
): Promise<string | undefined> {
	const response = await api.send('get', `/o/c/ticketattachments/${id}`);

	if (!response.ok()) {
		return undefined;
	}

	return ((await response.json()) as ITicketAttachment).state;
}

test.describe.fixme(
	'[FLOW-TICKET-ATTACHMENT-RETENTION] attachment retention lifecycle',
	() => {
		test('[FLOW-TICKET-ATTACHMENT-RETENTION] [CRON-SCHEDULEDCLEANUP] trashes an attachment on a long-closed ticket', async ({
			api,
			request,
		}) => {
			await triggerCron(request, 'scheduledCleanUp');

			await expect
				.poll(() => attachmentState(api, attachmentId))
				.toBe(STATUS_IN_TRASH);
		});

		test('[FLOW-TICKET-ATTACHMENT-RETENTION] [CRON-SCHEDULEDDELETETICKETATTACHMENT] hard-deletes trashed attachments', async ({
			api,
			request,
		}) => {
			await triggerCron(request, 'scheduledCleanUp');
			await triggerCron(request, 'scheduledDeleteTicketAttachment');

			await expect
				.poll(() => attachmentState(api, attachmentId))
				.toBeUndefined();
		});

		test('[FLOW-TICKET-ATTACHMENT-RETENTION] is idempotent when the trash is already empty', async ({
			api,
			request,
		}) => {
			await triggerCron(request, 'scheduledDeleteTicketAttachment');

			const page = await api.get<HeadlessPage<ITicketAttachment>>(
				`/o/c/ticketattachments?filter=${encodeURIComponent(
					`state eq '${STATUS_IN_TRASH}'`
				)}`
			);

			expect(page.totalCount).toBe(0);
		});
	}
);
