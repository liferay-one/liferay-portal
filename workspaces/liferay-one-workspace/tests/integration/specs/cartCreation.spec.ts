/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers} from '../helpers/APIHelpers';

const CHANNEL_ERC = 'LIFERAY_ONE_CHANNEL';

const buyers = [
	{email: 'admin@customer.com', roleName: 'Account Administrator'},
	{email: 'buyer@customer.com', roleName: 'Account Buyer'},
	{email: 'partneradmin@partner.com', roleName: 'Partner Account Admin'},
] as const;

type AccountBrief = {
	id: number;
	roleBriefs: {name: string}[];
};

test.describe('[AUTH-CART-CREATION] cart creation', () => {
	for (const {email, roleName} of buyers) {
		test(`[AUTH-CART-CREATION] a user with the ${roleName} role creates a cart with an order type in the account`, async ({
			request,
		}) => {
			const administrator = new APIHelpers(request, {
				basicAuth: {
					password: DEFAULT_ADMIN_PASSWORD,
					user: DEFAULT_ADMIN_EMAIL,
				},
			});

			const {id: channelId} = await administrator.get<{id: number}>(
				`/o/headless-commerce-admin-channel/v1.0/channels/by-externalReferenceCode/${CHANNEL_ERC}`
			);

			const buyer = new APIHelpers(request, {
				basicAuth: {
					password: DEFAULT_ADMIN_PASSWORD,
					user: email,
				},
			});

			const {accountBriefs} = await buyer.get<{
				accountBriefs: AccountBrief[];
			}>('/o/headless-admin-user/v1.0/my-user-account');

			const account = accountBriefs.find(({roleBriefs}) =>
				roleBriefs.some(({name}) => name === roleName)
			);

			expect(account, `${email} holds no ${roleName} role`).toBeDefined();

			const response = await buyer.send(
				'post',
				`/o/headless-commerce-delivery-cart/v1.0/channels/${channelId}/carts`,
				{
					accountId: account!.id,
					currencyCode: 'USD',
					orderTypeExternalReferenceCode: 'DXP',
				}
			);

			const text = await response.text();

			const cartId = response.ok()
				? (JSON.parse(text) as {id: number}).id
				: undefined;

			try {
				expect(response.status(), text).toBe(200);
			}
			finally {
				if (cartId) {
					await administrator.delete(
						`/o/headless-commerce-delivery-cart/v1.0/carts/${cartId}`
					);
				}
			}
		});
	}
});
