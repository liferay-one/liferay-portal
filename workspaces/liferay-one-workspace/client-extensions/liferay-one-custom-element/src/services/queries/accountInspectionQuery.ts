/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import SearchBuilder from '~/services/fetcher/SearchBuilder';
import fetchAllPages from '~/services/fetcher/fetchAllPages';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	AccountInspection,
	InspectedCollection,
	InspectedOrder,
	InspectedOrderItem,
	InspectedUser,
	RelatedCollectionKey,
} from '~/types/accountInspection';
import type {Account, AccountPostalAddresses} from '~/types/accounts';
import type {DataQuery} from '~/types/api';

const NESTED_PAGE_SIZE = 20;

const ORDER_PATH = '/o/headless-commerce-admin-order/v1.0/orders';

type RelatedCollectionSource = {
	filter: (account: Account) => string;
	path: string;
};

function accountEntryFilter(relationshipName: string) {
	return (account: Account) =>
		SearchBuilder.eq(
			`r_${relationshipName}_accountEntryId`,
			String(account.id)
		);
}

function accountExternalReferenceCodeFilter(account: Account) {
	return SearchBuilder.eq(
		'accountExternalReferenceCode',
		(account.externalReferenceCode ?? '').replaceAll("'", "''")
	);
}

const RELATED_COLLECTION_SOURCES: Record<
	RelatedCollectionKey,
	RelatedCollectionSource
> = {
	accountInvitations: {
		filter: accountExternalReferenceCodeFilter,
		path: '/o/c/accountinvitations',
	},
	accountNotes: {
		filter: accountEntryFilter('accountEntryToAccountNote'),
		path: '/o/c/accountnotes',
	},
	activationKeys: {
		filter: accountEntryFilter('accountEntryToActivationKey'),
		path: '/o/c/activationkeys',
	},
	contracts: {
		filter: accountEntryFilter('accountEntryToContract'),
		path: '/o/c/contracts',
	},
	entitlements: {
		filter: accountEntryFilter('accountEntryToEntitlement'),
		path: '/o/c/entitlements',
	},
	environments: {
		filter: accountEntryFilter('accountEntryToEnvironment'),
		path: '/o/c/environments',
	},
	licenseKeys: {
		filter: accountEntryFilter('accountEntryToLicenseKey'),
		path: '/o/c/licensekeys',
	},
	oauth2DxpAuthorizations: {
		filter: accountEntryFilter('accountEntryToOAuth2DxpAuthorization'),
		path: '/o/c/oauth2dxpauthorizations',
	},
	projectMemberships: {
		filter: accountEntryFilter('accountEntryToProjectMembership'),
		path: '/o/c/projectmemberships',
	},
	projects: {
		filter: accountEntryFilter('accountEntryToProject'),
		path: '/o/c/projects',
	},
	properties: {
		filter: accountEntryFilter('accountEntryToProperty'),
		path: '/o/c/properties',
	},
	publisherAssets: {
		filter: accountEntryFilter('accountEntryToPublisherAsset'),
		path: '/o/c/publisherassets',
	},
	publisherDetails: {
		filter: accountEntryFilter('accountEntryToPublisherDetails'),
		path: '/o/c/publisherdetails',
	},
	publisherSalesSummaries: {
		filter: accountEntryFilter('accountEntryToPublisherSalesSummary'),
		path: '/o/c/publishersalessummaries',
	},
	ticketAttachments: {
		filter: accountEntryFilter('accountEntryToTicketAttachment'),
		path: '/o/c/ticketattachments',
	},
	trialExtensionRequests: {
		filter: accountEntryFilter('accountEntryToTrialExtensionRequest'),
		path: '/o/c/trialextensionrequests',
	},
	usageReports: {
		filter: accountExternalReferenceCodeFilter,
		path: '/o/c/usagereports',
	},
};

export function toErrorMessage(error: unknown) {
	const fetcherError = error as FetcherError;

	const title = fetcherError.info?.title ?? fetcherError.message;

	return fetcherError.status ? `${fetcherError.status} ${title}` : title;
}

async function getCollection<Item>(
	path: string,
	parameters: Record<string, string> = {}
): Promise<InspectedCollection<Item>> {
	try {
		const {items, totalCount, truncated} = await fetchAllPages<Item>(
			path,
			parameters
		);

		return {items, totalCount, truncated};
	}
	catch (error) {
		return {error: toErrorMessage(error), items: [], totalCount: 0};
	}
}

async function toInspectedOrder(order: InspectedOrder) {
	if ((order.orderItems ?? []).length < NESTED_PAGE_SIZE) {
		return order;
	}

	const orderItems = await getCollection<InspectedOrderItem>(
		`${ORDER_PATH}/${order.id}/orderItems`
	);

	if (orderItems.error) {
		return {...order, incompleteOrderItems: true};
	}

	return {
		...order,
		incompleteOrderItems: orderItems.truncated,
		orderItems: orderItems.items,
	};
}

async function getOrders(
	account: Account
): Promise<InspectedCollection<InspectedOrder>> {
	const orders = await getCollection<InspectedOrder>(ORDER_PATH, {
		filter: SearchBuilder.unquote(
			SearchBuilder.lambda('accountId', account.id)
		),
		nestedFields: 'orderItems',
		sort: 'createDate:desc',
	});

	return {
		...orders,
		items: await Promise.all(orders.items.map(toInspectedOrder)),
	};
}

async function getRelatedCollections(account: Account) {
	const entries = await Promise.all(
		Object.entries(RELATED_COLLECTION_SOURCES).map(
			async ([key, {filter, path}]) =>
				[
					key,
					await getCollection(path, {filter: filter(account)}),
				] as const
		)
	);

	return Object.fromEntries(entries) as AccountInspection['related'];
}

async function getAccountInspection(
	accountId: number | string
): Promise<AccountInspection> {
	const account = await HeadlessAdminUser.getAccount(accountId);

	const [orders, postalAddresses, related, users] = await Promise.all([
		getOrders(account),
		getCollection<AccountPostalAddresses>(
			`/o/headless-admin-user/v1.0/accounts/${account.id}/postal-addresses`
		),
		getRelatedCollections(account),
		getCollection<InspectedUser>(
			`/o/headless-admin-user/v1.0/accounts/${account.id}/user-accounts`
		),
	]);

	return {
		account,
		loadedAt: Date.now(),
		orders,
		postalAddresses,
		related,
		users,
	};
}

function isAccountId(accountId?: number | string) {
	return /^\d+$/.test(String(accountId ?? ''));
}

export function accountInspectionQuery(
	accountId?: number | string
): DataQuery<AccountInspection> {
	return {
		fetcher: () => getAccountInspection(accountId!),
		key: isAccountId(accountId) ? `/account-inspection/${accountId}` : null,
	};
}
