/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect} from '@playwright/test';

import HeadlessAPI, {HeadlessPage} from './HeadlessAPI';
import {PORTAL_TIMEOUT} from './timeoutConstants';

const ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/accounts';

const ADMIN_CHANNELS_PATH = '/o/headless-commerce-admin-channel/v1.0/channels';

const ADMIN_ORDERS_PATH = '/o/headless-commerce-admin-order/v1.0/orders';

const ACCOUNT_OBJECT_ENTRY_PATHS = [
	['/o/c/licensekeys', 'r_accountEntryToLicenseKey_accountEntryId'],
	['/o/c/activationkeys', 'r_accountEntryToActivationKey_accountEntryId'],
	[
		'/o/c/oauth2dxpauthorizations',
		'r_accountEntryToOAuth2DxpAuthorization_accountEntryId',
	],
	['/o/c/projects', 'r_accountEntryToProject_accountEntryId'],
];

const CHANNEL_ERC = 'LIFERAY_ONE_CHANNEL';

const ORDER_STATUS_COMPLETED = 0;

const USER_ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/user-accounts';

const CUSTOMER_USER_GROUP_ERCS = ['C_SUPPORT_CUSTOMERS', 'C_EVERYONE'];

export type TemporaryAccount = {
	externalReferenceCode: string;
	id: number;
	name: string;
};

export type TemporaryBuyer = {
	account: TemporaryAccount;
	email: string;
	password: string;
	userId: number;
};

export async function createTemporaryBuyer(
	adminAPI: HeadlessAPI,
	{
		accountRole = 'Account Administrator',
		billingAddress = false,
		label,
		projectName,
	}: {
		accountRole?: null | string;
		billingAddress?: boolean;
		label: string;
		projectName?: string;
	}
): Promise<TemporaryBuyer> {
	const suffix = `${Date.now().toString(36)}${Math.random()
		.toString(36)
		.slice(2, 6)}`;

	const email = `e2e-${suffix}@example.com`;
	const password = 'test';

	const user = await adminAPI.post<{id: number}>(USER_ACCOUNTS_PATH, {
		alternateName: `e2e${suffix}`,
		emailAddress: email,
		familyName: 'Buyer',
		givenName: 'E2E',
		password,
	});

	let account: TemporaryAccount | undefined;

	try {
		for (const userGroupERC of CUSTOMER_USER_GROUP_ERCS) {
			await adminAPI.post(
				`/o/headless-admin-user/v1.0/user-groups/by-external-reference-code/${userGroupERC}/user-group-users`,
				[user.id]
			);
		}

		account = await adminAPI.post<TemporaryAccount>(ACCOUNTS_PATH, {
			externalReferenceCode: `E2E-${suffix.toUpperCase()}`,
			name: `${label} E2E ${suffix}`,
			type: 'business',
		});

		await _addAccountMember(adminAPI, account, email, accountRole);

		if (billingAddress) {
			await _addDefaultBillingAddress(adminAPI, account.id);
		}

		if (projectName) {
			await adminAPI.post('/o/c/projects', {
				externalReferenceCode: `${account.externalReferenceCode}-PROJECT`,
				name: projectName,
				r_accountEntryToProject_accountEntryId: account.id,
			});
		}

		return {account, email, password, userId: user.id};
	}
	catch (error) {
		if (account) {
			await adminAPI.deleteIfExists(`${ACCOUNTS_PATH}/${account.id}`);
		}

		await adminAPI.deleteIfExists(`${USER_ACCOUNTS_PATH}/${user.id}`);

		throw error;
	}
}

export async function deleteTemporaryBuyer(
	adminAPI: HeadlessAPI,
	buyer: TemporaryBuyer | undefined
): Promise<void> {
	if (!buyer) {
		return;
	}

	try {
		try {
			await deleteAccountOrders(adminAPI, buyer.account.id);
			await deleteAccountEntitlements(adminAPI, buyer.account.id);
			await deleteAccountObjectEntries(adminAPI, buyer.account.id);
		}
		finally {
			await adminAPI.deleteIfExists(
				`${ACCOUNTS_PATH}/${buyer.account.id}`
			);
		}
	}
	finally {
		await adminAPI.deleteIfExists(`${USER_ACCOUNTS_PATH}/${buyer.userId}`);
	}
}

export async function deleteAccountEntitlements(
	adminAPI: HeadlessAPI,
	accountId: number
): Promise<void> {
	const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
		`/o/c/entitlements?filter=${encodeURIComponent(
			`r_accountEntryToEntitlement_accountEntryId eq '${accountId}'`
		)}&pageSize=100`
	);

	for (const {id} of items) {
		await adminAPI.deleteIfExists(`/o/c/entitlements/${id}`);
	}
}

