/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {z} from 'zod';
import zodSchema from '~/schema/zodSchema';
import {OneSpringBootOAuth2} from './OAuth2Client';
import type {Account} from '~/types/accounts';

class MarketplaceOAuth2 extends OneSpringBootOAuth2 {
	async createAccount(
		account: z.infer<typeof zodSchema.accountForm>
	): Promise<Account> {
		const formData = new FormData();

		if (account.accountImage) {
			const blob = new Blob([account.accountImage]);
			formData.append('file', blob, account.accountImage.name);
		}

		const data = {
			customFields: [
				{
					customValue: {
						data: account.emailAddress,
					},
					name: 'Contact Email',
				},
			],
			name: account.accountName,
			postalAddresses: [
				{
					addressCountry: account.billingAddress.country,
					addressLocality: account.billingAddress.city,
					addressRegion: account.billingAddress.regionISOCode ?? '',
					name: account.billingAddress.name,
					phoneNumber: account.billingAddress.phoneNumber,
					postalCode: account.billingAddress.zip,
					primary: true,
					streetAddressLine1: account.billingAddress.street1,
					streetAddressLine2: account.billingAddress.street2 ?? '',
				},
			],
			taxId: account.taxNumber,
			type: account.accountType,
		};

		formData.append('account', JSON.stringify(data));

		const newAccount = await this.post<Account>('/account', formData, {
			earlyReturn: true,
		});

		return newAccount;
	}
}

const marketplaceOAuth2 = new MarketplaceOAuth2('/marketplace');

export default marketplaceOAuth2;
