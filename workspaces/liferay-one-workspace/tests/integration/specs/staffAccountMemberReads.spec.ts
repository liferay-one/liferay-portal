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

const CUSTOMER_ACCOUNT_NAME = 'Omni Test Account';

const CUSTOMER_EMAIL = 'buyer@customer.com';

const STAFF_ACCOUNT_NAME = 'Liferay, Inc.';

const staffRoleNames = ['Finance Administrator', 'Liferay Staff'] as const;

type Account = {
	id: number;
	name: string;
};

type Role = {
	id: number;
	name: string;
};

type UserAccount = {
	emailAddress: string;
	id: number;
};

test.describe('[AUTH-STAFF-ACCOUNT-MEMBER-READS] staff account member reads', () => {
	for (const roleName of staffRoleNames) {
		test(`[AUTH-STAFF-ACCOUNT-MEMBER-READS] ${roleName} reads every member of an account it does not belong to`, async ({
			request,
		}) => {
			const administrator = new APIHelpers(request, {
				basicAuth: {
					password: DEFAULT_ADMIN_PASSWORD,
					user: DEFAULT_ADMIN_EMAIL,
				},
			});

			const {items: accounts} = await administrator.get<
				HeadlessPage<Account>
			>(
				'/o/headless-admin-user/v1.0/accounts?fields=id,name&pageSize=-1'
			);

			const accountIdsByName = new Map(
				accounts.map(({id, name}) => [name, id])
			);

			const customerAccountId = accountIdsByName.get(
				CUSTOMER_ACCOUNT_NAME
			);
			const staffAccountId = accountIdsByName.get(STAFF_ACCOUNT_NAME);

			expect(customerAccountId).toBeDefined();
			expect(staffAccountId).toBeDefined();

			const {items: roles} = await administrator.get<HeadlessPage<Role>>(
				'/o/headless-admin-user/v1.0/roles?fields=id,name&pageSize=-1'
			);

			const role = roles.find(({name}) => name === roleName);

			expect(role).toBeDefined();

			const emailAddress = `staff-${Date.now()}@liferay.com`;

			const userAccount = await administrator.post<UserAccount>(
				'/o/headless-admin-user/v1.0/user-accounts',
				{
					alternateName: `staff-${Date.now()}`,
					emailAddress,
					familyName: 'Staff',
					givenName: 'Test',
					password: DEFAULT_ADMIN_PASSWORD,
				}
			);

			try {
				await administrator.post(
					`/o/headless-admin-user/v1.0/accounts/${staffAccountId}/user-accounts/by-email-address/${emailAddress}`,
					{}
				);

				const roleAssociationResponse = await administrator.send(
					'post',
					`/o/headless-admin-user/v1.0/roles/${role?.id}/association/user-account/${userAccount.id}`
				);

				expect(roleAssociationResponse.ok()).toBeTruthy();

				const staff = new APIHelpers(request, {
					basicAuth: {
						password: DEFAULT_ADMIN_PASSWORD,
						user: emailAddress,
					},
				});

				const {items: members} = await staff.get<
					HeadlessPage<UserAccount>
				>(
					`/o/headless-admin-user/v1.0/accounts/${customerAccountId}/user-accounts?fields=emailAddress&pageSize=-1`
				);

				expect(members.map((member) => member.emailAddress)).toContain(
					CUSTOMER_EMAIL
				);
			}
			finally {
				await administrator.delete(
					`/o/headless-admin-user/v1.0/user-accounts/${userAccount.id}`
				);
			}
		});
	}
});
