/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';

const ACCOUNT_BUYER_EMAIL = 'buyer@customer.com';

const restrictedObjects = [
	{
		accountField: 'r_accountEntryToEnvironment_accountEntryId',
		path: '/o/c/environments',
	},
	{
		accountField: 'r_accountEntryToUsageEvent_accountEntryId',
		path: '/o/c/usageevents',
	},
] as const;

test.describe('[AUTH-ACCOUNT-RESTRICTED-READS] account restricted reads', () => {
	for (const {accountField, path} of restrictedObjects) {
		test(`[AUTH-ACCOUNT-RESTRICTED-READS] ${path} returns only the entries of the user's own accounts`, async ({
			request,
		}) => {
			const buyer = new APIHelpers(request, {
				basicAuth: {
					password: DEFAULT_ADMIN_PASSWORD,
					user: ACCOUNT_BUYER_EMAIL,
				},
			});

			const {accountBriefs} = await buyer.get<{
				accountBriefs: {id: number}[];
			}>('/o/headless-admin-user/v1.0/my-user-account');

			const accountIds = accountBriefs.map(({id}) => id);

			const {items, totalCount} = await buyer.get<
				HeadlessPage<Record<string, number>>
			>(`${path}?fields=id,${accountField}&pageSize=200`);

			expect(totalCount).toBeGreaterThan(0);

			for (const item of items) {
				expect(accountIds).toContain(item[accountField]);
			}

			const administrator = new APIHelpers(request, {
				basicAuth: {
					password: DEFAULT_ADMIN_PASSWORD,
					user: DEFAULT_ADMIN_EMAIL,
				},
			});

			const everyEntry = await administrator.get<HeadlessPage<unknown>>(
				`${path}?fields=id&pageSize=1`
			);

			expect(everyEntry.totalCount).toBeGreaterThan(totalCount);
		});
	}
});
