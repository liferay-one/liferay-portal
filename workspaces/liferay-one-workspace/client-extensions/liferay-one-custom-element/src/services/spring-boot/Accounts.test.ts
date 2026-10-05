/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import Accounts from './Accounts';

const {oAuth2Fetch} = vi.hoisted(() => ({oAuth2Fetch: vi.fn()}));

vi.mock('@liferay/oauth2-provider-web/client', () => ({
	FromUserAgentApplication: () => Promise.resolve({fetch: oAuth2Fetch}),
	getUserAgentApplication: vi.fn(),
}));

type AccountForm = Parameters<typeof Accounts.postAccounts>[0];

function accountForm(overrides: Partial<AccountForm> = {}): AccountForm {
	return {
		accountImage: undefined,
		accountName: 'Acme',
		accountType: 'business',
		billingAddress: {
			city: 'Diamond Bar',
			country: 'US',
			name: 'Headquarters',
			phoneNumber: '555-0100',
			street1: '1400 Montefino Ave',
			zip: '91765',
		},
		emailAddress: 'contact@acme.com',
		taxNumber: 'TAX-1',
		...overrides,
	} as AccountForm;
}

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {status: 200});
}

describe('[CLIENT-SPRING-BOOT-ACCOUNTS] Accounts', () => {
	afterEach(() => {
		oAuth2Fetch.mockReset();
	});

	it('appends the image file only when the account image is present', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({id: 2}));

		const accountImage = new File(['png'], 'logo.png');

		await Accounts.postAccounts(accountForm({accountImage}));

		const [, options] = oAuth2Fetch.mock.calls[0];
		const file = options.body.get('file') as File;

		expect(file).toBeInstanceOf(Blob);
		expect(file.name).toBe('logo.png');
	});

	it('posts multipart form data with the account JSON and no file when the image is absent', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({id: 1}));

		await expect(Accounts.postAccounts(accountForm())).resolves.toEqual({
			id: 1,
		});

		const [resource, options] = oAuth2Fetch.mock.calls[0];

		expect(resource).toBe('/accounts');
		expect(options.method).toBe('POST');
		expect(options.body).toBeInstanceOf(FormData);
		expect(options.body.has('file')).toBe(false);
		expect(JSON.parse(options.body.get('account'))).toEqual({
			customFields: [
				{
					customValue: {data: 'contact@acme.com'},
					name: 'Contact Email',
				},
			],
			name: 'Acme',
			postalAddresses: [
				{
					addressCountry: 'US',
					addressLocality: 'Diamond Bar',
					addressRegion: '',
					name: 'Headquarters',
					phoneNumber: '555-0100',
					postalCode: '91765',
					primary: true,
					streetAddressLine1: '1400 Montefino Ave',
					streetAddressLine2: '',
				},
			],
			taxId: 'TAX-1',
			type: 'business',
		});
	});

	it('sends the region and the second street line when they are given', async () => {
		oAuth2Fetch.mockResolvedValue(jsonResponse({id: 3}));

		await Accounts.postAccounts(
			accountForm({
				billingAddress: {
					city: 'Diamond Bar',
					country: 'US',
					name: 'Headquarters',
					phoneNumber: '555-0100',
					regionISOCode: 'CA',
					street1: '1400 Montefino Ave',
					street2: 'Suite 200',
					zip: '91765',
				},
			} as Partial<AccountForm>)
		);

		const [, options] = oAuth2Fetch.mock.calls[0];
		const [postalAddress] = JSON.parse(
			options.body.get('account')
		).postalAddresses;

		expect(postalAddress.addressRegion).toBe('CA');
		expect(postalAddress.streetAddressLine2).toBe('Suite 200');
	});

	it('uses fixed paths for invitations, user accounts, roles, and the JSM sync', async () => {
		oAuth2Fetch.mockImplementation(() => Promise.resolve(jsonResponse([])));

		await Accounts.deleteInvitations('ACCNT-1', 5);
		await Accounts.deleteUserAccounts('ACCNT-1', 6);
		await Accounts.getInvitations('ACCNT-1');
		await Accounts.postInvitations('ACCNT-1', {
			emailAddress: 'user@acme.com',
			familyName: 'User',
			givenName: 'Test',
			roleExternalReferenceCodes: ['ROLE-1'],
		});
		await Accounts.postInvitationsResend('ACCNT-1', 7);
		await Accounts.postSyncToJSM('ACCNT-1');
		await Accounts.putUserAccountsAccountRoles('ACCNT-1', 8, [9, 10]);

		expect(oAuth2Fetch.mock.calls).toEqual([
			['/accounts/ACCNT-1/invitations/5', {method: 'DELETE'}],
			['/accounts/ACCNT-1/user-accounts/6', {method: 'DELETE'}],
			['/accounts/ACCNT-1/invitations', undefined],
			[
				'/accounts/ACCNT-1/invitations',
				{
					body: JSON.stringify({
						emailAddress: 'user@acme.com',
						familyName: 'User',
						givenName: 'Test',
						roleExternalReferenceCodes: ['ROLE-1'],
					}),
					method: 'POST',
				},
			],
			[
				'/accounts/ACCNT-1/invitations/7/resend',
				{body: undefined, method: 'POST'},
			],
			[
				'/accounts/ACCNT-1/sync-to-jsm',
				{body: undefined, method: 'POST'},
			],
			[
				'/accounts/ACCNT-1/user-accounts/8/account-roles',
				{body: '{"accountRoleIds":[9,10]}', method: 'PUT'},
			],
		]);
	});
});
