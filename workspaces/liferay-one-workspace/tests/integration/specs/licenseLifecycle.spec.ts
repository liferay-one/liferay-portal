/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect} from '@playwright/test';

import {apiTest as test} from '../fixtures/apiTest';
import {HeadlessPage} from '../helpers/APIHelpers';

const subscriptionERC = process.env.ONE_SUBSCRIPTION_ERC ?? 'SUBSCRIPTION-001';
const cronTriggerURL = process.env.CRON_TRIGGER_URL ?? '';

interface ILicenseKey {
	active: boolean;
	key: string;
	signature: string;
	subscriptionExternalReferenceCode: string;
}

function licenseKeysForSubscription(api: {
	get: <T>(path: string) => Promise<T>;
}): Promise<HeadlessPage<ILicenseKey>> {
	return api.get<HeadlessPage<ILicenseKey>>(
		`/o/c/licensekeys?filter=${encodeURIComponent(
			`subscriptionExternalReferenceCode eq '${subscriptionERC}'`
		)}`
	);
}

async function triggerCron(
	request: APIRequestContext,
	name: string
): Promise<void> {
	const response = await request.post(`${cronTriggerURL}/${name}`);

	expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe.fixme('[FLOW-LICENSE-GENERATION] license generation', () => {
	test('[FLOW-LICENSE-GENERATION] produces a signed license key tied to the subscription', async ({
		api,
	}) => {
		const {items} = await licenseKeysForSubscription(api);

		expect(items.length).toBeGreaterThan(0);

		for (const licenseKey of items) {
			expect(licenseKey.subscriptionExternalReferenceCode).toBe(
				subscriptionERC
			);

			expect(licenseKey.signature).toBeTruthy();
			expect(licenseKey.key).toBeTruthy();
		}
	});
});

test.describe.fixme(
	'[FLOW-LICENSE-EXPIRATION-EMAIL] expiring license key reminders',
	() => {
		test('[FLOW-LICENSE-EXPIRATION-EMAIL] [CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS] queues a reminder per subscribed user', async ({
			api,
			request,
		}) => {
			await triggerCron(request, 'scheduledSendExpiringLicenseKeyEmails');

			const page = await api.get<HeadlessPage<{type: string}>>(
				'/o/c/notificationqueueentries?pageSize=100'
			);

			expect(
				page.items.some((entry) =>
					entry.type?.includes('LICENSE-KEY-EXPIRATION')
				)
			).toBe(true);
		});
	}
);

test.describe.fixme('[FLOW-LICENSE-REVOCATION] license revocation', () => {
	test('[FLOW-LICENSE-REVOCATION] deactivates a revoked license key', async ({
		api,
	}) => {
		const {items} = await licenseKeysForSubscription(api);
		const [licenseKey] = items;

		await api.send(
			'post',
			`/o/one/v1/license-keys/${licenseKey.key}/revoke`
		);

		const {items: after} = await licenseKeysForSubscription(api);

		expect(after.find((key) => key.key === licenseKey.key)?.active).toBe(
			false
		);
	});
});
