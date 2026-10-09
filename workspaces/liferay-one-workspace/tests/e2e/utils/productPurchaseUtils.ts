/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import HeadlessAPI, {HeadlessPage} from './HeadlessAPI';

const ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/accounts';

const ADMIN_CHANNELS_PATH = '/o/headless-commerce-admin-channel/v1.0/channels';

const ADMIN_ORDERS_PATH = '/o/headless-commerce-admin-order/v1.0/orders';

const ACCOUNT_OBJECT_ENTRY_PATHS = [
	[
		'/o/c/oauth2dxpauthorizations',
		'r_accountEntryToOAuth2DxpAuthorization_accountEntryId',
	],
	['/o/c/projects', 'r_accountEntryToProject_accountEntryId'],
];

const CHANNEL_ERC = 'LIFERAY_ONE_CHANNEL';

const USER_ACCOUNTS_PATH = '/o/headless-admin-user/v1.0/user-accounts';

/**
 * The user groups a seeded customer belongs to. Customers grants the Customer
 * regular role and Everyone the permissions every signed in user carries;
 * without them the buyer cannot write the order custom fields checkout sets.
 */

const CUSTOMER_USER_GROUP_ERCS = ['C_CUSTOMERS', 'C_EVERYONE'];

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

/**
 * A buyer the test owns outright: a new customer user who belongs to a new
 * business account, as its Account Administrator unless `accountRole` names
 * another account role (or `null` for none). A purchase writes carts, orders, postal addresses, and the
 * account's default billing address and tax ID, so running it against a
 * shared seed account would leave other specs (and parallel workers) reading
 * state this spec changed. `deleteTemporaryBuyer` removes everything again.
 */

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

/**
 * Deletes every order placed on the temporary account, then the account and
 * the user. An order is deleted first because the account cannot be removed
 * while orders reference it. The account and the user are each deleted even
 * when an earlier step fails, so a failed cleanup leaves as little behind as
 * the portal allows.
 */

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

/**
 * Deletes the entitlements generated for an account's order items. Deleting an
 * order leaves its entitlements behind, and the account relationship prevents
 * the account from being deleted while any remain.
 */

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

/**
 * Deletes the custom object entries a journey creates on an account (projects,
 * DXP connections, and free activation key requests), so the account itself
 * can be deleted.
 */

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

/**
 * Deletes the orders and open carts on an account.
 */

export async function deleteAccountOrders(
	adminAPI: HeadlessAPI,
	accountId: number
): Promise<void> {
	for (const {id} of await getAccountOrders(adminAPI, accountId)) {
		await adminAPI.deleteIfExists(`${ADMIN_ORDERS_PATH}/${id}`);
	}
}

/**
 * Returns every order on an account, placed or still an open cart, as the
 * admin order API describes it. The admin order API refuses a filter on the
 * account, so the order IDs come from the account scoped delivery endpoints,
 * page by page, and each order is then read by its ID.
 */

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

	// The account role association endpoints answer 404 when the account is
	// addressed by numeric ID, so every call here addresses it by external
	// reference code

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
