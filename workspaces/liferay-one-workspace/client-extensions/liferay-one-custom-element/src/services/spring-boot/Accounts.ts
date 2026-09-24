/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import zodSchema, {z} from '~/schema/zodSchema';

import {OneSpringBootOAuth2} from './OAuth2Client';

import type {Account} from '~/types/accounts';

import type {AccountInvitation} from './types';

type InvitationBody = {
	emailAddress: string;
	familyName: string;
	givenName: string;
	projectExternalReferenceCode?: string;
	projectRoleExternalReferenceCode?: string;
	roleExternalReferenceCodes: string[];
};

class AccountsOAuth2 extends OneSpringBootOAuth2 {
	async deleteInvitations(
		accountExternalReferenceCode: string,
		accountInvitationId: number
	) {
		return this.delete(
			`/${accountExternalReferenceCode}/invitations/${accountInvitationId}`
		);
	}

	async deleteUserAccounts(
		accountExternalReferenceCode: string,
		userId: number | string
	) {
		return this.delete(
			`/${accountExternalReferenceCode}/user-accounts/${userId}`
		);
	}

	async getInvitations(accountExternalReferenceCode: string) {
		return this.get<AccountInvitation[]>(
			`/${accountExternalReferenceCode}/invitations`
		);
	}

	async postAccounts(
		account: z.infer<typeof zodSchema.accountForm>
	): Promise<Account> {
		const formData = new FormData();

		formData.append(
			'account',
			JSON.stringify({
				customFields: [
					{
						customValue: {data: account.emailAddress},
						name: 'Contact Email',
					},
				],
				name: account.accountName,
				postalAddresses: [
					{
						addressCountry: account.billingAddress.country,
						addressLocality: account.billingAddress.city,
						addressRegion:
							account.billingAddress.regionISOCode ?? '',
						name: account.billingAddress.name,
						phoneNumber: account.billingAddress.phoneNumber,
						postalCode: account.billingAddress.zip,
						primary: true,
						streetAddressLine1: account.billingAddress.street1,
						streetAddressLine2:
							account.billingAddress.street2 ?? '',
					},
				],
				taxId: account.taxNumber,
				type: account.accountType,
			})
		);

		if (account.accountImage) {
			formData.append(
				'file',
				new Blob([account.accountImage]),
				account.accountImage.name
			);
		}

		return this.post<Account>('', formData);
	}

	async postInvitations(
		accountExternalReferenceCode: string,
		body: InvitationBody
	) {
		return this.post(`/${accountExternalReferenceCode}/invitations`, body);
	}

	async postInvitationsResend(
		accountExternalReferenceCode: string,
		accountInvitationId: number
	) {
		return this.post(
			`/${accountExternalReferenceCode}/invitations/${accountInvitationId}` +
				'/resend'
		);
	}

	async postSyncToJSM(accountExternalReferenceCode: string) {
		return this.post(`/${accountExternalReferenceCode}/sync-to-jsm`);
	}

	async putUserAccountsAccountRoles(
		accountExternalReferenceCode: string,
		userId: number | string,
		accountRoleIds: number[]
	) {
		return this.put(
			`/${accountExternalReferenceCode}/user-accounts/${userId}` +
				'/account-roles',
			{accountRoleIds}
		);
	}
}

const Accounts = new AccountsOAuth2('/accounts');

export default Accounts;