export async function deleteAccountObjectEntries(
	adminAPI: HeadlessAPI,
	accountId: number
): Promise<void> {
	for (const [path, relationshipField] of ACCOUNT_OBJECT_ENTRY_PATHS) {
		const {items} = await adminAPI.get<HeadlessPage<{id: number}>>(
			`${path}?filter=${encodeURIComponent(
				`${relationshipField} eq '${accountId}'`
			)}&pageSize=100`
		);

		for (const {id} of items) {
			await adminAPI.deleteIfExists(`${path}/${id}`);
		}
	}
}

export async function deleteAccountOrders(
	adminAPI: HeadlessAPI,
	accountId: number
): Promise<void> {
	for (const {id} of await getAccountOrders(adminAPI, accountId)) {
		await adminAPI.deleteIfExists(`${ADMIN_ORDERS_PATH}/${id}`);
	}
}

export async function expectAccountOrdersCompleted(
	adminAPI: HeadlessAPI,
	accountId: number,
	orderTypeExternalReferenceCode: string,
	count = 1
): Promise<void> {
	await expect
		.poll(
			async () =>
				(
					await getAccountOrders<{
						accountId: number;
						id: number;
						orderStatus: number;
						orderTypeExternalReferenceCode: string;
					}>(adminAPI, accountId)
				)
					.filter(
						(order) =>
							order.orderTypeExternalReferenceCode ===
							orderTypeExternalReferenceCode
					)
					.map(({orderStatus}) => orderStatus),
			{
				message: `expected ${count} completed ${orderTypeExternalReferenceCode} orders`,
				timeout: PORTAL_TIMEOUT,
			}
		)
		.toEqual(Array(count).fill(ORDER_STATUS_COMPLETED));
}

export async function getAccountOrders<
	T extends {accountId: number; id: number} = {
		accountId: number;
		id: number;
		orderStatus: number;
		paymentStatus?: number;
	},
>(adminAPI: HeadlessAPI, accountId: number): Promise<T[]> {
	const {id: channelId} = await adminAPI.get<{id: number}>(
		`${ADMIN_CHANNELS_PATH}/by-externalReferenceCode/${CHANNEL_ERC}`
	);

	const orderIds = new Set<number>();

	for (const path of [
		`/o/headless-commerce-delivery-order/v1.0/channels/${channelId}/accounts/${accountId}/placed-orders`,
		`/o/headless-commerce-delivery-cart/v1.0/channels/${channelId}/account/${accountId}/carts`,
	]) {
		for (let page = 1; ; page++) {
			const {items, lastPage} = await adminAPI.get<
				HeadlessPage<{id: number}>
			>(`${path}?page=${page}&pageSize=100`);

			for (const {id} of items) {
				orderIds.add(id);
			}

			if (!lastPage || page >= lastPage) {
				break;
			}
		}
	}

	const orders: T[] = [];

	for (const orderId of orderIds) {
		orders.push(await adminAPI.get<T>(`${ADMIN_ORDERS_PATH}/${orderId}`));
	}

	return orders;
}

async function _addAccountMember(
	adminAPI: HeadlessAPI,
	account: TemporaryAccount,
	email: string,
	accountRoleName: null | string
): Promise<void> {
	const accountPath = `${ACCOUNTS_PATH}/by-external-reference-code/${account.externalReferenceCode}`;

	await adminAPI.post(
		`${accountPath}/user-accounts/by-email-address/${email}`,
		{}
	);

	if (!accountRoleName) {
		return;
	}

	const {items: accountRoles} = await adminAPI.get<
		HeadlessPage<{id: number; name: string}>
	>(`${accountPath}/account-roles?pageSize=200`);

	const accountRole = accountRoles.find(({name}) => name === accountRoleName);

	if (!accountRole) {
		throw new Error(
			`Unable to find the ${accountRoleName} role on account ${account.id}`
		);
	}

	await adminAPI.post(
		`${accountPath}/account-roles/${accountRole.id}/user-accounts/by-email-address/${email}`,
		{}
	);
}

async function _addDefaultBillingAddress(
	adminAPI: HeadlessAPI,
	accountId: number
): Promise<void> {
	const postalAddress = await adminAPI.post<{id: number}>(
		`${ACCOUNTS_PATH}/${accountId}/postal-addresses`,
		{
			addressCountry: 'United States',
			addressLocality: 'Diamond Bar',
			addressRegion: 'California',
			addressType: 'billing-and-shipping',
			name: 'E2E Billing',
			postalCode: '91765',
			primary: true,
			streetAddressLine1: '1400 Montefino Avenue',
		}
	);

	await adminAPI.patch(`${ACCOUNTS_PATH}/${accountId}`, {
		defaultBillingAddressId: postalAddress.id,
	});
}
